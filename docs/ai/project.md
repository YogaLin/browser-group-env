# Project

## Purpose

Browser Group Env 是一个 Chrome 浏览器插件，用 Chrome Tab Group 表达开发任务或预发环境上下文，并按 Tab Group 为请求注入环境规则。

项目要解决的问题是：用户在 Codex App 多 worktree 并行开发时，浏览器登录态、Tab Group、预发 HTTP Header 和开发任务容易错位。项目选择在同一个 Chrome Profile 内共享登录态，用 Tab Group 绑定 Env 来隔离 Header 等环境规则，避免通过多个 Profile 重复登录。

## Users

主要用户是使用 Codex App 多 worktree 并行开发的工程师，以及需要通过 HTTP Header 访问不同预发分支环境的前端或全栈工程师。

典型工作方式：

- 一个开发任务对应一个 Codex 对话。
- 一个开发任务对应一个 worktree。
- 一个开发任务对应一个预发 Header。
- 一个开发任务对应浏览器中的一个或多个 Tab Group。

## Scope

MVP 聚焦 Chrome 插件本身：

- 全局 Active / Paused。
- Auto Switch / Manual。
- Env 列表和详情。
- 新增 Env。
- 用户自定义 Env 模板。
- Env 绑定一个或多个 Tab Group。
- Headers 规则。
- Queries Replace 规则。
- Domain / Path / Excluded Domain 过滤器。
- Duplicate、Delete。
- 当前页面是否命中规则的状态展示。

MVP 暂不包含：

- Cookies 实际写入。
- Query Append / Keep 策略。
- Share、Import。
- Codex Skill 主动切换 Tab Group。
- Codex Hook 自动切换。
- 远程同步。
- 团队权限管理。

## Main Capabilities

- 为预发环境创建 Env。
- 创建和应用用户自定义模板，模板可一次性生成过滤条件和请求头；模板请求头可配置应用时从当前页面读取值。
- 将一个 Env 绑定到一个或多个 Chrome Tab Group。
- Env 可以按 Tab Group 生效，也可以配置为全局生效、与 Tab Group 无关。
- Env Workspace 可记录当前环境常用的片段、待办和备注。
- Global Workspace 可记录跨所有 Env 展示的全局片段。
- 根据 Env 生效范围和过滤器为请求注入 Headers，并用 Replace 语义改写 Query。
- 通过 Domain / Path / Excluded Domain 限定规则生效范围。
- 支持暂停插件和关闭详情自动切换。
- 支持 Env 复制和删除。

## Main Modules

- Popup UI：Env 列表、详情、规则编辑和状态展示。
- Side Panel UI：长驻 Env 工作台，复用 Env 详情能力并使用更适合窄长面板的布局。
- Options UI：独立配置页面，当前复用 Popup 体验并承载模板管理入口。
- Background Service Worker：监听 Chrome 事件，刷新动态规则。
- Chrome API 封装：隔离 `chrome.tabs`、`chrome.tabGroups`、`chrome.storage.local`、`chrome.declarativeNetRequest`。
- Model 层：Env、Filter、规则、导入导出格式和校验。

## Domain Terms

- Env：插件内的环境配置实体，代表一个预发环境上下文。
- Tab Group：Chrome 原生标签组，是规则隔离和绑定的浏览器上下文边界。
- Global Env：不依赖 Tab Group 的 Env，只受全局启用状态、Env 启用状态和 Filters 控制，可与当前 Tab Group 绑定的 Env 同时生效。
- Auto Switch：根据当前 active tab group 自动切换 UI 中选中的 Env。
- Header Rule：为命中的请求设置 HTTP Header 的规则。
- Env Template：用户维护的模板，保存过滤条件和请求头，应用后复制为普通 Env 配置；请求头值可配置应用时通过 XPath 或 CSS 从当前页面读取。
- Query Rule：用 Chrome DNR queryTransform 的 addOrReplaceParams 实现 Replace，参数缺失则新增，已存在则替换。
- Filter：限制 Env 生效范围的 Domain、Path 和 Excluded Domain 配置。
- Env Workspace：挂在 Env 上的用户辅助信息，包括可复制或打开的片段、待办和备注；不参与请求规则编译。
- Global Workspace：挂在 GlobalState 上的用户辅助信息，当前只包含全局片段；在任意 Env 的 Workspace tab 中展示，不参与请求规则编译。

## Open Questions

- Tab Group 重启后恢复策略需要在实现中验证，不能假设 `tabGroupId` 可长期稳定持久化。
- Cookies 的实际注入方式需要在后续阶段单独评估。
- Codex Skill 与插件的通信方式尚未定案。
