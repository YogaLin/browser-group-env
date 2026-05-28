# AI 工作指南

此仓库为 AI 编码 agent 维护 durable project knowledge。

Latest project memory update: 2026-05-28

修改代码前，读取与任务相关的文件：

- docs/ai/project.md
- docs/ai/architecture.md
- docs/ai/conventions.md
- docs/ai/gotchas.md

完成有意义的编码任务后，检查本次工作是否揭示了 durable project knowledge。

如果有，更新 `docs/ai/` 或 `docs/adr/` 下的相关文件，并将上方最新项目记忆更新时间改为当前本地日期。只有当 durable memory 被新增、修正或删除时才更新日期。如果没有，在最终回复中说明无需更新项目记忆。

Durable knowledge 包括：

- 业务规则
- 架构边界
- 模块依赖
- 本地开发、测试或发布约定
- 集成约束
- 历史 bug 或脆弱区域
- 未来 agent 应保持的非显然行为

只有对长期有影响的决策才创建或更新 `docs/adr/`：

- 框架、数据库、运行时或托管方案选择
- 数据模型变更
- 服务边界
- 队列、缓存、搜索或认证决策
- 被拒绝方案也重要的重大权衡

不要记录：

- 临时任务笔记
- 聊天摘要
- 猜测
- 未经验证的结论
- 实现日志
