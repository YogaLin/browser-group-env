# Browser Group Env

[English](./README.md)

Browser Group Env 是一个 Chrome 扩展，用于把开发环境规则绑定到 Chrome 标签组。

它适合需要同时处理多个任务、分支或预览环境的开发场景：你可以继续使用同一个 Chrome Profile 和登录态，同时用标签组隔离不同环境的请求规则。

## 功能

- 创建和编辑环境配置。
- 将环境绑定到一个或多个 Chrome 标签组。
- 将环境设置为始终生效，不依赖标签组。
- 通过域名、路径和排除域名过滤条件注入请求头。
- 通过 Chrome Declarative Net Request 规则替换查询参数。
- 管理可复用的配置模板。
- 应用模板时，支持用 XPath 或 CSS selector 从当前页面读取请求头值。
- 在 popup 和工具栏图标中展示已启用、已暂停、已命中和未命中状态。

## 本地开发

```bash
npm install
npm run dev
```

构建可加载到 Chrome 的扩展产物：

```bash
npm run build
```

构建结果会输出到 `output/chrome-mv3`。

## 测试

```bash
npm run typecheck
npm test
```

## 在 Chrome 中加载

1. 执行 `npm run build`。
2. 打开 `chrome://extensions`。
3. 开启开发者模式。
4. 点击“加载已解压的扩展程序”。
5. 选择 `output/chrome-mv3`。

## 许可证

MIT
