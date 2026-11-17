/**
 * dsh-todo-panel — Client half (Web GUI).
 *
 * Registers two seats:
 * - `sidebar.panellist` row with the checklist glyph (id `todo`, order 25, so it
 *   sits between 自动化任务 and 提醒), labelled 待办 / Todo.
 * - `main` keyed panel `todo` with the Todo page.
 *
 * The page talks to the host half over `/api/todo` (JSON + SSE). All styles use
 * the host theme tokens; no Harness Client package is imported.
 * @module dsh-todo-panel/client
 */
window.__ModuleLoader__.load({
  id: 'dsh-todo-panel',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Panel id shared by the sidebar row and the main-column key. */
    const PANEL_ID = 'todo'
    /** Sidebar row order: 插件 0, 自动化任务 10, 待办 25, 提醒 30. */
    const PANEL_ORDER = 25
    /** Client locale namespace. */
    const NS = 'todo-panel'
    /** Host API prefix. */
    const API = '/api/todo'
    /** One explanation image may be at most 10 MiB (matches the host). */
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024
    /** Explanation images per todo (matches the host). */
    const MAX_IMAGES = 12

    /* ------------------------------------------------------------------ */
    /* Locale                                                              */
    /* ------------------------------------------------------------------ */

    const UI = {
      zh: {
        panel: '待办',
        title: '待办',
        close: '关闭待办',
        'add.placeholder': '添加待办，回车保存',
        'add.label': '新待办标题',
        'add.button': '添加',
        'tab.open': '进行中',
        'tab.done': '已完成',
        'tab.all': '全部',
        'search.placeholder': '搜索待办',
        'search.label': '搜索待办',
        'summary.open': '{count} 项未完成',
        'summary.overdue': '{count} 项已逾期',
        'group.done': '已完成',
        'empty.none.title': '还没有待办',
        'empty.none.body': '把要做的事记在这里，想起来了再划掉。',
        'empty.none.action': '添加第一条',
        'empty.filtered': '没有符合当前筛选的待办',
        'empty.filtered.action': '清除筛选',
        'empty.open': '没有进行中的待办',
        'empty.done': '还没有完成的待办',
        loading: '正在加载待办…',
        'row.edit': '编辑',
        'row.delete': '删除',
        'row.done': '标记完成',
        'row.undone': '标记未完成',
        'row.done.named': '标记完成：{title}',
        'row.undone.named': '标记未完成：{title}',
        'row.edit.named': '编辑：{title}',
        'row.delete.named': '删除：{title}',
        'row.notes': '备注',
        overdue: '已逾期',
        'due.today': '今天',
        'due.tomorrow': '明天',
        'due.clear': '不限',
        'priority.low': '低',
        'priority.normal': '中',
        'priority.high': '高',
        'editor.title': '标题',
        'editor.title.required': '标题不能为空',
        'editor.notes': '备注',
        'editor.notes.placeholder': '补充说明（可选）',
        'editor.priority': '优先级',
        'editor.due': '截止日期',
        'editor.images': '说明图片',
        'editor.images.add': '添加图片',
        'editor.images.hint': '可直接 Ctrl/⌘+V 粘贴',
        'editor.images.uploading': '正在上传图片…',
        'editor.images.remove': '移除图片',
        'editor.images.failed': '图片上传失败',
        'editor.images.type': '只支持 PNG / JPEG / GIF / WebP / BMP 图片',
        'editor.images.tooLarge': '图片不能超过 10 MB',
        'editor.images.limit': '最多 12 张图片',
        'row.images.more': '还有 {count} 张',
        'image.open': '查看图片',
        'image.close': '关闭图片',
        'image.alt': '待办说明图片',
        'editor.save': '保存',
        'editor.cancel': '取消',
        'editor.delete': '删除',
        'editor.hint': '⌘/Ctrl + Enter 保存，Esc 取消',
        'footer.clear': '清除已完成',
        'footer.remaining': '{count} 项未完成',
        'undo.deleted': '已删除「{title}」',
        'undo.cleared': '已清除 {count} 条已完成',
        'undo.action': '撤销',
        'error.load': '无法加载待办，host 可能未运行。',
        'error.retry': '重试',
        'error.dismiss': '关闭提示',
      },
      en: {
        panel: 'Todos',
        title: 'Todos',
        close: 'Close todos',
        'add.placeholder': 'Add a todo and press Enter',
        'add.label': 'New todo title',
        'add.button': 'Add',
        'tab.open': 'Open',
        'tab.done': 'Done',
        'tab.all': 'All',
        'search.placeholder': 'Search todos',
        'search.label': 'Search todos',
        'summary.open': '{count} open',
        'summary.overdue': '{count} overdue',
        'group.done': 'Done',
        'empty.none.title': 'No todos yet',
        'empty.none.body': 'Capture what you need to do, then check it off.',
        'empty.none.action': 'Add the first one',
        'empty.filtered': 'Nothing matches this filter',
        'empty.filtered.action': 'Clear filters',
        'empty.open': 'Nothing open right now',
        'empty.done': 'Nothing completed yet',
        loading: 'Loading todos…',
        'row.edit': 'Edit',
        'row.delete': 'Delete',
        'row.done': 'Mark done',
        'row.undone': 'Mark not done',
        'row.done.named': 'Mark done: {title}',
        'row.undone.named': 'Mark not done: {title}',
        'row.edit.named': 'Edit: {title}',
        'row.delete.named': 'Delete: {title}',
        'row.notes': 'Notes',
        overdue: 'Overdue',
        'due.today': 'Today',
        'due.tomorrow': 'Tomorrow',
        'due.clear': 'None',
        'priority.low': 'Low',
        'priority.normal': 'Normal',
        'priority.high': 'High',
        'editor.title': 'Title',
        'editor.title.required': 'Title cannot be empty',
        'editor.notes': 'Notes',
        'editor.notes.placeholder': 'Add details (optional)',
        'editor.priority': 'Priority',
        'editor.due': 'Due date',
        'editor.images': 'Images',
        'editor.images.add': 'Add image',
        'editor.images.hint': 'Paste with Ctrl/Cmd+V',
        'editor.images.uploading': 'Uploading image…',
        'editor.images.remove': 'Remove image',
        'editor.images.failed': 'Image upload failed',
        'editor.images.type': 'Only PNG, JPEG, GIF, WebP or BMP images',
        'editor.images.tooLarge': 'Image must be under 10 MB',
        'editor.images.limit': 'Up to 12 images',
        'row.images.more': '{count} more',
        'image.open': 'View image',
        'image.close': 'Close image',
        'image.alt': 'Todo explanation image',
        'editor.save': 'Save',
        'editor.cancel': 'Cancel',
        'editor.delete': 'Delete',
        'editor.hint': 'Cmd/Ctrl + Enter saves, Esc cancels',
        'footer.clear': 'Clear completed',
        'footer.remaining': '{count} open',
        'undo.deleted': 'Deleted “{title}”',
        'undo.cleared': 'Cleared {count} completed',
        'undo.action': 'Undo',
        'error.load': 'Could not load todos. Is the host running?',
        'error.retry': 'Retry',
        'error.dismiss': 'Dismiss',
      },
    }

    /** Active translate function; null before the locale service is bound. */
    let translateFn = null

    /** Translate one UI key, falling back to the Chinese dictionary. */
    function t(key, params) {
      let value
      if (typeof translateFn === 'function') {
        try {
          value = translateFn(key, params)
        } catch {
          value = undefined
        }
      }
      if (typeof value !== 'string' || value === '' || value === key) value = UI.zh[key] ?? key
      if (params !== undefined && typeof params === 'object') {
        value = value.replace(/\{(\w+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name])))
      }
      return value
    }

    /* ------------------------------------------------------------------ */
    /* Store                                                               */
    /* ------------------------------------------------------------------ */

    /** @type {{ready: boolean, loading: boolean, error: string|null, todos: Array<object>, counts: {total:number, open:number, done:number, overdue:number}, updatedAt: number}} */
    let snapshot = {
      ready: false,
      loading: true,
      error: null,
      todos: [],
      counts: { total: 0, open: 0, done: 0, overdue: 0 },
      updatedAt: 0,
    }

    const subscribers = new Set()

    function getSnapshot() {
      return snapshot
    }

    function subscribe(listener) {
      subscribers.add(listener)
      return () => {
        subscribers.delete(listener)
      }
    }

    function publish(next) {
      snapshot = next
      for (const listener of [...subscribers]) {
        try {
          listener()
        } catch (error) {
          console.error('[dsh-todo-panel] store listener failed', error)
        }
      }
    }

    function normalizeCounts(raw) {
      const counts = raw !== null && typeof raw === 'object' ? raw : {}
      return {
        total: Number.isFinite(counts.total) ? counts.total : 0,
        open: Number.isFinite(counts.open) ? counts.open : 0,
        done: Number.isFinite(counts.done) ? counts.done : 0,
        overdue: Number.isFinite(counts.overdue) ? counts.overdue : 0,
      }
    }

    function applyServerState(state) {
      if (state === null || typeof state !== 'object' || !Array.isArray(state.todos)) return
      publish({
        ready: true,
        loading: false,
        error: null,
        todos: state.todos,
        counts: normalizeCounts(state.counts),
        updatedAt: Number.isFinite(state.updatedAt) ? state.updatedAt : 0,
      })
    }

    function messageOf(error) {
      if (error instanceof Error && error.message !== '') return error.message
      return typeof error === 'string' && error !== '' ? error : t('error.load')
    }

    async function requestJson(path, init) {
      let response
      try {
        response = await fetch(path, init)
      } catch {
        throw new Error(t('error.load'))
      }
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok || (body !== null && typeof body === 'object' && body.ok === false)) {
        const message = body !== null && typeof body === 'object' && typeof body.error === 'string' ? body.error : `HTTP ${response.status}`
        throw new Error(message)
      }
      return body
    }

    let inflightLoad = null

    function loadState() {
      if (inflightLoad !== null) return inflightLoad
      inflightLoad = requestJson(`${API}/state`, { method: 'GET', cache: 'no-store' })
        .then((body) => {
          if (body !== null && typeof body === 'object') applyServerState(body.state)
        })
        .catch((error) => {
          publish({ ...snapshot, loading: false, error: messageOf(error) })
        })
        .finally(() => {
          inflightLoad = null
        })
      return inflightLoad
    }

    async function runOperation(op, payload) {
      const body = await requestJson(`${API}/mutate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op, ...payload }),
      })
      if (body !== null && typeof body === 'object' && body.state !== undefined) applyServerState(body.state)
      return body
    }

    /**
     * Upload one clipboard/file image as raw bytes.
     * @param file - a browser File with an image MIME type.
     * @returns `{ id, type, url, name }` from the host.
     */
    async function uploadImageFile(file) {
      let response
      try {
        response = await fetch(`${API}/upload-image`, {
          method: 'POST',
          headers: {
            'content-type': file.type,
            'x-image-name': encodeURIComponent(file.name !== '' ? file.name : 'image'),
          },
          body: file,
        })
      } catch {
        throw new Error(t('editor.images.failed'))
      }
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok || body === null || body.ok !== true || typeof body.image !== 'object') {
        const message = body !== null && typeof body.error === 'string' ? body.error : t('editor.images.failed')
        throw new Error(message)
      }
      return body.image
    }

    /** Best-effort cleanup for uploads the user cancelled before saving. */
    async function discardUploaded(ids) {
      if (!Array.isArray(ids) || ids.length === 0) return
      try {
        await fetch(`${API}/discard-images`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
      } catch {
        // The host prunes unreferenced files on its next load.
      }
    }

    let eventSource = null

    function connectEvents() {
      if (typeof EventSource !== 'function') return null
      try {
        eventSource = new EventSource(`${API}/events`)
      } catch {
        eventSource = null
        return null
      }
      eventSource.onopen = () => {
        if (snapshot.error !== null) publish({ ...snapshot, error: null })
      }
      eventSource.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data)
          if (parsed !== null && typeof parsed === 'object' && parsed.type === 'state') applyServerState(parsed.state)
        } catch {
          // Ignore malformed frames; the next event or refresh recovers.
        }
      }
      return eventSource
    }

    /** Subscribe one component to the store. */
    function useTodoSnapshot() {
      const [current, setCurrent] = React.useState(getSnapshot)
      React.useEffect(() => {
        setCurrent(getSnapshot())
        return subscribe(() => setCurrent(getSnapshot()))
      }, [])
      return current
    }

    /* ------------------------------------------------------------------ */
    /* Date helpers                                                        */
    /* ------------------------------------------------------------------ */

    function pad2(value) {
      return String(value).padStart(2, '0')
    }

    function stampOf(date) {
      return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    }

    function todayStamp() {
      return stampOf(new Date())
    }

    function tomorrowStamp() {
      const date = new Date()
      date.setDate(date.getDate() + 1)
      return stampOf(date)
    }

    function isOverdue(todo) {
      return todo.done !== true && typeof todo.due === 'string' && todo.due !== '' && todo.due < todayStamp()
    }

    function shortDate(stamp) {
      try {
        return new Date(`${stamp}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      } catch {
        return stamp
      }
    }

    function dueText(todo) {
      if (typeof todo.due !== 'string' || todo.due === '') return ''
      if (todo.due === todayStamp()) return t('due.today')
      if (todo.due === tomorrowStamp()) return t('due.tomorrow')
      return shortDate(todo.due)
    }

    /* ------------------------------------------------------------------ */
    /* Icons                                                               */
    /* ------------------------------------------------------------------ */

    function glyph(paths, size) {
      return h(
        'svg',
        {
          width: size ?? 16,
          height: size ?? 16,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        paths.map((d, index) => h('path', { key: index, d })),
      )
    }

    const iconClose = () => glyph(['M4 4l8 8', 'M12 4l-8 8'])
    const iconPlus = () => glyph(['M8 3.2v9.6', 'M3.2 8h9.6'])
    const iconPencil = () => glyph(['M11.2 3.2l1.6 1.6-7 7H4.2v-1.7z', 'M9.7 4.7l1.6 1.6'])
    const iconTrash = () => glyph(['M3.6 5.2h8.8', 'M6.4 5.2V3.6h3.2v1.6', 'M5 5.2l.5 6.6h5l.5-6.6'])
    const iconSearch = () =>
      h(
        'svg',
        {
          width: 14,
          height: 14,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          'aria-hidden': 'true',
        },
        h('circle', { cx: 7.2, cy: 7.2, r: 4.2 }),
        h('path', { d: 'M10.4 10.4l3 3' }),
      )
    const iconAlert = () =>
      h(
        'svg',
        {
          width: 15,
          height: 15,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          'aria-hidden': 'true',
        },
        h('circle', { cx: 8, cy: 8, r: 5.6 }),
        h('path', { d: 'M8 5.2v3.6' }),
        h('path', { d: 'M8 10.9v.1' }),
      )

    /** Sidebar row glyph; a red dot appears while something is overdue. */
    function PanelIcon(props) {
      const size = props !== null && typeof props === 'object' && Number.isFinite(props.size) ? props.size : 16
      const current = useTodoSnapshot()
      const overdue = current.counts.overdue > 0
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          'data-dsh-panel-entry': PANEL_ID,
          'data-dsh-todo-panel-icon': '',
        },
        h('rect', { x: 2.4, y: 3.2, width: 10.2, height: 9.6, rx: 2.6 }),
        h('path', { d: 'M5.2 8.2l1.7 1.7 3.4-3.6' }),
        overdue
          ? h('circle', {
              cx: 13,
              cy: 2.9,
              r: 2.1,
              fill: 'var(--dsw-alias-state-error-primary)',
              stroke: 'none',
              'data-dsh-todo-overdue-dot': '',
            })
          : null,
      )
    }

    /** Original line-art for the empty state. */
    function EmptyArt() {
      return h(
        'svg',
        {
          className: 'dsh-todo-emptyart',
          width: 112,
          height: 84,
          viewBox: '0 0 112 84',
          fill: 'none',
          'aria-hidden': 'true',
        },
        h('rect', { x: 18, y: 10, width: 76, height: 60, rx: 14, stroke: 'currentColor', strokeWidth: 1.2, opacity: 0.45 }),
        h('path', { d: 'M34 30h40M34 44h30M34 58h22', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', opacity: 0.5 }),
        h('circle', { cx: 82, cy: 60, r: 13, fill: 'var(--dsw-alias-bg-base)', stroke: 'currentColor', strokeWidth: 1.2, opacity: 0.9 }),
        h('path', {
          d: 'M75.6 60.2l4 4 8.2-9',
          stroke: 'var(--dsw-alias-brand-primary)',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Small pieces                                                        */
    /* ------------------------------------------------------------------ */

    function PriorityDot({ priority }) {
      return h('span', { className: `dsh-todo-dot dsh-todo-dot-${priority}`, 'aria-hidden': 'true' })
    }

    function Summary({ counts }) {
      return h(
        'p',
        { className: 'dsh-todo-summary' },
        h('span', null, t('summary.open', { count: counts.open })),
        counts.overdue > 0 ? h('span', { className: 'dsh-todo-summary-warn' }, t('summary.overdue', { count: counts.overdue })) : null,
      )
    }

    function AddBar({ busy, disabled, onAdd, inputRef }) {
      const [value, setValue] = React.useState('')
      const submit = async (event) => {
        event.preventDefault()
        const title = value.trim()
        if (title === '' || busy) return
        const added = await onAdd(title)
        if (added) setValue('')
      }
      return h(
        'form',
        { className: 'dsh-todo-add', onSubmit: submit },
        h('span', { className: 'dsh-todo-addglyph', 'aria-hidden': 'true' }, iconPlus()),
        h('input', {
          ref: inputRef,
          className: 'dsh-todo-addinput',
          type: 'text',
          value,
          maxLength: 300,
          placeholder: t('add.placeholder'),
          'aria-label': t('add.label'),
          disabled,
          onChange: (event) => setValue(event.target.value),
        }),
        h(
          'button',
          { className: 'dsh-todo-addbutton', type: 'submit', disabled: disabled || busy || value.trim() === '' },
          t('add.button'),
        ),
      )
    }

    function Toolbar({ tab, onTab, query, onQuery, counts }) {
      const tabs = [
        { id: 'open', label: t('tab.open'), count: counts.open },
        { id: 'done', label: t('tab.done'), count: counts.done },
        { id: 'all', label: t('tab.all'), count: counts.total },
      ]
      return h(
        'div',
        { className: 'dsh-todo-toolbar' },
        h(
          'div',
          { className: 'dsh-todo-tabs', role: 'group', 'aria-label': t('title') },
          tabs.map((item) =>
            h(
              'button',
              {
                key: item.id,
                type: 'button',
                className: 'dsh-todo-tab',
                'aria-pressed': tab === item.id,
                onClick: () => onTab(item.id),
              },
              item.label,
              h('span', { className: 'dsh-todo-tabcount' }, item.count),
            ),
          ),
        ),
        h(
          'label',
          { className: 'dsh-todo-search' },
          iconSearch(),
          h('input', {
            className: 'dsh-todo-searchinput',
            type: 'search',
            value: query,
            placeholder: t('search.placeholder'),
            'aria-label': t('search.label'),
            onChange: (event) => onQuery(event.target.value),
          }),
        ),
      )
    }

    function TodoRow({ todo, busy, onToggle, onEdit, onDelete, onPreview }) {
      const overdue = isOverdue(todo)
      const due = dueText(todo)
      const images = Array.isArray(todo.images) ? todo.images : []
      const showMeta = !todo.done && (todo.priority !== 'normal' || due !== '')
      return h(
        'li',
        { className: `dsh-todo-row${todo.done ? ' is-done' : ''}`, 'data-todo-id': todo.id },
        h(
          'button',
          {
            type: 'button',
            role: 'checkbox',
            className: 'dsh-todo-check',
            'aria-checked': todo.done,
            'aria-label': todo.done ? t('row.undone.named', { title: todo.title }) : t('row.done.named', { title: todo.title }),
            disabled: busy,
            onClick: () => onToggle(todo),
          },
          h(
            'svg',
            { className: 'dsh-todo-checkmark', viewBox: '0 0 16 16', 'aria-hidden': 'true' },
            h('path', { d: 'M3.4 8.3l3 3 6.2-6.6' }),
          ),
        ),
        h(
          'div',
          { className: 'dsh-todo-main' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-todo-rowtitle',
              title: t('row.edit'),
              onClick: () => onEdit(todo),
            },
            todo.title,
          ),
          showMeta
            ? h(
                'div',
                { className: 'dsh-todo-meta' },
                todo.priority !== 'normal'
                  ? h(
                      'span',
                      { className: `dsh-todo-chip dsh-todo-chip-${todo.priority}` },
                      h(PriorityDot, { priority: todo.priority }),
                      t(`priority.${todo.priority}`),
                    )
                  : null,
                due !== ''
                  ? h(
                      'span',
                      { className: `dsh-todo-chip${overdue ? ' is-overdue' : ''}` },
                      h('span', { className: 'dsh-todo-chipdot', 'aria-hidden': 'true' }),
                      due,
                      overdue ? h('span', { className: 'dsh-todo-overdue-tag' }, t('overdue')) : null,
                    )
                  : null,
              )
            : null,
          todo.notes !== ''
            ? h('p', { className: 'dsh-todo-notes', title: todo.notes }, todo.notes)
            : null,
          images.length > 0
            ? h(
                'div',
                { className: 'dsh-todo-rowimages' },
                images.slice(0, 4).map((image) =>
                  h(
                    'button',
                    {
                      key: image.id,
                      type: 'button',
                      className: 'dsh-todo-rowthumb',
                      title: image.name !== '' ? image.name : t('image.open'),
                      'aria-label': image.name !== '' ? `${t('image.open')}：${image.name}` : t('image.open'),
                      onClick: () => onPreview(image),
                    },
                    h('img', { src: image.url, alt: image.name !== '' ? image.name : t('image.alt'), loading: 'lazy' }),
                  ),
                ),
                images.length > 4
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-todo-rowmore',
                        title: t('image.open'),
                        'aria-label': t('image.open'),
                        onClick: () => onPreview(images[4]),
                      },
                      t('row.images.more', { count: images.length - 4 }),
                    )
                  : null,
              )
            : null,
        ),
        h(
          'div',
          { className: 'dsh-todo-rowactions' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-todo-iconbtn',
              title: t('row.edit'),
              'aria-label': t('row.edit.named', { title: todo.title }),
              onClick: () => onEdit(todo),
            },
            iconPencil(),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-todo-iconbtn is-danger',
              title: t('row.delete'),
              'aria-label': t('row.delete.named', { title: todo.title }),
              disabled: busy,
              onClick: () => onDelete(todo),
            },
            iconTrash(),
          ),
        ),
      )
    }

    function TodoEditor({ todo, busy, onCancel, onSave, onDelete }) {
      const [title, setTitle] = React.useState(todo.title)
      const [notes, setNotes] = React.useState(todo.notes !== '' ? todo.notes : '')
      const [priority, setPriority] = React.useState(todo.priority)
      const [due, setDue] = React.useState(todo.due !== null ? todo.due : '')
      const [images, setImages] = React.useState(() =>
        Array.isArray(todo.images) ? todo.images.map((image) => ({ id: image.id, name: image.name, url: image.url })) : [],
      )
      const [pendingIds, setPendingIds] = React.useState(() => new Set())
      const [removedIds, setRemovedIds] = React.useState(() => new Set())
      const [uploading, setUploading] = React.useState(false)
      const [imageError, setImageError] = React.useState(null)
      const [error, setError] = React.useState(null)
      const titleRef = React.useRef(null)
      const fileRef = React.useRef(null)
      const pendingRef = React.useRef(new Set())
      const imagesRef = React.useRef(images)
      const savingRef = React.useRef(false)
      const mountedRef = React.useRef(true)
      const uploadQueueRef = React.useRef(Promise.resolve())
      const uploadCountRef = React.useRef(0)

      React.useEffect(() => {
        pendingRef.current = pendingIds
      }, [pendingIds])

      React.useEffect(() => {
        imagesRef.current = images
      }, [images])

      React.useEffect(() => {
        const input = titleRef.current
        if (input !== null) {
          input.focus()
          if (typeof input.select === 'function') input.select()
        }
      }, [])

      // Unmount without a successful save: drop uploads that never became part
      // of the todo. The host also ignores ids another todo already references.
      React.useEffect(() => {
        return () => {
          mountedRef.current = false
          if (savingRef.current) return
          const ids = [...pendingRef.current]
          if (ids.length > 0) void discardUploaded(ids)
        }
      }, [])

      const markPending = (id, add) => {
        setPendingIds((previous) => {
          const next = new Set(previous)
          if (add) next.add(id)
          else next.delete(id)
          return next
        })
      }

      const uploadFiles = (fileList) => {
        const files = Array.from(fileList ?? []).filter(
          (file) => file !== null && typeof file === 'object' && typeof file.type === 'string',
        )
        if (files.length === 0) return Promise.resolve()
        uploadCountRef.current += 1
        setUploading(true)
        const run = async () => {
          setImageError(null)
          let count = imagesRef.current.length
          for (const file of files) {
            if (!file.type.startsWith('image/')) {
              setImageError(t('editor.images.type'))
              continue
            }
            if (file.size > MAX_IMAGE_BYTES) {
              setImageError(t('editor.images.tooLarge'))
              continue
            }
            if (count >= MAX_IMAGES) {
              setImageError(t('editor.images.limit'))
              break
            }
            try {
              const uploaded = await uploadImageFile(file)
              setImages((previous) => {
                if (previous.length >= MAX_IMAGES) return previous
                return [...previous, { id: uploaded.id, name: uploaded.name ?? file.name ?? '', url: uploaded.url }]
              })
              markPending(uploaded.id, true)
              count += 1
            } catch (uploadError) {
              setImageError(messageOf(uploadError))
            }
          }
        }
        const task = uploadQueueRef.current.then(run, run).catch(() => {})
        uploadQueueRef.current = task
        void task.finally(() => {
          uploadCountRef.current = Math.max(0, uploadCountRef.current - 1)
          if (uploadCountRef.current === 0 && mountedRef.current) setUploading(false)
        })
        return task
      }

      const removeImage = (image) => {
        setImages((previous) => previous.filter((item) => item.id !== image.id))
        if (pendingIds.has(image.id)) {
          markPending(image.id, false)
          void discardUploaded([image.id])
        } else {
          setRemovedIds((previous) => {
            const next = new Set(previous)
            next.add(image.id)
            return next
          })
        }
      }

      const cancel = () => {
        if (savingRef.current || uploadCountRef.current > 0) return
        onCancel()
      }

      const submit = async (event) => {
        if (event !== undefined && event !== null) event.preventDefault()
        if (uploading || uploadCountRef.current > 0) {
          setImageError(t('editor.images.uploading'))
          return
        }
        if (savingRef.current || busy) return
        const trimmed = title.trim()
        if (trimmed === '') {
          setError(t('editor.title.required'))
          return
        }
        setError(null)
        const patch = {}
        if (trimmed !== todo.title) patch.title = trimmed
        if (notes.trim() !== todo.notes) patch.notes = notes.trim()
        if (priority !== todo.priority) patch.priority = priority
        if (due !== (todo.due ?? '')) patch.due = due
        // Merge against the latest todo prop: another tab may have added or
        // removed images via SSE while this editor was open. Only our pending
        // uploads and local removals are sent, so foreign changes survive.
        const latestImages = Array.isArray(todo.images) ? todo.images : []
        const merged = latestImages
          .filter((image) => !removedIds.has(image.id))
          .map((image) => ({ id: image.id, name: image.name }))
        for (const image of images) {
          if (pendingIds.has(image.id)) merged.push({ id: image.id, name: image.name })
        }
        const latestKey = latestImages.map((image) => image.id).join('|')
        const mergedKey = merged.map((image) => image.id).join('|')
        if (mergedKey !== latestKey) patch.images = merged
        if (Object.keys(patch).length === 0) {
          cancel()
          return
        }
        savingRef.current = true
        await onSave(todo, patch)
        if (mountedRef.current) savingRef.current = false
      }

      const onKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          cancel()
          return
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          void submit()
        }
      }

      const onPaste = (event) => {
        const clipboard = event.clipboardData
        if (clipboard === null || clipboard === undefined) return
        const files = []
        if (clipboard.files !== null && clipboard.files !== undefined) {
          for (let index = 0; index < clipboard.files.length; index += 1) files.push(clipboard.files[index])
        }
        if (files.length === 0 && clipboard.items !== null && clipboard.items !== undefined) {
          for (let index = 0; index < clipboard.items.length; index += 1) {
            const item = clipboard.items[index]
            if (item === null || item === undefined || item.kind !== 'file') continue
            const file = item.getAsFile()
            if (file !== null) files.push(file)
          }
        }
        const imageFiles = files.filter((file) => file !== null && file.type.startsWith('image/'))
        if (imageFiles.length === 0) return
        let hasText = false
        const types = clipboard.types
        if (types !== null && types !== undefined) {
          for (let index = 0; index < types.length; index += 1) {
            if (types[index] === 'text/plain') {
              hasText = true
              break
            }
          }
        }
        // Mixed clipboard: upload the image but let the text paste normally.
        if (!hasText) event.preventDefault()
        void uploadFiles(imageFiles)
      }

      return h(
        'form',
        { className: 'dsh-todo-editor', onSubmit: submit, onKeyDown, onPaste },
        h(
          'label',
          { className: 'dsh-todo-field' },
          h('span', { className: 'dsh-todo-fieldlabel' }, t('editor.title')),
          h('input', {
            ref: titleRef,
            className: 'dsh-todo-input',
            type: 'text',
            value: title,
            maxLength: 300,
            onChange: (event) => setTitle(event.target.value),
          }),
        ),
        h(
          'label',
          { className: 'dsh-todo-field' },
          h('span', { className: 'dsh-todo-fieldlabel' }, t('editor.notes')),
          h('textarea', {
            className: 'dsh-todo-textarea',
            rows: 2,
            value: notes,
            maxLength: 4000,
            placeholder: t('editor.notes.placeholder'),
            onChange: (event) => setNotes(event.target.value),
          }),
        ),
        h(
          'div',
          { className: 'dsh-todo-imagesfield' },
          h(
            'div',
            { className: 'dsh-todo-imageshead' },
            h('span', { className: 'dsh-todo-fieldlabel' }, t('editor.images')),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-todo-textbtn',
                disabled: uploading || images.length >= MAX_IMAGES,
                onClick: () => {
                  const input = fileRef.current
                  if (input !== null) input.click()
                },
              },
              t('editor.images.add'),
            ),
            h('span', { className: 'dsh-todo-hint' }, t('editor.images.hint')),
          ),
          images.length > 0
            ? h(
                'div',
                { className: 'dsh-todo-imagestrip' },
                images.map((image) =>
                  h(
                    'figure',
                    { key: image.id, className: 'dsh-todo-thumb' },
                    h('img', {
                      src: image.url,
                      alt: image.name !== '' ? image.name : t('image.alt'),
                      loading: 'lazy',
                    }),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-todo-thumbremove',
                        title: t('editor.images.remove'),
                        'aria-label': t('editor.images.remove'),
                        onClick: () => removeImage(image),
                      },
                      '×',
                    ),
                  ),
                ),
              )
            : null,
          uploading ? h('span', { className: 'dsh-todo-hint' }, t('editor.images.uploading')) : null,
          imageError !== null ? h('p', { className: 'dsh-todo-editorerror', role: 'alert' }, imageError) : null,
          h('input', {
            ref: fileRef,
            className: 'dsh-todo-fileinput',
            type: 'file',
            accept: 'image/png,image/jpeg,image/gif,image/webp,image/bmp',
            multiple: true,
            tabIndex: -1,
            onChange: (event) => {
              const files = event.target.files
              void uploadFiles(files)
              event.target.value = ''
            },
          }),
        ),
        h(
          'div',
          { className: 'dsh-todo-editorgrid' },
          h(
            'div',
            { className: 'dsh-todo-field' },
            h('span', { className: 'dsh-todo-fieldlabel' }, t('editor.priority')),
            h(
              'div',
              { className: 'dsh-todo-chips', role: 'group', 'aria-label': t('editor.priority') },
              ['low', 'normal', 'high'].map((value) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    className: `dsh-todo-chipbtn${priority === value ? ' is-active' : ''}`,
                    'aria-pressed': priority === value,
                    onClick: () => setPriority(value),
                  },
                  h(PriorityDot, { priority: value }),
                  t(`priority.${value}`),
                ),
              ),
            ),
          ),
          h(
            'div',
            { className: 'dsh-todo-field' },
            h('span', { className: 'dsh-todo-fieldlabel' }, t('editor.due')),
            h(
              'div',
              { className: 'dsh-todo-daterow' },
              h('input', {
                className: 'dsh-todo-date',
                type: 'date',
                value: due,
                'aria-label': t('editor.due'),
                onChange: (event) => setDue(event.target.value),
              }),
              h(
                'button',
                { type: 'button', className: 'dsh-todo-chipbtn', onClick: () => setDue(todayStamp()) },
                t('due.today'),
              ),
              h(
                'button',
                { type: 'button', className: 'dsh-todo-chipbtn', onClick: () => setDue(tomorrowStamp()) },
                t('due.tomorrow'),
              ),
              due !== ''
                ? h(
                    'button',
                    { type: 'button', className: 'dsh-todo-chipbtn', onClick: () => setDue('') },
                    t('due.clear'),
                  )
                : null,
            ),
          ),
        ),
        error !== null ? h('p', { className: 'dsh-todo-editorerror', role: 'alert' }, error) : null,
        h(
          'div',
          { className: 'dsh-todo-editorfoot' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-todo-textbtn is-danger',
              'aria-label': t('row.delete.named', { title: todo.title }),
              disabled: busy,
              onClick: () => onDelete(todo),
            },
            t('editor.delete'),
          ),
          h('span', { className: 'dsh-todo-spacer' }),
          h('span', { className: 'dsh-todo-hint' }, t('editor.hint')),
          h(
            'button',
            { type: 'button', className: 'dsh-todo-btn', onClick: cancel, disabled: busy || uploading },
            t('editor.cancel'),
          ),
          h(
            'button',
            {
              type: 'submit',
              className: 'dsh-todo-btn is-primary',
              disabled: busy || uploading || title.trim() === '',
            },
            t('editor.save'),
          ),
        ),
      )
    }

    function EmptyState({ variant, onAction }) {
      if (variant === 'open' || variant === 'done') {
        return h(
          'div',
          { className: 'dsh-todo-empty' },
          h('h2', { className: 'dsh-todo-emptytitle' }, t(variant === 'open' ? 'empty.open' : 'empty.done')),
        )
      }
      if (variant === 'filtered') {
        return h(
          'div',
          { className: 'dsh-todo-empty' },
          h('p', { className: 'dsh-todo-emptybody' }, t('empty.filtered')),
          h(
            'button',
            { type: 'button', className: 'dsh-todo-btn', onClick: onAction },
            t('empty.filtered.action'),
          ),
        )
      }
      return h(
        'div',
        { className: 'dsh-todo-empty' },
        h('div', { className: 'dsh-todo-emptyglyph' }, EmptyArt()),
        h('h2', { className: 'dsh-todo-emptytitle' }, t('empty.none.title')),
        h('p', { className: 'dsh-todo-emptybody' }, t('empty.none.body')),
        h(
          'button',
          { type: 'button', className: 'dsh-todo-btn is-primary', onClick: onAction },
          t('empty.none.action'),
        ),
      )
    }

    /* ------------------------------------------------------------------ */
    /* Page                                                                */
    /* ------------------------------------------------------------------ */

    function TodoPage({ onClose }) {
      const current = useTodoSnapshot()
      const [tab, setTab] = React.useState('open')
      const [query, setQuery] = React.useState('')
      const [editingId, setEditingId] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [actionError, setActionError] = React.useState(null)
      const [undo, setUndo] = React.useState(null)
      const [preview, setPreview] = React.useState(null)
      const inputRef = React.useRef(null)
      const undoTimer = React.useRef(null)
      const errorTimer = React.useRef(null)
      const lightboxCloseRef = React.useRef(null)

      React.useEffect(() => {
        return () => {
          if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
          if (errorTimer.current !== null) window.clearTimeout(errorTimer.current)
        }
      }, [])

      React.useEffect(() => {
        if (preview === null) return
        const previousFocus = document.activeElement
        const closeButton = lightboxCloseRef.current
        if (closeButton !== null) closeButton.focus()
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setPreview(null)
            return
          }
          if (event.key === 'Tab') {
            event.preventDefault()
            const button = lightboxCloseRef.current
            if (button !== null) button.focus()
          }
        }
        document.addEventListener('keydown', onKey, true)
        return () => {
          document.removeEventListener('keydown', onKey, true)
          if (previousFocus !== null && typeof previousFocus.focus === 'function') previousFocus.focus()
        }
      }, [preview])

      React.useEffect(() => {
        const input = inputRef.current
        if (input !== null) input.focus()
      }, [])

      React.useEffect(() => {
        setEditingId(null)
      }, [tab])

      const focusAdd = () => {
        const input = inputRef.current
        if (input !== null) input.focus()
      }

      const showError = (error) => {
        setActionError(messageOf(error))
        if (errorTimer.current !== null) window.clearTimeout(errorTimer.current)
        errorTimer.current = window.setTimeout(() => setActionError(null), 9000)
      }

      const run = async (op, payload) => {
        setBusy(true)
        try {
          const result = await runOperation(op, payload)
          setActionError(null)
          return result
        } catch (error) {
          showError(error)
          return null
        } finally {
          setBusy(false)
        }
      }

      const scheduleUndo = (items) => {
        if (!Array.isArray(items) || items.length === 0) return
        if (undoTimer.current !== null) window.clearTimeout(undoTimer.current)
        setUndo({ items })
        undoTimer.current = window.setTimeout(() => {
          setUndo(null)
          // Undo window is over: release images the deleted todos still own.
          const ids = []
          for (const item of items) {
            if (!Array.isArray(item.images)) continue
            for (const image of item.images) ids.push(image.id)
          }
          if (ids.length > 0) void discardUploaded(ids)
        }, 7000)
      }

      const undoNow = async () => {
        const currentUndo = undo
        if (currentUndo === null) return
        setUndo(null)
        if (undoTimer.current !== null) {
          window.clearTimeout(undoTimer.current)
          undoTimer.current = null
        }
        if (currentUndo.items.length === 1) await run('restore', { todo: currentUndo.items[0] })
        else await run('restore-many', { todos: currentUndo.items })
      }

      const handleAdd = async (title) => {
        const result = await run('create', { title })
        return result !== null
      }

      const handleToggle = (todo) => {
        void run('toggle', { id: todo.id, done: !todo.done })
      }

      const handleDelete = async (todo) => {
        setEditingId(null)
        const result = await run('remove', { id: todo.id })
        if (result !== null) scheduleUndo([result.removed])
      }

      const handleClearCompleted = async () => {
        const result = await run('clear-completed')
        if (result !== null && Array.isArray(result.removed)) scheduleUndo(result.removed)
      }

      const handleSave = async (todo, patch) => {
        const result = await run('update', { id: todo.id, patch })
        if (result !== null) setEditingId(null)
      }

      const counts = current.counts
      const normalizedQuery = query.trim().toLowerCase()
      const matches = (todo) =>
        normalizedQuery === '' || `${todo.title} ${todo.notes}`.toLowerCase().includes(normalizedQuery)
      const openItems = current.todos.filter((todo) => todo.done !== true && matches(todo))
      const doneItems = current.todos
        .filter((todo) => todo.done === true && matches(todo))
        .slice()
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      const totalMatches = openItems.length + doneItems.length

      const renderRow = (todo) =>
        editingId === todo.id
          ? h(
              'li',
              { key: todo.id, className: 'dsh-todo-editorwrap' },
              h(TodoEditor, {
                todo,
                busy,
                onCancel: () => setEditingId(null),
                onSave: handleSave,
                onDelete: handleDelete,
              }),
            )
          : h(TodoRow, {
              key: todo.id,
              todo,
              busy,
              onToggle: handleToggle,
              onEdit: (item) => setEditingId(item.id),
              onDelete: handleDelete,
              onPreview: setPreview,
            })

      const listChildren = []
      if (tab !== 'done') for (const todo of openItems) listChildren.push(renderRow(todo))
      if (tab === 'all' && openItems.length > 0 && doneItems.length > 0) {
        listChildren.push(
          h('li', { key: 'divider', className: 'dsh-todo-divider' }, t('group.done')),
        )
      }
      if (tab !== 'open') for (const todo of doneItems) listChildren.push(renderRow(todo))

      const errorText = actionError !== null ? actionError : current.error

      let emptyVariant = 'none'
      if (current.todos.length > 0) {
        if (normalizedQuery !== '') emptyVariant = 'filtered'
        else if (tab === 'open') emptyVariant = 'open'
        else if (tab === 'done') emptyVariant = 'done'
        else emptyVariant = 'none'
      }

      const body = !current.ready
        ? current.error === null
          ? h('div', { className: 'dsh-todo-loading' }, t('loading'))
          : null
        : totalMatches === 0
          ? h(EmptyState, {
              variant: emptyVariant,
              onAction: () => {
                if (current.todos.length === 0) focusAdd()
                else {
                  setQuery('')
                  setTab('open')
                }
              },
            })
          : h('ul', { className: 'dsh-todo-list' }, listChildren)

      return h(
        'div',
        { className: 'dsh-todo-page', 'data-dsh-todo-page': '' },
        h(
          'div',
          { className: 'dsh-todo-inner' },
          h(
            'header',
            { className: 'dsh-todo-header' },
            h(
              'div',
              { className: 'dsh-todo-heading' },
              h('h1', { className: 'dsh-todo-title' }, t('title')),
              h(Summary, { counts }),
            ),
            h(
              'button',
              { type: 'button', className: 'dsh-todo-iconbtn', title: t('close'), 'aria-label': t('close'), onClick: onClose },
              iconClose(),
            ),
          ),
          h(AddBar, { busy, disabled: false, onAdd: handleAdd, inputRef }),
          current.todos.length > 0 ? h(Toolbar, { tab, onTab: setTab, query, onQuery: setQuery, counts }) : null,
          errorText !== null
            ? h(
                'div',
                { className: 'dsh-todo-banner', role: 'alert' },
                h('span', { className: 'dsh-todo-bannerglyph' }, iconAlert()),
                h('span', { className: 'dsh-todo-bannertext' }, errorText),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-todo-textbtn',
                    onClick: () => {
                      if (current.error !== null) {
                        setActionError(null)
                        void loadState()
                      } else {
                        setActionError(null)
                      }
                    },
                  },
                  current.error !== null ? t('error.retry') : t('error.dismiss'),
                ),
              )
            : null,
          h('div', { className: 'dsh-todo-scroll' }, body),
          h(
            'footer',
            { className: 'dsh-todo-footer' },
            h(
              'span',
              null,
              t('footer.remaining', { count: counts.open }),
            ),
            counts.done > 0
              ? h(
                  'button',
                  { type: 'button', className: 'dsh-todo-textbtn', disabled: busy, onClick: handleClearCompleted },
                  t('footer.clear'),
                )
              : null,
          ),
          undo !== null
            ? h(
                'div',
                { className: 'dsh-todo-snackbar', role: 'status' },
                h(
                  'span',
                  { className: 'dsh-todo-snacktext' },
                  undo.items.length === 1
                    ? t('undo.deleted', { title: undo.items[0].title })
                    : t('undo.cleared', { count: undo.items.length }),
                ),
                h('button', { type: 'button', className: 'dsh-todo-snackbtn', onClick: undoNow }, t('undo.action')),
              )
            : null,
        ),
        preview !== null
          ? h(
              'div',
              {
                className: 'dsh-todo-lightbox',
                role: 'dialog',
                'aria-modal': 'true',
                'aria-label': preview.name !== '' ? preview.name : t('image.alt'),
                onClick: (event) => {
                  if (event.target === event.currentTarget) setPreview(null)
                },
              },
              h('img', {
                className: 'dsh-todo-lightboximg',
                src: preview.url,
                alt: preview.name !== '' ? preview.name : t('image.alt'),
              }),
              h(
                'button',
                {
                  ref: lightboxCloseRef,
                  type: 'button',
                  className: 'dsh-todo-lightboxclose',
                  title: t('image.close'),
                  'aria-label': t('image.close'),
                  onClick: () => setPreview(null),
                },
                iconClose(),
              ),
            )
          : null,
      )
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
.dsh-todo-page {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;
}
.dsh-todo-inner {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 760px;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: 28px clamp(20px, 4vw, 40px) 0;
}
[data-platform="darwin"] .dsh-todo-inner {
  padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px));
}
.dsh-todo-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: none;
  margin-bottom: 20px;
}
.dsh-todo-heading { flex: 1; min-width: 0; }
.dsh-todo-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  letter-spacing: 0.01em;
}
.dsh-todo-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 2px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
}
.dsh-todo-summary-warn { color: var(--dsw-alias-state-error-primary); }

