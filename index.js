/**
 * dsh-todo-panel host half.
 *
 * Owns the user's private, human-only todo list:
 * - JSON persistence under `$DSH_HOME/todo-panel/todos.json` (atomic tmp+rename),
 * - the `/api/todo` HTTP + SSE surface consumed by the sidebar panel.
 *
 * Deliberately agent-invisible: this plugin registers no tools and adds no
 * system-prompt section, so the model neither sees nor maintains the list.
 *
 * The client half (`./client.js`) renders the sidebar entry and the page; this
 * module only depends on Node built-ins and the `webServer` service.
 * @module dsh-todo-panel
 */
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Stable cordis plugin name; equals the `cordis.patch.yml` insert id. */
export const name = 'todo-panel'

/** Hard dependency: the panel is served over the browser HTTP carrier. */
export const inject = ['webServer']

/** Browser-facing route prefix. */
const API = '/api/todo'

/** Persisted file format version. */
const FILE_VERSION = 1

/** Priorities in ascending weight. */
const PRIORITIES = ['low', 'normal', 'high']

/** Fields the client may patch directly. */
const PATCHABLE = new Set(['title', 'notes', 'priority', 'due', 'images'])

/** One explanation image may be at most 10 MiB. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** Explanation images per todo. */
const MAX_IMAGES_PER_TODO = 12

/** Accepted image MIME types mapped to their stored extension. */
const IMAGE_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/bmp', 'bmp'],
])

/** Reverse lookup from a stored file extension to its MIME type. */
const IMAGE_TYPE_BY_EXT = new Map([...IMAGE_TYPES].map(([type, ext]) => [ext, type]))


/* ------------------------------------------------------------------ */
/* Data directory                                                      */
/* ------------------------------------------------------------------ */

