# dsh-todo-panel

DSH 侧边栏「待办」面板 —— 一份只给用户自己用的私人待办清单。

入口在左侧导航栏（插件 / 自动化任务 / **待办** / 提醒 之间），点开后在中心列占满一页。
数据由 host 半持久化到 `$DSH_HOME/todo-panel/todos.json`（默认 `~/.dsh/todo-panel/todos.json`），
刷新页面、重启 DSH 都不会丢。

## 设计取舍：只给人用

这份清单**不对 agent 开放**：

- 不注册任何 `todo_*` tool，模型看不到、也不能增删改清单；
- 不往 system prompt 里注入任何说明，模型不知道这个面板存在；
- 数据只在浏览器与 host 之间走 `/api/todo`，模型侧没有任何读写入口。

唯一的例外是宿主本身有文件系统权限 —— 但插件层面不提供任何 agent 接口。

## 功能

- **创建**：顶部输入框回车即添加，自动聚焦。
- **编辑**：点标题或铅笔图标就地展开（标题、备注、优先级、截止日期），不弹窗。
- **完成**：左侧复选框勾选/取消，勾选有描边动画；已完成沉到列表底部。
- **删除**：行尾垃圾桶；删除后 7 秒内可「撤销」。`清除已完成` 可整批撤销。
- **说明图片**：编辑待办时可直接 `Ctrl+V`（macOS 为 `⌘V`）粘贴图片（也可点「添加图片」选文件），
  最多 12 张、单张 10 MB，支持 PNG / JPEG / GIF / WebP / BMP；列表里显示缩略图，点开可大图预览。
- **优先级**：低 / 中 / 高，小圆点 + 文字标示。
- **截止日期**：今天 / 明天 / 任意日期；过期项标红，`今天` / `明天` 自动换成人话。
- **筛选与搜索**：进行中 / 已完成 / 全部；标题与备注全文搜索。
- **实时**：页面通过 SSE 与 host 同步，多标签页立即更新。
- **侧边栏提醒**：有逾期项时，侧边栏图标右上角出现红点。

不需要优先级 / 截止日期 / 搜索的话，删掉对应字段与控件即可 —— 数据层是宽松的，缺字段会回退到默认值。

## 目录结构

```
dsh-todo-panel/
  package.json        # dsh.bundle.patch + dsh.client（web，immediately）
  cordis.patch.yml    # 插入 todo-panel 行
  index.js            # host 半：存储 + 图片 + /api/todo（无 tools、无 prompt section）
  client.js           # client 半：侧边栏入口 + 页面（纯 JS，无构建步骤）
  locale/{zh,en}.json # 插件管理器的显示名与描述
  icon.svg            # 插件图标
```

## HTTP 接口（host 半，仅浏览器同源调用）

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/api/todo/state` | 当前清单 + 计数（含每张图片的 `id` / `name` / `url`） |
| POST | `/api/todo/mutate` | `{ op, ... }`：`create` / `update` / `toggle` / `remove` / `restore` / `restore-many` / `clear-completed`；`update.patch` 可带 `images` |
| GET | `/api/todo/events` | SSE，`{ type: "state", state }` |
| POST | `/api/todo/upload-image` | 原始图片字节 + `content-type` / `x-image-name`，返回 `{ image: { id, type, url, name } }` |
| GET | `/api/todo/images/<id>` | 读取一张已保存的说明图片 |
| POST | `/api/todo/discard-images` | `{ ids }`：删除尚未被任何待办引用的上传（编辑取消时清理） |

图片文件存在 `$DSH_HOME/todo-panel/images/<id>.<ext>`；`todos.json` 只保存图片 id 与显示名。
删除待办时图片文件会保留（支持 7 秒撤销），host 下次加载时会清理无人引用的孤儿文件。

`mutate` 会返回最新 `state`，客户端据此渲染；上传/丢弃接口只返回自身结果；SSE 用于多端同步。
图片上传会校验文件头与声明的类型一致，并以 `x-content-type-options: nosniff` 提供。

## 安装

这是一个标准 DSH 组合包（`package.json` 里声明了 `dsh.bundle.patch`，并带有
`cordis.patch.yml`），因此和官方插件一样，可以直接在 Web 侧边栏的**插件**页安装、
启用或卸载，插件管理器会自己维护依赖与 `dsh.profile.bundles`。

手动安装则是两步：

```bash
# 1) 装依赖（固定 tag；本地开发时改用 link:/path/to/checkout）
dsh plugin --profile web add github:TobyMint/dsh-todo-panel#v0.2.0
```

2) 把 `dsh-todo-panel` 加进 profile `package.json` 的 `dsh.profile.bundles`，
然后重启 `dsh web`。`dsh plugin` 只是 pnpm 的转发，不会替你改这个列表。

数据落在 `$DSH_HOME/todo-panel/`（默认 `~/.dsh/todo-panel/`），与安装来源无关，
换来源重装不会丢待办。

## License

Apache-2.0，见 [LICENSE](./LICENSE)。

## 已知边界

- 单份全局清单，不区分 workspace；需要「每个项目一份」时，按 workspace 分文件即可。
- 没有到期提醒/系统通知 —— 那属于 `dsh-session-attention` 的职责。
- 没有拖拽排序；顺序按创建时间（新在前），已完成按完成时间倒序。
- 说明图片是本地文件（未做云端同步/压缩）；单张 10 MB 上限，粘贴大图建议先压缩。
