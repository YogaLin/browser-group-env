# Architecture

## Overview

Browser Group Env 是一个 Manifest V3 Chrome 插件。架构边界是：同一个 Chrome Profile 保持登录态共享；不同 Tab Group 绑定不同 Env；插件将 Env 编译为 Chrome DNR session rules，对对应 Tab Group 下的 tabIds 注入 Header。

```text
Chrome Profile
  |
  +-- Global Env -> headers / filters
  +-- Tab Group A -> Env A -> headers / filters
  +-- Tab Group B -> Env B -> headers / filters
  +-- Tab Group C -> Env A -> headers / filters
```

## Runtime

推荐技术栈：

- WXT + Vite + TypeScript 构建 MV3 插件工程。
- React 构建 Popup UI。
- Tailwind CSS + Radix UI primitives 构建界面和交互原语。
- lucide-react 用于图标。
- Zustand 管理 Popup 状态。
- React Hook Form + Zod 管理表单和校验。
- Vitest 覆盖纯函数和规则编译单测。
- Playwright 覆盖插件关键浏览器流程。

## Main Components

- `entrypoints/popup/*`：插件 Popup 入口，只处理 UI 和用户操作。
- `entrypoints/sidepanel/*`：Chrome Side Panel 入口，作为长驻 Env 工作台，适合编辑规则和 Workspace。
- `entrypoints/options/*`：插件独立配置页入口，当前复用 Popup UI，用于从 popup 打开模板管理等较重配置。
- `entrypoints/background.ts`：Background service worker，处理 Chrome 事件、状态同步和 DNR 编译调用。
- `src/extension/*`：Chrome API 封装，避免 UI 直接调用 `chrome.*`。
- `src/model/*`：Env、Filter、规则编译、导入导出和校验等纯逻辑。
- `src/components/*`：无业务副作用组件。

## Data Flow

```text
User edits Env in Popup
  -> validate form with Zod
  -> save GlobalState to chrome.storage.local
  -> background receives storage/event change
  -> resolve linked Tab Groups and tabIds
  -> compile Env filters and Header rules
  -> update declarativeNetRequest session rules
  -> matching requests receive headers
```

编辑 Workspace 时：

```text
User edits global snippets in Popup or Side Panel
  -> save GlobalState.globalWorkspace.items to chrome.storage.local
  -> background may refresh from storage change
  -> DNR compiler ignores workspace data

User edits env snippets / todos / notes in Popup or Side Panel
  -> save Env.workspace to chrome.storage.local
  -> background may refresh from storage change
  -> DNR compiler ignores workspace data
```

应用模板时：

```text
User applies Env Template
  -> Popup / Options asks src/extension to resolve template dynamic values
  -> chrome.scripting executes a small DOM reader in the source tab
  -> XPath / CSS values are copied into template header values
  -> applyTemplateToEnv writes ordinary filters and HeaderRule values
  -> background later compiles normal DNR rules
```

Options 页打开模板管理时会在 URL 中携带原始 active tab id，避免独立配置页成为 `chrome.tabs.query({ active: true })` 结果后，模板取值读到配置页自身。

暂停插件时：

```text
Active -> Paused
  -> remove all extension-owned DNR session rules
  -> keep stored Env config unchanged
  -> set action icon to disabled gray
```

自动切换只影响 Popup 当前选中的 Env，不应作为规则注入的依据。规则注入只依赖全局启用状态、Env 启用状态、生效范围、GroupBinding 和 Filters。Global Env 不依赖 GroupBinding，可与当前 Tab Group Env 同时生效。

浏览器工具栏图标由 Background service worker 在刷新规则时同步更新：当前 active Tab Group 有有效 Env，或存在有效 Global Env 时使用蓝色动态图标，并在 action badge 中展示该 Env 名称前缀；插件全局关闭、当前 group 无有效 Env 且没有有效 Global Env 时图标切换为灰色并清空 badge。

## External Integrations

- Chrome `tabs`：读取当前 Tab、URL、Window 信息。
- Chrome `tabGroups`：读取和聚焦 Tab Group。
- Chrome `storage.local`：保存 Env、绑定关系和全局配置。
- Chrome `declarativeNetRequest`：按 Tab IDs 和 URL 条件修改请求 Header。
- Chrome `scripting`：仅在应用模板时读取当前页面 DOM，用于解析模板请求头的 XPath / CSS 动态值。
- Chrome `sidePanel`：从 Popup 打开长驻工作台，保留 Popup 作为轻量入口。

第一版不依赖 Codex Chrome Extension 内部能力，不实现后端服务。

## Module Boundaries

- Header 注入必须统一由 Background service worker 的 DNR 编译逻辑负责。
- Popup 不直接操作 DNR rule，只提交配置变更。
- Env Workspace 和 Global Workspace 只属于 UI 辅助数据，不应进入 DNR 编译、模板运行时规则或 Header/Query 生效判断。
- `src/model/*` 应保持可测试，不依赖 Chrome runtime。
- Codex Skill 若后续加入，只作为外部触发入口，不直接实现 Header 注入。

## Open Questions

- DNR `urlFilter` 与 `regexFilter` 的具体编译边界需要结合 Chrome 限制实现和测试。
- Tab Group 恢复需要在浏览器重启场景下验证。
