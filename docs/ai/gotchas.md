# Gotchas

## Header 泄漏风险

Header 注入必须受 Domain / Path / Excluded Domain 过滤器约束。没有 Domain filter 的 Env 不允许启用，避免 Header 被打到无关站点。

## 单条规则默认启用

HeaderRule 和 QueryRule 在数据结构中保留 `enabled` 字段以兼容 DNR 编译和旧数据，但 Popup 不展示单条规则的“启用”列。保存和迁移时应把规则统一视为启用，用户通过删除规则来停用单条规则。

## Chrome Profile 不用于任务隔离

不要用一个任务一个 Chrome Profile 作为默认方案。这个项目的核心前提是同一个 Chrome Profile 共享登录态，用 Tab Group + Env 隔离环境规则。

## Tab Group ID 可能不稳定

不要把 Chrome `tabGroupId` 当成长期稳定 ID。浏览器重启后需要通过标题、颜色、URL 等信息恢复绑定；无法唯一恢复时应提示用户重新绑定。

当前实现会在 Popup 加载和 Background 刷新规则时，用可用标签组列表校正已保存的 binding：如果旧 `groupKey` 已失效，或旧 `groupKey` 现在对应的标签组标题与保存标题不一致，会优先按唯一同名标签组迁移绑定；同名不唯一或找不到时保持 `unresolved`，避免把 Env 误绑定到错误标签组。

## Auto Switch 不等于规则生效条件

Auto Switch 只控制 Popup 当前选中的 Env 是否跟随 active tab group。Header 规则生效应由 Env 绑定、启用状态和过滤器决定，不应依赖 Popup 当前选中项。

## Env 列表顺序依赖持久化顺序

Popup 支持拖动 Env 排序。当前 MVP 没有单独的 `envOrder` 字段，列表顺序依赖 `GlobalState.envs` 的对象插入顺序；因此重写 `envs` 时必须保留或有意调整顺序，不要无意排序 key。

## Env 可以全局生效

Env 默认按 Tab Group 绑定生效，但也可以设置为 Global，不依赖 Tab Group。Global Env 只受全局启用、Env 启用和 Filters 控制，可以与当前 Tab Group 绑定的 Env 同时生效。若同一请求同时命中 Global Env 和 Group Env，Group Env 的 DNR 优先级应高于 Global Env，避免任务级规则被全局规则覆盖。

## 模板不是运行时规则类型

Env Template 只用于一次性生成 Env 的过滤条件和请求头。应用模板后，Env 中保存的是普通 filters 和 HeaderRule，不保存模板引用，也不在 DNR 编译阶段识别模板。新建 Env 不再默认写入当前页面 Domain filter；没有 Domain filter 时仍不允许启用注入。

模板请求头可以配置应用时取值来源，例如 XPath 或 CSS selector。取值只发生在应用模板时：读取成功则写入普通 HeaderRule 的 `value`，读取失败则保留模板里的静态 fallback value。Options 页应用模板必须使用打开页面时传入的 source tab id，否则会读到配置页 DOM。

## Workspace 不是请求规则

Env Workspace 用来记录当前环境常用片段、待办和备注，属于 Env 级 UI 辅助数据。Global Workspace 用来记录跨所有 Env 展示的全局片段，属于 GlobalState 级 UI 辅助数据。不要把任何 Workspace item 编译成 Header、Query 或 DNR 规则；复制、打开链接和勾选待办只应更新 `chrome.storage.local` 中的 Workspace 数据。

Workspace 片段在 UI 上不要区分文本、链接、命令；片段只展示一个内容输入框和复制按钮，内容检测为链接时才额外展示打开链接按钮。模型里的 item `type` 只作为旧数据兼容字段，不应重新暴露成用户必选类型。

Workspace 片段可以填写可选 name，对应模型字段 `WorkspaceItem.title`。空 name 是合法状态，sanitize 时必须保留为空，不要自动补成“新片段”之类的默认标题。

Popup 和 Side Panel 共享同一份 Env Workspace 和 Global Workspace。Popup 可以完整编辑，但 Side Panel 是更适合长时间打开和窄长布局的工作台；不要为了 Side Panel 复制一套独立数据模型。

Background 刷新 DNR 规则时不能用刷新开始时读取的旧 state 整体写回 storage，否则会覆盖 Popup / Side Panel 同时新增的 workspace items、todos 或 notes。写回规则刷新结果前应重新读取最新 state，并只合并规则刷新产物，例如 `ruleMeta`、reconciled `groupBindings` 和 Env 的 `linkedGroupKeys`。

Popup / Side Panel 详情区应把 Rules / Filters 作为视觉顺序的第一个 tab，Workspace 作为第二个 tab；首次打开默认选中 Rules / Filters，但关闭前如果选中了 Workspace，重新打开应恢复 Workspace。Env 名称、全局生效、绑定 Tab Group、复制和删除等低频操作收在 Rules / Filters tab 内的环境设置里，Workspace tab 只保留工作区内容。不要把「当前页面诊断」作为详情区卡片恢复回来，顶部命中状态已经承担快速反馈职责。

Popup / Side Panel 中会触发保存、刷新规则或 storage reload 的文本输入必须兼容中文输入法等 IME composition。不要在 composition 过程中把中间值提交到全局 state / storage；应先保存在输入框本地 draft，composition end 或 blur 后再提交，否则输入法会被重新渲染打断。

## Query 与 Cookie 风险更高

Queries 在当前 MVP 只支持 Replace 语义，使用 Chrome DNR `queryTransform.addOrReplaceParams`：参数缺失则新增，已存在则替换。不要在 UI 或模型中暴露 Append / Keep，除非重新设计并验证 Chrome 能力边界。Cookie 修改涉及登录态和鉴权，不进入当前 MVP，后续实现时需要更严格的权限、回滚和用户确认设计。

## Codex 集成不是 MVP 主路径

Codex Skill 或 Hook 只能作为低优先级辅助入口。插件不应依赖 Codex App 当前对话状态，也不应依赖 Codex Chrome Extension 的内部能力。
