# Browser Group Env PRD

## 1. 背景

用户在 Codex App 中会同时开发多个 worktree 分支。每个 worktree 往往对应一个开发任务、一个预发环境 HTTP Header，以及浏览器里同一个 Tab Group 下的多个页面。

当前问题是：浏览器登录态、Tab Group、预发 Header、Codex 对话上下文之间没有稳定绑定，容易出现以下错误：

- 当前页面仍然访问旧分支预发环境。
- Header 配错或忘记切换。
- 多个任务共享浏览器登录态时，环境上下文不清晰。
- 通过多个 Chrome Profile 隔离会导致重复登录，体验不可接受。

因此需要一个以 Chrome Tab Group 为上下文单位的浏览器插件，用同一个 Chrome Profile 共享登录态，同时为不同 Tab Group 注入不同 HTTP 上下文规则。

## 2. 产品目标

核心目标：

- 用户可以为每个预发环境创建一个 Env。
- 一个 Env 可以绑定一个或多个 Chrome Tab Group。
- 插件根据当前 Tab Group 对请求自动注入 Headers、Queries、Cookies 等规则。
- 规则只在配置的 Domain / Path 范围内生效，避免泄漏到无关网站。
- 用户可以暂停插件或关闭自动切换，保留手动控制能力。

非目标：

- 不做多个 Chrome Profile 隔离。
- 不替代代理工具或抓包工具。
- 不在第一版实现完整 Codex App UI 自动监听。
- 不依赖 Codex Chrome Extension 的内部能力。

## 3. 目标用户

主要用户：

- 使用 Codex App 多 worktree 并行开发的工程师。
- 需要通过 HTTP Header 访问不同预发分支环境的前端或全栈工程师。

典型工作方式：

- 一个开发任务对应一个 Codex 对话。
- 一个开发任务对应一个 worktree。
- 一个开发任务对应一个预发 Header。
- 一个开发任务对应浏览器中的一个或多个 Tab Group。

## 4. 核心概念

### 4.1 Env

Env 是插件内的主要配置实体，代表一个预发环境上下文。

一个 Env 包含：

- Env 名称。
- 是否启用。
- 绑定的 Tab Group 列表。
- Headers 规则。
- Queries 规则。
- Cookies 规则。
- Domain / Path 过滤器。
- 分享、导入、复制等元信息。

### 4.2 Tab Group

Tab Group 是 Chrome 原生标签组。插件不改变用户的浏览器组织方式，而是在 Tab Group 上附加 Env 绑定关系。

一个 Env 可以绑定多个 Tab Group，用于支持以下场景：

- 同一个预发环境有多个业务页面组。
- 同一个任务在多个窗口中分别打开不同页面。
- 用户希望把调试页和主流程页分成不同 Tab Group，但共用同一套 Header。

### 4.3 自动切换

自动切换开启时，插件根据当前 active tab 所在 Tab Group 自动切换右侧详情展示的 Env，并应用对应规则。

自动切换关闭时，用户可以手动查看和编辑任意 Env，浏览器焦点变化不会打断编辑。

## 5. 页面结构

插件主界面采用左右布局。

```text
----------------------------------------------------------------------------+
| Browser Group Env                              Active   Auto Switch |
+----------------------------+-----------------------------------------------+
| Environments               | Env Detail                                    |
|                            |                                               |
| > Checkout Fix             | Name                                          |
|   3 groups                 | [ Checkout Fix                          ]    |
|   2 headers · 1 cookie     |                                               |
|                            | Linked Tab Groups                             |
| > Search Refactor          | [Codex: checkout] [Pre: checkout] [+]        |
|   1 group                  |                                               |
|   1 header                 | Filters                                       |
|                            | Domains [*.example.org] [+]                  |
| > Empty State Fix          | Paths   [/commerce/*] [+]                    |
|   2 groups                 | Exclude [analytics.example.org] [+]          |
|                            |                                               |
| + New Env                  | Rules                                         |
|                            | [Headers] [Queries] [Cookies]                |
|                            |                                               |
|                            | Header Name      Value             Enabled   |
|                            | x-env-branch     feature/checkout  on        |
|                            | x-env-id         pre-1024          on        |
|                            |                                               |
|                            | [+ Header]                                    |
|                            |                                               |
|                            | [Duplicate] [Import] [Share]        [Delete] |
+----------------------------+-----------------------------------------------+
```

## 6. 顶部区域

顶部包含两个全局控制：

### 6.1 插件启用 / 暂停

状态：

- Active：插件正常生效。
- Paused：插件不注入任何规则，但保留所有配置。

行为：

- 从 Active 切到 Paused 时，立即移除所有动态注入规则。
- 从 Paused 切回 Active 时，重新根据当前 Tab Group 应用规则。

### 6.2 自动切换

状态：

- Auto：根据当前 active tab group 自动切换 Env。
- Manual：保持用户当前选中的 Env，不跟随浏览器焦点变化。

行为：

- Auto 模式下，用户切换 Tab Group 后，左侧列表高亮对应 Env，右侧详情自动切换。
- Manual 模式下，规则仍然可以生效，但详情面板不自动跳转。

## 7. 左侧 Env 列表

左侧展示所有 Env。

每个 Env 列表项展示：

- Env 名称。
- 绑定的 Tab Group 数量。
- 规则摘要，例如 `2 headers · 1 cookie`。
- 是否为当前 active tab group 对应 Env。
- 是否启用。