/** DSH data root: `$DSH_HOME` when set, else `~/.dsh`. */
function dshHome() {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

/** This plugin's data directory. */
function dataDir() {
  return join(dshHome(), 'todo-panel')
}

/** This plugin's data file. */
function dataFile() {
  return join(dataDir(), 'todos.json')
}

/** Directory holding per-todo explanation images. */
function imagesDir() {
  return join(dataDir(), 'images')
}

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

function pad2(value) {
  return String(value).padStart(2, '0')
}

/** Local-time `YYYY-MM-DD` stamp. */
function localDateStamp(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Whether a string is a real calendar date in `YYYY-MM-DD` form. */
function isDateStamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  return !Number.isNaN(parsed.getTime()) && localDateStamp(parsed) === value
}

/** Trim + collapse whitespace, cap length. */
function cleanTitle(raw) {
  if (typeof raw !== 'string') throw new Error('标题必须是字符串')
  const title = raw.replace(/\s+/g, ' ').trim()
  if (title === '') throw new Error('标题不能为空')
  return title.slice(0, 300)
}

/** Trim outer whitespace and cap length, preserving newlines. */
function cleanNotes(raw) {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') throw new Error('备注必须是字符串')
  return raw.replace(/\r\n/g, '\n').trim().slice(0, 4000)
}

/** Accept only the three known priorities. */
function cleanPriority(raw) {
  if (raw === undefined || raw === null || raw === '') return 'normal'
  if (!PRIORITIES.includes(raw)) throw new Error('优先级只能是 low / normal / high')
  return raw
}

/** `null` for empty, otherwise a validated `YYYY-MM-DD`. */
function cleanDue(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  if (!isDateStamp(raw)) throw new Error('截止日期必须是 YYYY-MM-DD')
  return raw
}

/** Fresh id: sortable prefix + random suffix. */
function newId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Fresh image id, safe as a filename without an extension. */
function newImageId() {
  return `img${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Strip control characters from a display filename and cap its length. */
function cleanImageName(raw) {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200)
}

/**
 * Check the bytes against the declared image type instead of trusting the
 * content-type header alone.
 * @param type - declared image MIME type.
 * @param buffer - uploaded bytes.
 * @returns whether the file signature matches.
 */
function imageSignatureMatches(type, buffer) {
  switch (type) {
    case 'image/png':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      )
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case 'image/gif': {
      const signature = buffer.subarray(0, 6).toString('ascii')
      return signature === 'GIF87a' || signature === 'GIF89a'
    }
    case 'image/webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      )
    case 'image/bmp':
      return buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d
    default:
      return false
  }
}

/**
 * Lenient image reader for values already on disk.
 * @param raw - unknown stored array.
 * @returns a clean `{ id, name }[]`, dropping unusable entries.
 */
function readStoredImages(raw) {
  if (!Array.isArray(raw)) return []
  const images = []
  const seen = new Set()
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!/^img[a-z0-9]+$/.test(id) || seen.has(id)) continue
    seen.add(id)
    images.push({ id, name: cleanImageName(item.name) })
    if (images.length >= MAX_IMAGES_PER_TODO) break
  }
  return images
}

/**
 * Strict image validator for a client patch.
 * @param raw - the `images` field from the request.
 * @returns the normalized list, or undefined when the field is absent.
 */
function cleanImages(raw) {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw)) throw new Error('说明图片必须是数组')
  if (raw.length > MAX_IMAGES_PER_TODO) throw new Error(`一张待办最多 ${MAX_IMAGES_PER_TODO} 张说明图片`)
  const images = []
  const seen = new Set()
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) throw new Error('说明图片数据无效')
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!/^img[a-z0-9]+$/.test(id)) throw new Error('说明图片 id 无效')
    if (seen.has(id)) continue
    seen.add(id)
    images.push({ id, name: cleanImageName(item.name) })
  }
  return images
}

/** Copy of a stored todo with the public shape. */
function publicTodo(todo) {
  return {
    id: todo.id,
    title: todo.title,
    notes: todo.notes,
    priority: todo.priority,
    due: todo.due,
    done: todo.done,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
    completedAt: todo.completedAt,
    images: todo.images.map((image) => ({
      id: image.id,
      name: image.name,
      url: `${API}/images/${image.id}`,
    })),
  }
}

/**
 * Validate one stored record.
 * @param raw - unknown value read from disk.
 * @returns a normalized todo, or `null` when the record is unusable.
 */
function normalizeStoredTodo(raw) {
  if (typeof raw !== 'object' || raw === null) return null
  try {
    const title = cleanTitle(raw.title)
    const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now()
    const done = raw.done === true
    return {
      id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : newId(),
      title,
      notes: cleanNotes(raw.notes),
      priority: cleanPriority(raw.priority),
      due: cleanDue(raw.due),
      done,
      createdAt,
      updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt,
      completedAt: done && Number.isFinite(raw.completedAt) ? raw.completedAt : done ? createdAt : null,
      images: readStoredImages(raw.images),
    }
  } catch {
    return null
  }
}

/**
 * Validate a patch payload. Only present keys are considered, so a client can
 * send just the fields it changed.
 * @param patch - client-provided partial todo.
 * @returns normalized fields, always a subset of `title|notes|priority|due|images`.
 */
function cleanPatch(patch) {
  if (typeof patch !== 'object' || patch === null) throw new Error('缺少要修改的字段')
  const clean = {}
  for (const key of Object.keys(patch)) {
    if (!PATCHABLE.has(key)) continue
    if (key === 'title') clean.title = cleanTitle(patch.title)
    else if (key === 'notes') clean.notes = cleanNotes(patch.notes)
    else if (key === 'priority') clean.priority = cleanPriority(patch.priority)
    else if (key === 'due') clean.due = cleanDue(patch.due)
    else if (key === 'images') clean.images = cleanImages(patch.images)
  }
  if (Object.keys(clean).length === 0) throw new Error('没有可修改的字段')
  return clean
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

/** In-memory todo list with atomic JSON persistence and change fan-out. */
class TodoStore {
  constructor() {
    this.todos = []
    this.updatedAt = 0
    this.listeners = new Set()
    this.streams = new Set()
    /** Stored explanation images: id -> { file, type }. */
    this.imageFiles = new Map()
    this.refreshImageIndex()
    this.load()
  }

  /** Move an unreadable data file aside so nothing is silently overwritten. */
  quarantine() {
    try {
      renameSync(dataFile(), `${dataFile()}.corrupt-${Date.now()}`)
    } catch {
      // ignore: reporting the reset below is enough
    }
    this.todos = []
    this.updatedAt = 0
    console.warn('[dsh-todo-panel] todos.json 无法解析，已另存为 .corrupt-* 并重新开始')
  }

  /** Read the data file; a corrupt or unexpected shape is quarantined, not lost. */
  load() {
    let text
    try {
      text = readFileSync(dataFile(), 'utf8')
    } catch {
      return
    }
    try {
      const parsed = JSON.parse(text)
      if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.todos)) {
        throw new Error('unexpected todos.json shape')
      }
      this.todos = parsed.todos.map(normalizeStoredTodo).filter((todo) => todo !== null)
      this.updatedAt = Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : Date.now()
      this.reconcileStoredImages()
    } catch {
      this.quarantine()
    }
  }

  /** Index the image directory: `img<id>.<ext>` -> { file, type }. */
  refreshImageIndex() {
    this.imageFiles = new Map()
    let names
    try {
      names = readdirSync(imagesDir())
    } catch {
      return
    }
    for (const name of names) {
      const match = /^(img[a-z0-9]+)\.([a-z0-9]+)$/.exec(name)
      if (match === null) continue
      const type = IMAGE_TYPE_BY_EXT.get(match[2])
      if (type === undefined) continue
      this.imageFiles.set(match[1], { file: join(imagesDir(), name), type })
    }
  }

  /**
   * Drop todo image references whose files are gone, then delete image files
   * no todo references (unsaved uploads do not survive a host restart).
   */
  reconcileStoredImages() {
    for (const todo of this.todos) {
      todo.images = todo.images.filter((image) => this.imageFiles.has(image.id))
    }
    const referenced = new Set(this.todos.flatMap((todo) => todo.images.map((image) => image.id)))
    for (const [id, info] of [...this.imageFiles]) {
      if (referenced.has(id)) continue
      try {
        rmSync(info.file)
      } catch {
        // ignore: leave the index entry out and move on
      }
      this.imageFiles.delete(id)
    }
  }

  /** Stored metadata for one image id, or undefined. */
  imageInfo(id) {
    return this.imageFiles.get(id)
  }

  /** Persist one uploaded image and index it. */
  saveImage(id, type, bytes) {
    const ext = IMAGE_TYPES.get(type)
    if (ext === undefined) throw new Error('不支持的图片类型')
    mkdirSync(imagesDir(), { recursive: true })
    const file = join(imagesDir(), `${id}.${ext}`)
    writeFileSync(file, bytes)
    this.imageFiles.set(id, { file, type })
    return { id, type, url: `${API}/images/${id}` }
  }

  /** Public descriptor for one stored image, or undefined. */
  describeImage(id) {
    const info = this.imageFiles.get(id)
    if (info === undefined) return undefined
    return { id, type: info.type, url: `${API}/images/${id}` }
  }

  /** Whether any todo references this image (used before deleting a file). */
  isImageReferenced(id) {
    return this.todos.some((todo) => todo.images.some((image) => image.id === id))
  }

  /** Delete image files by id. */
  deleteImages(ids) {
    for (const id of ids) {
      const info = this.imageFiles.get(id)
      if (info === undefined) continue
      try {
        rmSync(info.file)
      } catch {
        // ignore: file already gone
      }
      this.imageFiles.delete(id)
    }
  }

  /** Delete only images no todo references; returns the removed ids. */
  discardImages(ids) {
    const removable = ids.filter((id) => typeof id === 'string' && !this.isImageReferenced(id))
    this.deleteImages(removable)
    return removable
  }

  /**
   * Write one complete list. Throws before touching memory, so a failed write
   * never leaves the in-memory list ahead of the disk.
   * @param todos - the complete next list.
   * @param updatedAt - timestamp to persist with it.
   */
  save(todos, updatedAt) {
    mkdirSync(dataDir(), { recursive: true })
    const payload = JSON.stringify({ version: FILE_VERSION, updatedAt, todos }, null, 2)
    const tmp = `${dataFile()}.tmp`
    writeFileSync(tmp, payload)
    renameSync(tmp, dataFile())
  }

  /** Publish one new snapshot to every SSE subscriber. */
  publish() {
    const state = this.snapshot()
    for (const listener of [...this.listeners]) {
      try {
        listener(state)
      } catch (error) {
        console.warn('[dsh-todo-panel] 快照推送失败:', error)
      }
    }
  }

  /** Subscribe to state snapshots; returns an idempotent unsubscribe. */
  subscribe(listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Track one live SSE connection so plugin unload can close it instead of
   * leaving the browser attached to a disposed store.
   * @param close - idempotent closer that ends the response and unsubscribes.
   * @returns idempotent unregister function for the normal disconnect path.
   */
  registerStream(close) {
    this.streams.add(close)
    return () => {
      this.streams.delete(close)
    }
  }

  /** Close every live SSE connection (plugin unload / reload). */
  closeStreams() {
    for (const close of [...this.streams]) {
      try {
        close()
      } catch {
        // ignore: a broken socket is already gone
      }
    }
    this.streams.clear()
  }

  /**
   * Drop image references that are missing on disk or already used by another
   * todo, so restoring a deleted todo can never resurrect a broken/shared image.
   * @param todo - restored todo to sanitize in place.
   * @param used - image ids already claimed; a batch passes one set through all items.
   * @returns the same `used` set, with the kept ids added.
   */
  sanitizeRestoredImages(todo, used = new Set(this.todos.flatMap((item) => item.images.map((image) => image.id)))) {
    todo.images = todo.images.filter((image) => this.imageFiles.has(image.id) && !used.has(image.id))
    for (const image of todo.images) used.add(image.id)
    return used
  }

  /** Find a todo by id or throw a user-readable error. */
  require(id) {
    if (typeof id !== 'string' || id === '') throw new Error('缺少待办 id')
    const todo = this.todos.find((item) => item.id === id)
    if (todo === undefined) throw new Error('找不到这条待办（可能已被删除）')
    return todo
  }

  /**
   * Persist the next list, then swap memory and publish. The write happens
   * first: a failure throws and leaves both memory and subscribers untouched.
   * @param nextTodos - complete list after the mutation.
   * @returns the published snapshot.
   */
  commit(nextTodos) {
    const updatedAt = Date.now()
    this.save(nextTodos, updatedAt)
    this.todos = nextTodos
    this.updatedAt = updatedAt
    this.publish()
    return this.snapshot()
  }

  /** Aggregated counts for the client header. */
  counts() {
    const today = localDateStamp()
    let open = 0
    let done = 0
    let overdue = 0
    for (const todo of this.todos) {
      if (todo.done) {
        done += 1
        continue
      }
      open += 1
      if (todo.due !== null && todo.due < today) overdue += 1
    }
    return { total: this.todos.length, open, done, overdue }
  }

  /** Immutable-ish snapshot sent to the browser. */
  snapshot() {
    return {
      todos: this.todos.map(publicTodo),
      counts: this.counts(),
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Apply one mutation.
   * @param request - `{ op, ...payload }` from the browser.
   * @returns `{ state, item?, removed?, ... }` for the HTTP response.
   */
  mutate(request) {
    if (typeof request !== 'object' || request === null) throw new Error('请求体必须是对象')
    const op = request.op
    switch (op) {
      case 'create': {
        const now = Date.now()
        const todo = {
          id: newId(),
          title: cleanTitle(request.title),
          notes: cleanNotes(request.notes),
          priority: cleanPriority(request.priority),
          due: cleanDue(request.due),
          done: false,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          images: [],
        }
        return { state: this.commit([todo, ...this.todos]), item: publicTodo(todo) }
      }
      case 'update': {
        const todo = this.require(request.id)
        const patch = cleanPatch(request.patch)
        if (patch.images !== undefined) {
          for (const image of patch.images) {
            if (!this.imageFiles.has(image.id)) throw new Error('说明图片不存在或已过期，请重新上传')
            const other = this.todos.find(
              (item) => item.id !== todo.id && item.images.some((kept) => kept.id === image.id),
            )
            if (other !== undefined) throw new Error('这张说明图片已被其它待办使用')
          }
        }
        const next = { ...todo, ...patch, updatedAt: Date.now() }
        const index = this.todos.indexOf(todo)
        const todos = this.todos.slice()
        todos[index] = next
        const dropped = todo.images
          .filter((image) => !next.images.some((kept) => kept.id === image.id))
          .map((image) => image.id)
        const state = this.commit(todos)
        const removable = dropped.filter((id) => !this.isImageReferenced(id))
        if (removable.length > 0) this.deleteImages(removable)
        return { state, item: publicTodo(next) }
      }
      case 'toggle': {
        const todo = this.require(request.id)
        const done = typeof request.done === 'boolean' ? request.done : !todo.done
        if (todo.done === done) return { state: this.snapshot(), item: publicTodo(todo) }
        const next = { ...todo, done, completedAt: done ? Date.now() : null, updatedAt: Date.now() }
        const todos = this.todos.map((item) => (item.id === todo.id ? next : item))
        return { state: this.commit(todos), item: publicTodo(next) }
      }
      case 'remove': {
        const todo = this.require(request.id)
        return { state: this.commit(this.todos.filter((item) => item.id !== todo.id)), removed: publicTodo(todo) }
      }
      case 'restore': {
        const todo = normalizeStoredTodo(request.todo)
        if (todo === null) throw new Error('待恢复的待办数据无效')
        if (this.todos.some((item) => item.id === todo.id)) throw new Error('这条待办已经存在')
        this.sanitizeRestoredImages(todo)
        return { state: this.commit([todo, ...this.todos]), item: publicTodo(todo) }
      }
      case 'restore-many': {
        if (!Array.isArray(request.todos)) throw new Error('todos 必须是数组')
        const known = new Set(this.todos.map((item) => item.id))
        const usedImages = new Set(this.todos.flatMap((item) => item.images.map((image) => image.id)))
        const restored = []
        for (const raw of request.todos) {
          const todo = normalizeStoredTodo(raw)
          if (todo === null || known.has(todo.id)) continue
          known.add(todo.id)
          this.sanitizeRestoredImages(todo, usedImages)
          restored.push(todo)
        }
        return { state: this.commit([...restored, ...this.todos]), items: restored.map(publicTodo) }
      }
      case 'clear-completed': {
        const removed = this.todos.filter((item) => item.done)
        if (removed.length === 0) return { state: this.snapshot(), removed: [], removedCount: 0 }
        return {
          state: this.commit(this.todos.filter((item) => !item.done)),
          removed: removed.map(publicTodo),
          removedCount: removed.length,
        }
      }
      default:
        throw new Error(`未知操作：${String(op)}`)
    }
  }
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** Read a bounded JSON body. */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 256 * 1024) {
        reject(new Error('body-too-large'))
        queueMicrotask(() => req.destroy())
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        resolve(typeof parsed === 'object' && parsed !== null ? parsed : {})
      } catch {
        reject(new Error('invalid-json'))
      }
    })
    req.on('error', reject)
  })
}

/** Read a bounded binary body (one uploaded image). */
function readBinaryBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('image-too-large'))
        queueMicrotask(() => req.destroy())
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

/** GET /api/todo/state */
function stateRoute(store) {
  return {
    kind: 'exact',
    path: `${API}/state`,
    handler: (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      try {
        json(res, 200, { ok: true, state: store.snapshot() })
      } catch (error) {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }
}

/** POST /api/todo/mutate */
function mutateRoute(store) {
  return {
    kind: 'exact',
    path: `${API}/mutate`,
    handler: (req, res) => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      return readJsonBody(req).then(
        (body) => {
          try {
            const result = store.mutate(body)
            json(res, 200, { ok: true, ...result })
          } catch (error) {
            json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
          }
        },
        (error) => {
          json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
        },
      )
    },
  }
}

/** GET /api/todo/events — SSE state stream. */
function eventsRoute(store) {
  return {
    kind: 'exact',
    path: `${API}/events`,
    handler: (req, res) => {
      if (req.method !== 'GET') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      })
      res.write(': connected\n\n')
      const send = (state) => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'state', state })}\n\n`)
        } catch {
          // Connection already gone.
        }
      }
      send(store.snapshot())
      const unsubscribe = store.subscribe(send)
      const heartbeat = setInterval(() => {
        try {
          res.write(': ping\n\n')
        } catch {
          // ignore
        }
      }, 25000)
      heartbeat.unref?.()
      let closed = false
      const closeStream = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        try {
          res.end()
        } catch {
          // ignore: socket already gone
        }
      }
      const unregister = store.registerStream(closeStream)
      const cleanup = () => {
        unregister()
        closeStream()
      }
      req.on('close', cleanup)
      res.on('close', cleanup)
      res.on('error', cleanup)
    },
  }
}

