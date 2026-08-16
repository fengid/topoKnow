# TopoKnow 移动端

TopoKnow 的独立移动端版本，**不复用 Web 端任何页面代码**，全新实现的移动优先 UI。

## 页面一览（覆盖 Web 端全部功能）

| 移动端页面 | 路由 | 对应 Web 端 |
|---|---|---|
| 首页（主题输入 / 模式选择 / 快捷主题） | `#/` | HomePage |
| 我的图谱（列表 / 删除） | `#/trees` | MyTreesPage |
| 知识树下钻浏览（面包屑 + 子节点列表 + AI 展开 + 批量生成） | `#/tree/:id` | TreePage（ReactFlow 画布 → 移动端下钻导航） |
| 节点详情（概览 / 文章 / 练习） | `#/node/:id` | NodeFullscreenModal |
| 数据库管理（5 张表 / 搜索 / 分页 / 批量删除） | `#/database` | DatabasePage |
| 设置（模型选择 / 主题外观） | `#/settings` | SettingsPage |

## 技术栈

- React 18 + TypeScript + Vite（独立工程，不依赖 frontend/）
- 原生 CSS 设计系统（明暗双主题、底部 Tab、安全区适配）
- @tanstack/react-query + axios
- zustand（模型选择持久化、主题）
- react-markdown（文章渲染）
- SSE 订阅批量生成进度（与 Web 端同一后端接口）

## 本地开发

```bash
cd mobile
npm install
npm run dev        # http://localhost:6012，/api 代理到 6011 后端
```

## Docker

```bash
docker compose up -d --build mobile   # 端口 6012
```

与 Web 端共用同一个后端（6011）与数据库，数据完全互通。
