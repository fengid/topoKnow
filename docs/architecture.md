# Architecture

## Frontend (React 18 + TypeScript)
- **State Management**: Zustand — `src/store/index.ts`（Theme、UI、AI Generation 状态）、`src/store/modelStore.ts`（模型选择）
- **Data Fetching**: TanStack Query（`@tanstack/react-query`）
- **Visualization**: React Flow + Dagre 自动布局 — `src/pages/TreePage.tsx`
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS（Obsidian Luxe 风格，明暗主题）

**Pages:**
- `src/pages/HomePage.tsx` — 首页，主题输入
- `src/pages/TreePage.tsx` — 知识树画布（React Flow）
- `src/pages/MyTreesPage.tsx` — 图谱列表
- `src/pages/SettingsPage.tsx` — AI 模型设置
- `src/pages/DatabasePage.tsx` — 数据管理后台（Trees/Nodes/Questions/Articles/Prompts）

**Key Components:**
- `src/features/tree/components/CustomNode.tsx` — 自定义节点组件
- `src/components/NodeFullscreenModal.tsx` — 节点详情弹窗（Info/Article/Questions 三个标签页）
- `src/components/ModelSelector.tsx` — AI 模型选择器

**Services:** 按领域拆分的 API 客户端
- `src/services/treeApi.ts`、`nodeApi.ts`、`questionApi.ts`、`modelApi.ts`、`databaseApi.ts`

## Backend (Go 1.25 + Gin)
- **Framework**: Gin
- **ORM**: GORM v2 + PostgreSQL
- **Auth**: 无认证（公开访问）
- **AI Integration**: 多 Provider 支持 — `internal/service/ai_client.go`（OpenAI/Claude/MiniMax 三种客户端）、`ai_factory.go`（懒加载 + 缓存的客户端工厂）

**Supported AI Providers:** GLM、MiniMax、OpenAI、Claude

**Layer Structure:**
- `cmd/server/main.go` — 入口
- `internal/server/server.go` — 路由注册与依赖组装
- `internal/handler/` — HTTP 处理层（tree、node、ai、article、question、prompt）
- `internal/service/` — 业务逻辑层
  - `ai_service.go` — AI 核心服务（节点生成、文章生成、练习题生成）
  - `ai_client.go` — 多 Provider 客户端实现
  - `ai_factory.go` — 多模型工厂
  - `prompt.go` — 提示词模板管理（CRUD + AI 生成/优化）
  - `node_context.go` — 节点上下文查询（祖先路径、兄弟节点，递归 CTE）
- `internal/repository/` — 数据访问层（Tree、Node、Question、Article、Prompt）
- `internal/model/` — 数据模型（entity.go + dto.go + prompt.go）
- `internal/pkg/` — 工具包（Logger、Response、HandlerHelper）

## Data Models
- **Tree** — 知识图谱（root_topic、description）
- **Node** — 知识节点（topic、description、importance、difficulty、depth、parent/child）
- **Question** — 练习题（question、answer、tags）
- **Article** — 学习文章（title、content，Markdown 格式，每节点一篇）
- **Prompt** — 提示词模板（name、category、template、variables、version）

## Design Notes

- AI 提示词模板存储在数据库中，启动时自动同步默认模板（`PromptService.InitDefaultPrompts`）
- AI Service 使用 `getDepthStrategy` 根据节点深度调整生成策略：
  - 第 1 层：核心知识大类（MECE 原则）
  - 第 2 层：具体子领域或核心模块
  - 第 3 层：具体知识点（可直接出题）
  - 第 4 层+：深入细节、边界情况、实战场景
- Node context service 通过递归 CTE 查询获取祖先路径，避免 N+1 问题
- 文章和练习题生成时会注入祖先路径和兄弟节点信息作为上下文
