# 0001 使用 WXT React TypeScript 构建 Chrome MV3 插件

Date: 2026-05-15

## Status

Accepted

## Context

Browser Group Env 需要实现 Chrome 插件 Popup UI、Background service worker、Chrome API 封装和规则编译。UI 包含 Env 列表、详情、规则编辑、导入导出和状态诊断，后续复杂度会持续增长。

项目要求使用现代化前端技术栈，而不是零散原生 JS 手写插件 UI。

## Decision

使用以下技术栈：

- WXT + Vite + TypeScript 构建 Manifest V3 插件工程。
- React 构建 Popup UI。
- Tailwind CSS + Radix UI primitives 构建界面和交互。
- Zustand 管理 Popup 状态。
- React Hook Form + Zod 管理表单和校验。
- Vitest 和 Playwright 覆盖单测与浏览器流程验证。

## Consequences

正向影响：

- WXT 负责插件多入口、manifest 生成和构建流程，减少手写 MV3 工程样板。
- React + TypeScript 更适合复杂规则编辑和状态诊断 UI。
- Model 层可以用纯函数组织，便于测试 DNR rule 编译和过滤器匹配。

代价：

- 需要维护前端构建依赖。
- 插件工程比纯原生 JS 更重。

## Rejected Options

- 纯原生 JS + 手写 DOM：短期简单，但规则编辑、导入导出和状态诊断扩展后维护成本高。
- Next.js：插件 popup、options 和 background 不是服务端渲染应用，Next.js 的运行模型不匹配。
- 一个任务一个 Chrome Profile：登录态重复成本高，违背项目以同一个 Chrome Profile 共享登录态的核心目标。