/** POST /api/todo/upload-image — raw image bytes, type in the content-type header. */
function uploadImageRoute(store) {
  return {
    kind: 'exact',
    path: `${API}/upload-image`,
    handler: (req, res) => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
      if (!IMAGE_TYPES.has(type)) {
        json(res, 400, { ok: false, error: '只支持 PNG / JPEG / GIF / WebP / BMP 图片' })
        return
      }
      let name = ''
      try {
        name = cleanImageName(decodeURIComponent(String(req.headers['x-image-name'] ?? '')))
      } catch {
        name = ''
      }
      return readBinaryBody(req, MAX_IMAGE_BYTES).then(
        (buffer) => {
          if (buffer.length === 0) {
            json(res, 400, { ok: false, error: '图片内容为空' })
            return
          }
          if (!imageSignatureMatches(type, buffer)) {
            json(res, 400, { ok: false, error: '图片内容与声明的格式不符' })
            return
          }
          try {
            const id = newImageId()
            const image = store.saveImage(id, type, buffer)
            json(res, 200, { ok: true, image: { ...image, name } })
          } catch {
            json(res, 500, { ok: false, error: '图片保存失败' })
          }
        },
        (error) => {
          const tooLarge = error instanceof Error && error.message === 'image-too-large'
          json(res, tooLarge ? 413 : 400, {
            ok: false,
            error: tooLarge ? `图片不能超过 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB` : '图片读取失败',
          })
        },
      )
    },
  }
}

