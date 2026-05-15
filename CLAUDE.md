# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TopoKnow — AI 知识拓扑学习平台。用户输入学习主题，AI 自动生成结构化知识图谱，支持交互式树形可视化、节点展开、文章生成与练习题生成。

**Ports:** Frontend 6010 · Backend 6011

## Quick Start

**IMPORTANT: Always use Docker for running and testing the application.**

```bash
docker compose up -d --build    # Start all services
docker compose logs -f          # View logs
docker compose down             # Stop
```

Docker services: frontend (6010), backend (6011), postgres (5432), redis (6379)

## Key Conventions

- **No authentication** — all endpoints are publicly accessible
- **AI multi-provider** — supported providers: GLM, MiniMax, OpenAI, Claude. Client factory with lazy-load + cache in `internal/service/ai_factory.go`
- **Prompt templates in DB** — stored in `prompts` table, auto-synced on startup via `PromptService.InitDefaultPrompts`. Templates use `{{variable}}` placeholders
- **Depth-aware generation** — `getDepthStrategy` adjusts AI output by node depth (L1: categories → L2: sub-fields → L3: specific topics → L4+: deep details)
- **Node context** — ancestor path (recursive CTE) and sibling info injected into AI prompts for articles and questions
- **Frontend proxy** — `vite.config.ts` forwards `/api` to backend
- **No mock data** — AI service returns errors when API key is not configured

## Backend Structure

```
cmd/server/main.go          → Entry point
internal/server/server.go   → Router setup, DI assembly
internal/handler/           → HTTP handlers (tree, node, ai, article, question, prompt)
internal/service/           → Business logic
  ai_service.go             → Core AI generation (nodes, articles, questions)
  ai_client.go              → OpenAI / Claude / MiniMax client implementations
  ai_factory.go             → Multi-model factory
  prompt.go                 → Prompt template CRUD + AI generate/optimize
  node_context.go           → Ancestor & sibling queries (recursive CTE)
internal/repository/        → Data access (GORM)
internal/model/             → Entities (entity.go, dto.go, prompt.go)
internal/pkg/               → Utilities (Logger, Response, HandlerHelper)
```

## Frontend Structure

```
src/pages/          → HomePage, TreePage, MyTreesPage, SettingsPage, DatabasePage
src/features/       → Feature modules (tree/, node/, database/)
src/components/     → Shared components (NodeFullscreenModal, ModelSelector, Navbar)
src/services/       → API clients by domain (treeApi, nodeApi, questionApi, modelApi, databaseApi)
src/store/          → Zustand stores (index.ts: theme/UI/gen state, modelStore.ts: model selection)
src/types/          → TypeScript interfaces
src/utils/          → Layout algorithm (dagre)
```

## References

- [Architecture & Data Models](docs/architecture.md)
- [API Reference](docs/api-reference.md)