.dsh-todo-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
@media (hover: hover) {
  .dsh-todo-iconbtn:hover:not(:disabled) {
    color: var(--dsw-alias-label-primary);
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
.dsh-todo-iconbtn.is-danger:hover:not(:disabled) { color: var(--dsw-alias-state-error-primary); }
.dsh-todo-iconbtn:disabled { opacity: 0.4; cursor: default; }

.dsh-todo-add {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  box-sizing: border-box;
  padding: 4px 4px 4px 12px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.dsh-todo-add:focus-within { border-color: var(--dsw-alias-brand-primary); }
.dsh-todo-addglyph {
  display: inline-flex;
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-todo-addinput {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 14px;
}
.dsh-todo-addinput::placeholder { color: var(--dsw-alias-label-tertiary); }
.dsh-todo-addbutton {
  flex: none;
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-foreground, #fff);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.dsh-todo-addbutton:disabled { opacity: 0.4; cursor: default; }

.dsh-todo-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: none;
  margin: 22px 0 6px;
}
.dsh-todo-tabs { display: flex; align-items: center; gap: 18px; flex: 1; min-width: 0; }
.dsh-todo-tab {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.15s ease;
}
.dsh-todo-tab::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 0.15s ease;
}
.dsh-todo-tab[aria-pressed="true"] { color: var(--dsw-alias-label-primary); }
.dsh-todo-tab[aria-pressed="true"]::after { background: var(--dsw-alias-brand-primary); }
.dsh-todo-tabcount {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.dsh-todo-search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  box-sizing: border-box;
  width: 190px;
  height: 30px;
  padding: 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-todo-search:focus-within { border-color: var(--dsw-alias-brand-primary); }
.dsh-todo-searchinput {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
}
.dsh-todo-searchinput::placeholder { color: var(--dsw-alias-label-tertiary); }
.dsh-todo-searchinput::-webkit-search-cancel-button { display: none; }

.dsh-todo-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  margin: 12px 0 4px;
  padding: 8px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}
.dsh-todo-bannerglyph { display: inline-flex; flex: none; }
.dsh-todo-bannertext { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.dsh-todo-banner .dsh-todo-textbtn { color: inherit; }

.dsh-todo-scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden auto;
  scrollbar-gutter: stable;
  --dsh-scrollbar-width: 9px;
  --dsh-scrollbar-thumb-border: 2px;
}
.dsh-todo-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0 2px 8px;
  list-style: none;
}
.dsh-todo-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 10px;
  transition: background-color 0.12s ease;
}
.dsh-todo-row + .dsh-todo-row,
.dsh-todo-row + .dsh-todo-divider { border-top: 0.5px solid var(--dsw-alias-border-l1); }
@media (hover: hover) {
  .dsh-todo-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.dsh-todo-check {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  padding: 0;
  border: 1.2px solid var(--dsw-alias-border-l3);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.dsh-todo-check[aria-checked="true"] {
  background: var(--dsw-alias-brand-primary);
  border-color: var(--dsw-alias-brand-primary);
}
.dsh-todo-check:disabled { opacity: 0.5; cursor: default; }
.dsh-todo-check::after {
  content: "";
  position: absolute;
  inset: -5px;
  border-radius: 10px;
}
.dsh-todo-checkmark {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: var(--dsw-alias-label-primary-foreground, #fff);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 16;
  stroke-dashoffset: 16;
  transition: stroke-dashoffset 0.18s ease 0.02s;
}
.dsh-todo-check[aria-checked="true"] .dsh-todo-checkmark { stroke-dashoffset: 0; }

.dsh-todo-main { flex: 1; min-width: 0; }
.dsh-todo-rowtitle {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: text;
  transition: color 0.15s ease;
}
.dsh-todo-row.is-done .dsh-todo-rowtitle {
  color: var(--dsw-alias-label-tertiary);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
.dsh-todo-notes {
  margin: 2px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsh-todo-row.is-done .dsh-todo-notes { opacity: 0.6; }
.dsh-todo-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-todo-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
}
.dsh-todo-chip.is-overdue { color: var(--dsw-alias-state-error-primary); }
.dsh-todo-chipdot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}
.dsh-todo-overdue-tag { opacity: 0.9; }
.dsh-todo-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.dsh-todo-dot-high { background: var(--dsw-alias-state-error-primary); }
.dsh-todo-dot-normal { background: var(--dsw-alias-label-tertiary); }
.dsh-todo-dot-low { background: var(--dsw-alias-border-l3); }

.dsh-todo-rowactions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.dsh-todo-row:hover .dsh-todo-rowactions,
.dsh-todo-row:focus-within .dsh-todo-rowactions { opacity: 1; }
@media (hover: none) {
  .dsh-todo-rowactions { opacity: 1; }
}

.dsh-todo-editorwrap {
  padding: 6px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.dsh-todo-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsh-todo-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.dsh-todo-fieldlabel {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
}
.dsh-todo-input,
.dsh-todo-textarea,
.dsh-todo-date {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 7px 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}
.dsh-todo-input:focus,
.dsh-todo-textarea:focus,
.dsh-todo-date:focus { border-color: var(--dsw-alias-brand-primary); }
.dsh-todo-textarea { resize: vertical; min-height: 56px; max-height: 160px; line-height: 20px; }
.dsh-todo-editorgrid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 14px;
}
.dsh-todo-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dsh-todo-chipbtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 15px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.dsh-todo-chipbtn.is-active {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);
}
.dsh-todo-daterow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.dsh-todo-date {
  width: auto;
  flex: 0 1 150px;
  height: 30px;
  padding: 0 8px;
  font-size: 13px;
}
.dsh-todo-editorerror { margin: 0; color: var(--dsw-alias-state-error-primary); font-size: 12px; }

.dsh-todo-imagesfield { display: flex; flex-direction: column; gap: 8px; }
.dsh-todo-imageshead { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.dsh-todo-imageshead .dsh-todo-textbtn { margin-left: 0; }
.dsh-todo-imagestrip { display: flex; flex-wrap: wrap; gap: 8px; }
.dsh-todo-thumb {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0;
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-base);
}
.dsh-todo-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.dsh-todo-thumbremove {
  position: absolute;
  top: 3px;
  right: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font: inherit;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}
@media (hover: hover) { .dsh-todo-thumbremove:hover { background: rgba(0, 0, 0, 0.78); } }
.dsh-todo-fileinput { display: none; }

.dsh-todo-rowimages { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 6px; }
.dsh-todo-rowthumb {
  width: 44px;
  height: 44px;
  padding: 0;
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: transparent;
  cursor: zoom-in;
}
.dsh-todo-rowthumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.dsh-todo-rowmore {
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
@media (hover: hover) { .dsh-todo-rowmore:hover { color: var(--dsw-alias-label-primary); } }

.dsh-todo-lightbox {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(0, 0, 0, 0.66);
}
.dsh-todo-lightboximg {
  display: block;
  max-width: min(92vw, 1100px);
  max-height: 88vh;
  border-radius: 10px;
  background: var(--dsw-alias-bg-base);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
}
.dsh-todo-lightboxclose {
  position: absolute;
  top: 18px;
  right: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  cursor: pointer;
}
@media (hover: hover) { .dsh-todo-lightboxclose:hover { background: rgba(255, 255, 255, 0.26); } }

.dsh-todo-editorfoot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.dsh-todo-spacer { flex: 1; }
.dsh-todo-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-todo-btn {
  height: 30px;
  padding: 0 12px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
@media (hover: hover) {
  .dsh-todo-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
}
.dsh-todo-btn.is-primary {
  border-color: transparent;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.dsh-todo-btn:disabled { opacity: 0.4; cursor: default; }
.dsh-todo-textbtn {
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  margin-left: -6px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
@media (hover: hover) {
  .dsh-todo-textbtn:hover:not(:disabled) {
    color: var(--dsw-alias-label-primary);
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
.dsh-todo-textbtn.is-danger { color: var(--dsw-alias-state-error-primary); margin-left: 0; }
.dsh-todo-textbtn:disabled { opacity: 0.4; cursor: default; }

.dsh-todo-divider {
  padding: 18px 8px 4px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 0.02em;
}

.dsh-todo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 56px 20px 40px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-todo-emptyglyph { color: var(--dsw-alias-label-tertiary); margin-bottom: 14px; }
.dsh-todo-emptyart { display: block; }
.dsh-todo-emptytitle {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
}
.dsh-todo-emptybody {
  margin: 4px 0 0;
  max-width: 34em;
  font-size: 12px;
  line-height: 18px;
}
.dsh-todo-empty .dsh-todo-btn { margin-top: 16px; }
.dsh-todo-loading { padding: 40px 8px; color: var(--dsw-alias-label-tertiary); font-size: 13px; }

.dsh-todo-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: none;
  padding: 10px 8px 18px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
}

.dsh-todo-snackbar {
  position: absolute;
  left: 50%;
  bottom: 64px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(440px, calc(100% - 32px));
  padding: 8px 8px 8px 14px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-specific-menu, var(--dsw-alias-bg-overlay));
  box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0, 0, 0, 0.16));
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  transform: translateX(-50%);
}
.dsh-todo-snacktext { min-width: 0; overflow-wrap: anywhere; }
.dsh-todo-snackbtn {
  flex: none;
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
@media (hover: hover) {
  .dsh-todo-snackbtn:hover { background: var(--dsw-alias-interactive-bg-hover); }
}

.dsh-todo-page :focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary));
  outline-offset: 2px;
}
.dsh-todo-input:focus-visible,
.dsh-todo-textarea:focus-visible,
.dsh-todo-date:focus-visible,
.dsh-todo-addinput:focus-visible,
.dsh-todo-searchinput:focus-visible { outline: none; }

@media (max-width: 640px) {
  .dsh-todo-inner { padding-inline: 16px; }
  .dsh-todo-search { display: none; }
  .dsh-todo-editorgrid { grid-template-columns: minmax(0, 1fr); }
  .dsh-todo-hint { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-todo-page * { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; }
}
`

    /** Insert the stylesheet once; returns a disposer that removes it. */
    function installStyles() {
      for (const stale of document.querySelectorAll('style[data-dsh-todo-panel-css]')) {
        try {
          stale.remove()
        } catch {
          // ignore
        }
      }
      const style = document.createElement('style')
      style.setAttribute('data-dsh-todo-panel-css', '')
      style.textContent = CSS
      document.head.appendChild(style)
      return () => {
        try {
          style.remove()
        } catch {
          // ignore
        }
      }
    }

    /* ------------------------------------------------------------------ */
    /* Plugin                                                              */
    /* ------------------------------------------------------------------ */

    /** Panel page factory bound to the plugin context. */
    function makePage(ctx) {
      return function TodoPanelPage() {
        const close = () => {
          try {
            if (ctx.layout !== undefined && typeof ctx.layout.selectPanel === 'function') ctx.layout.selectPanel(null)
          } catch (error) {
            console.warn('[dsh-todo-panel] 关闭面板失败', error)
          }
        }
        return h(TodoPage, { onClose: close })
      }
    }

    return {
      inject: ['slots', 'layout', 'locale'],
      apply(ctx) {
        const disposers = []

        ctx.effect(() => installStyles(), 'todo-panel: styles')

        ctx.effect(() => {
          const locale = ctx.locale
          if (locale === undefined || typeof locale.register !== 'function') return
          const registered = []
          try {
            registered.push(locale.register(NS, 'zh', UI.zh))
            registered.push(locale.register(NS, 'en', UI.en))
            if (typeof locale.bind === 'function') translateFn = locale.bind(NS)
          } catch (error) {
            console.warn('[dsh-todo-panel] 文案注册失败，使用内置中文', error)
          }
          return () => {
            translateFn = null
            for (const dispose of registered) {
              try {
                dispose()
              } catch {
                // ignore
              }
            }
          }
        }, 'todo-panel: locale')

        ctx.effect(() => {
          void loadState()
          connectEvents()
          const onVisible = () => {
            if (document.visibilityState === 'visible') void loadState()
          }
          document.addEventListener('visibilitychange', onVisible)
          return () => {
            document.removeEventListener('visibilitychange', onVisible)
            const source = eventSource
            eventSource = null
            if (source !== null) {
              try {
                source.close()
              } catch {
                // ignore
              }
            }
          }
        }, 'todo-panel: state')

        disposers.push(
          ctx.slots.inject('sidebar.panellist', () =>
            ctx.slots.register(
              {
                name: 'sidebar.panellist',
                id: PANEL_ID,
                order: PANEL_ORDER,
                locale: NS,
                label: () => t('panel'),
              },
              PanelIcon,
            ),
          ),
        )

        disposers.push(
          ctx.slots.inject('main', () =>
            ctx.slots.register({ name: 'main', key: PANEL_ID }, makePage(ctx)),
          ),
        )

        const cleanup = () => {
          for (const dispose of disposers.splice(0)) {
            try {
              dispose()
            } catch {
              // ignore
            }
          }
        }
        try {
          if (typeof ctx.on === 'function') ctx.on('dispose', cleanup)
        } catch {
          // ignore
        }
        return cleanup
      },
    }
  },
})
