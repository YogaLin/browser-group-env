# Chrome Web Store 发布清单

Chrome Web Store 的类别、商店详情页说明、截图、隐私说明和分发设置属于开发者控制台元数据，不会从扩展包内的 `/_locales` 自动填充。扩展包内的 `chrome.i18n` 只负责 Manifest、CSS、JS 和扩展 UI 可见文案的本地化。

## 固定设置

- 类别：开发者工具
- 语言：English、简体中文
- 发布渠道：Chrome Web Store
- 上传包：`output/browser-group-env-<version>-chrome.zip`

## Store Listing - English

### Name

Browser Group Env

### Summary

Bind Chrome Tab Groups to development environment rules.

### Description

Browser Group Env helps developers keep multiple tasks, branches, or preview environments separated while using the same Chrome profile and login state.

Use Chrome Tab Groups as environment boundaries, then bind each group to request rules such as headers and query parameter replacements. Optional domain, path, and excluded-domain filters can further narrow where rules apply.

Key features:

- Create and edit environment configurations.
- Bind an environment to one or more Chrome Tab Groups.
- Mark an environment as always on, independent of Tab Groups.
- Add request headers with Chrome Declarative Net Request.
- Replace query parameters with Chrome Declarative Net Request.
- Manage reusable environment templates.
- Keep per-environment snippets, todos, and notes in the workspace.

## Store Listing - 简体中文

### 名称

Browser Group Env

### 简短说明

将 Chrome 标签组绑定到开发环境规则。

### 详细说明

Browser Group Env 帮助开发者在使用同一个 Chrome Profile 和登录态的同时，隔离多个任务、分支或预览环境。

你可以把 Chrome 标签组作为环境边界，并将每个标签组绑定到请求规则，例如请求头和查询参数替换。可选的域名、路径和排除域名过滤条件可进一步收窄规则生效范围。

主要功能：

- 创建和编辑环境配置。
- 将环境绑定到一个或多个 Chrome 标签组。
- 将环境设置为始终生效，不依赖标签组。
- 通过 Chrome Declarative Net Request 添加请求头。
- 通过 Chrome Declarative Net Request 替换查询参数。
- 管理可复用的环境模板。
- 在工作区记录每个环境的片段、待办和备注。

## 发布前检查

1. 确认 `main` 已包含要发布的提交。
2. 执行 `npm run test -- src/popup/popup-app.test.ts`。
3. 执行 `npm run typecheck`。
4. 确认 `package.json` 和 `package-lock.json` 里的版本号一致。
5. 执行 `npm run release`。
6. 上传 `output/browser-group-env-<version>-chrome.zip`。
7. 确认商店详情、隐私说明和截图没有被后台清空或标记为必填。

## GitHub Release

GitHub Release 的 tag、标题和 zip 文件名都从 `package.json.version` 派生，不要手写一套单独的版本号。

```bash
npm version <version> --no-git-tag-version
npm run release:github
```

`npm run release:github` 会使用：

- tag：`v<package.json.version>`
- asset：`output/browser-group-env-<package.json.version>-chrome.zip`

如果需要指定 release notes：

```bash
npm run release:github -- --notes-file /tmp/release-notes.md
```
