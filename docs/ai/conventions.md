# Conventions

## Language

- 项目文档、注释和提交信息默认使用中文。
- 代码命名使用英文，保持 TypeScript 生态常规风格。

## Frontend Stack

- 使用 WXT + React + TypeScript，不使用零散原生 JS 手写插件 UI。
- Popup UI 使用 React 组件组织。
- 样式使用 Tailwind CSS。
- Dialog、Popover、Tabs、Switch、Tooltip 等交互优先使用 Radix UI primitives。
- 图标优先使用 lucide-react。

## UI Copy And I18n

- Popup 面向中英文用户，新增或修改可见文案时必须同时维护中文和英文。
- 可见文案不要散落在 JSX 中，优先放入 popup 的 i18n 字典或后续统一的文案模块。
- 状态、空态、按钮、确认弹窗、诊断原因等用户可见文本都属于 i18n 范围。
- 示例域名、占位文案和测试数据使用 `example.com`、`example.org` 等通用保留域名，不要写入真实公司、产品或内部系统标识。
- Popup 内的删除等确认交互使用应用内轻量弹窗，不使用浏览器原生 `confirm`。
- 内部模型字段、Chrome API 字段、DNR 规则字段保持英文命名，不为展示文案反向修改数据模型。

## Branding And Icon

- 浏览器工具栏 icon 使用“叠层窗口 + ENV 前景文字”的隐喻，表达标签组映射到环境配置。
- Manifest 静态 icon 和 Background 动态 action icon 应保持同一视觉隐喻，避免扩展管理页出现默认占位图标。
- Popup 和 Background 动态 action icon 的最前窗口应使用当前 Chrome Tab Group 的颜色，前景文字固定显示 `ENV`。
- 前景窗口控制点位于左上角，固定使用红、橙黄、绿三个圆点；`ENV` 使用标准粗体字形，不手动画笔画。
- icon 图形应尽量减少四周透明留白，保证 Chrome 工具栏 16px 尺寸下主体足够大。
- 启用态主色为蓝色，插件完全关闭时图标切换为灰色；不要回退到与 Tab Group / Env 无关的抽象图形。
- 不使用 Chrome action badge 展示 Env 文案；badge 位置不可控，会遮挡 icon。

## State And Validation

- Popup 局部状态使用 Zustand。
- 表单使用 React Hook Form。
- Env、Import JSON、Filter、Rule 等输入必须通过 Zod 校验。
- `src/model/*` 中的规则编译、过滤器匹配、导入导出逻辑应写成纯函数，便于单测。

## Chrome Extension Boundaries

- UI 层不要直接散落调用 `chrome.*`，统一通过 `src/extension/*` 封装。
- DNR session rules 只由 Background service worker 更新。
- 全局 Paused 时必须移除插件已安装的全部动态规则，但不删除用户配置。
- Env 没有 Domain filter 时不允许启用。

## Testing

- 用 Vitest 覆盖 Filter 匹配、DNR rule 编译、Import / Share 格式处理。
- 用 Playwright 或等价浏览器自动化覆盖关键插件流程。
- Header 注入至少覆盖：命中 Domain、不命中 Domain、Paused、Env disabled、Tab 不在 Group、多 Group 绑定同一 Env。
- 完成一次完整代码改动后，收尾必须重新执行 `npm run build`，确认 `output/chrome-mv3` 产物可更新。
- 不要机械地对每次小改动都重跑 `npm run typecheck` 和 `npm test`。当改动只涉及文案、样式或图标微调，且 `npm run build` 已能覆盖编译和产物更新时，可以只跑 build；涉及模型、规则编译、Chrome API、类型签名或测试覆盖面变化时再补 typecheck/test。

## Documentation

- 公开仓库的产品说明和使用说明优先维护在 `README.md` / `README.zh-CN.md`。
- 若后续需要长期产品或架构文档，使用 `docs/` 下的公开版文档，内容必须只描述当前能力和通用场景。
- 发现稳定项目知识时更新 `docs/ai/`。
- 长期技术决策和被拒绝的重要方案写入 `docs/adr/`。

## Public Release Hygiene

- 面向公开仓库发布前，必须同时扫描当前工作树和 Git 历史中的内部域名、公司名、私有 registry、真实业务 Header、真实产品名和密钥形态字符串。
- 如果 Git 历史曾包含内部信息，不要直接把原有历史推送到公开 GitHub；应先创建干净历史的发布分支，或明确执行历史重写后再发布。
- `package-lock.json` 中的 `resolved` 地址必须使用公开 npm registry，不要保留公司私有 registry 地址。