列表底部提供 `New Env` 按钮。

### 7.1 新增 Env

点击 `New Env` 时：

- Env 名称默认使用当前 Tab Group 名称。
- 如果当前 Tab 不在 Tab Group 中，则使用当前页面域名或 `New Env`。
- 默认绑定当前 Tab Group。
- 默认 Domain filter 使用当前页面 hostname。
- 默认不创建 Header / Query / Cookie 规则。
- 如果没有 Domain filter，不允许启用该 Env。

## 8. 右侧 Env 详情

右侧用于查看和编辑当前 Env。

### 8.1 基础信息

字段：

- Env 名称。
- Env 启用开关。
- 绑定的 Tab Group。

行为：

- Env 名称默认跟随首次绑定的 Tab Group 名称。
- 用户可以手动修改 Env 名称。
- 绑定 Tab Group 时支持多选已有 Tab Group。
- 删除某个绑定不会删除 Tab Group 本身。

### 8.2 过滤器

过滤器是一等配置，用于避免 Header 泄漏。

字段：

- Domains：允许生效的域名或通配域名。
- Paths：允许生效的路径。
- Excluded Domains：明确排除的域名。

规则：

- 没有 Domain filter 时，Env 不允许启用。
- Excluded Domains 优先级高于 Domains。
- Paths 为空时表示 Domain 下全部路径。

示例：

```text
Domains:
  *.example.org
  pre.example.com

Paths:
  /commerce/*
  /api/*

Excluded Domains:
  sso.example.org
  analytics.example.org
```

### 8.3 Headers

Headers 是 MVP 的核心规则类型。

每条 Header 规则包含：

- Enabled。
- Name。
- Value。
- 可选描述。

行为：

- Header 只在 Env 绑定的 Tab Group 内生效。
- Header 只在过滤器命中时生效。
- 同名 Header 冲突时，Env 内后定义规则覆盖前定义规则。

### 8.4 Queries

Queries 用于自动为请求 URL 附加查询参数。

每条 Query 规则包含：

- Enabled。
- Key。
- Value。
- 覆盖策略。

覆盖策略：

- Append：已有同名参数时追加。
- Replace：已有同名参数时替换。
- Keep：已有同名参数时不修改。

Queries 可作为第二阶段能力，不阻塞 MVP。

### 8.5 Cookies

Cookies 用于为指定 Domain 写入 Cookie。

每条 Cookie 规则包含：

- Enabled。
- Name。
- Value。
- Domain。
- Path。
- SameSite。
- Secure。
- Expiration。

Cookies 风险比 Headers 更高，第一版可以只做配置模型和 UI 占位，实际写入放到后续版本。

## 9. 操作按钮

### 9.1 Duplicate

复制当前 Env。

默认行为：

- 名称追加 `Copy`。
- 复制过滤器和规则。
- 不复制绑定的 Tab Group，避免两个 Env 同时绑定同一组导致冲突。

### 9.2 Delete

删除当前 Env。

行为：

- 删除前弹出确认。
- 如果当前 Env 绑定了 active Tab Group，提示删除后该组将不再注入规则。
- 删除后立即移除对应动态规则。

### 9.3 Share

导出当前 Env 为 JSON。

导出时提供两个模式：

- Full：完整导出。
- Redacted：敏感值脱敏。

### 9.4 Import

从 JSON 导入 Env。

冲突处理：

- Duplicate：作为新 Env 导入。
- Replace：替换同名 Env。
- Merge：合并规则，保留现有绑定。

## 10. MVP 范围

MVP 必须包含：

- 现代化前端工程栈实现，不使用零散原生 JS 手写插件 UI。
- 全局 Active / Paused。
- Auto Switch / Manual。
- Env 列表。
- 新增 Env。
- Env 绑定一个或多个 Tab Group。
- Headers 规则。
- Domain / Path / Excluded Domain 过滤器。
- Duplicate。
- Delete。
- Share。
- Import。
- 当前页面是否命中规则的状态展示。

MVP 暂不包含：

- Queries 实际注入。
- Cookies 实际写入。
- Codex Skill 主动切换 Tab Group。
- Codex Hook 自动切换。
- 远程同步。
- 团队权限管理。

## 11. 成功指标

体验指标：

- 用户能在 30 秒内为当前 Tab Group 创建 Env 并注入 Header。
- 用户能清晰知道当前页面是否命中 Env 规则。
- 用户能在同一个 Chrome Profile 内同时维护多个预发环境。

质量指标：

- 不向未命中的 Domain 注入 Header。
- 切换 Tab Group 后动态规则正确更新。
- 删除或暂停后规则立即失效。
- 多个 Tab Group 绑定同一个 Env 时行为一致。

## 12. 风险

主要风险：

- Chrome `declarativeNetRequest` 动态规则数量限制。
- Tab Group ID 在浏览器重启后可能变化，需要用窗口、标题、标签页 URL 等信息恢复绑定。
- Query 和 Cookie 修改能力比 Header 更复杂，可能需要拆阶段。
- 同一个 Tab 同时匹配多个 Env 时需要明确冲突策略。

默认冲突策略：

- 一个 Tab Group 同时只能绑定一个 active Env。
- 一个 Env 可以绑定多个 Tab Group。
- Header 同名冲突时，以 Env 内最后一条 enabled 规则为准。