/** GET /api/todo/images/<id> — serve one stored explanation image. */
function imageAssetRoute(store) {
  return {
    kind: 'prefix',
    path: `${API}/images`,
    handler: (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      let pathname = ''
      try {
        pathname = new URL(req.url ?? '', 'http://localhost').pathname
      } catch {
        pathname = ''
      }
      let id = ''
      try {
        id = decodeURIComponent(pathname.slice(`${API}/images/`.length).split('/')[0] ?? '')
      } catch {
        id = ''
      }
      const info = /^img[a-z0-9]+$/.test(id) ? store.imageInfo(id) : undefined
      let data
      if (info !== undefined) {
        try {
          data = readFileSync(info.file)
        } catch {
          data = undefined
        }
      }
      if (info === undefined || data === undefined) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not found')
        return
      }
      res.writeHead(200, {
        'content-type': info.type,
        'content-length': data.length,
        'cache-control': 'private, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      })
      res.end(req.method === 'HEAD' ? undefined : data)
    },
  }
}

/** POST /api/todo/discard-images — drop unsaved uploads that no todo references. */
function discardImagesRoute(store) {
  return {
    kind: 'exact',
    path: `${API}/discard-images`,
    handler: (req, res) => {
      if (req.method !== 'POST') {
        json(res, 405, { ok: false, error: 'method-not-allowed' })
        return
      }
      return readJsonBody(req).then(
        (body) => {
          const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string') : []
          json(res, 200, { ok: true, removed: store.discardImages(ids) })
        },
        () => {
          json(res, 400, { ok: false, error: 'invalid-json' })
        },
      )
    },
  }
}

/* ------------------------------------------------------------------ */
/* Plugin wiring                                                       */
/* ------------------------------------------------------------------ */

/**
 * Host activation: create the store and register the `/api/todo` routes.
 * No tools and no prompt section on purpose — the list stays human-only.
 * @param ctx - host context carrying `webServer`.
 */
export function apply(ctx) {
  const store = new TodoStore()

  ctx.effect(() => {
    const disposers = [
      stateRoute(store),
      mutateRoute(store),
      eventsRoute(store),
      uploadImageRoute(store),
      imageAssetRoute(store),
      discardImagesRoute(store),
    ].map((route) => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {
          // ignore double-dispose
        }
      }
      // Routes are gone; also hang up live SSE responses so the browser
      // reconnects to the next store instead of the disposed one.
      store.closeStreams()
    }
  }, 'todo-panel: routes')

  // Kept for diagnostics (`dsh` logs plugin lifecycle at debug level).
  console.info(`[dsh-todo-panel] 待办数据文件：${dataFile()}`)
}
