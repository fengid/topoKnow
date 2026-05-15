# TopoKnow — AI 知识拓扑学习平台

输入一个学习主题（如「前端工程师」「Go 开发」），AI 自动生成结构化知识图谱，支持交互式树形探索、节点文章生成与练习题生成。

## 功能特性

- **AI 知识图谱生成** — 输入主题，自动构建多层级知识树，支持逐节点展开
- **交互式树形可视化** — 基于 React Flow 的拖拽、缩放、折叠画布，支持重要性/难度标注
- **智能文章生成** — 为每个知识节点生成 1000-4000 字的深度学习文章，包含祖先路径和兄弟节点上下文
- **练习题生成** — 按节点生成练习题，自动去重，支持多级难度
- **多 AI 模型支持** — 支持 GLM、MiniMax、OpenAI、Claude 等多个 Provider，前端可切换模型
- **提示词管理** — 内置提示词模板系统，支持 AI 生成、优化、版本管理
- **数据管理后台** — 独立的 Database 页面管理 Trees、Nodes、Questions、Articles、Prompts
- **明暗主题** — 跟随系统或手动切换，Obsidian Luxe 视觉风格

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + TypeScript + Vite |
| 状态管理 | Zustand |
| 数据请求 | TanStack React Query |
| 可视化 | React Flow + Dagre 自动布局 |
| 动画 | Framer Motion |
| 样式 | Tailwind CSS |
| 后端 | Go 1.25 + Gin |
| ORM | GORM v2 |
| 数据库 | PostgreSQL 15 |
| 缓存 | Redis 7（可选） |
| 容器化 | Docker Compose |

## 快速启动

### 前置条件

- Docker & Docker Compose

### 启动

```bash
# 1. 编辑 backend/config.yaml，填入 AI API Key（至少配置一个 Provider）

# 2. 启动所有服务
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

启动后访问：

- 前端：http://localhost:6010
- 后端：http://localhost:6011
- 健康检查：http://localhost:6011/health

## 配置说明

编辑 `backend/config.yaml`：

```yaml
# AI Configuration (Multi-Provider)
ai:
  default_model: "glm-5.1"
  models:
    - id: "glm-5.1"
      provider: "glm"
      display_name: "GLM-5.1"
      max_tokens: 10000
      temperature: 0.3
  providers:
    glm:
      api_key: "your-glm-api-key"
      base_url: "https://open.bigmodel.cn/api/coding/paas/v4"
```

支持的 Provider：`glm`、`minimax`、`openai`、`claude`。只需配置对应 Provider 的 `api_key` 即可启用。完整配置参考 `backend/config.example.yaml`。

## 项目结构

```
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   │   ├── HomePage.tsx        # 首页（主题输入）
│   │   │   ├── TreePage.tsx        # 知识树画布
│   │   │   ├── MyTreesPage.tsx     # 我的图谱列表
│   │   │   ├── DatabasePage.tsx    # 数据管理后台
│   │   │   └── SettingsPage.tsx    # AI 模型设置
│   │   ├── features/
│   │   │   ├── tree/               # 树相关组件（CustomNode）
│   │   │   ├── node/               # 节点组件（Markdown 渲染等）
│   │   │   └── database/           # 数据管理功能
│   │   ├── components/         # 共享组件
│   │   │   ├── NodeFullscreenModal.tsx  # 节点详情弹窗
│   │   │   └── fullscreen/         # 弹窗子标签页
│   │   ├── services/           # API 客户端层
│   │   ├── store/              # Zustand 状态管理
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── types/              # TypeScript 类型定义
│   │   └── utils/              # 工具函数（布局算法等）
│   └── vite.config.ts          # Vite 配置（含 API 代理）
│
├── backend/                    # Go 后端
│   ├── cmd/server/main.go          # 入口
│   └── internal/
│       ├── config/                 # 配置加载
│       ├── handler/                # HTTP 处理层（Tree、Node、AI、Article、Question、Prompt）
│       ├── service/                # 业务逻辑层
│       │   ├── ai_client.go            # AI 客户端（OpenAI/Claude/MiniMax）
│       │   ├── ai_factory.go            # 多模型工厂
│       │   ├── ai_service.go            # AI 服务（生成节点、文章、练习题）
│       │   ├── node_context.go          # 节点上下文查询（祖先路径、兄弟节点）
│       │   └── prompt.go                # 提示词模板管理
│       ├── repository/             # 数据访问层（GORM）
│       ├── model/                  # 数据模型（Entity + DTO）
│       ├── server/                 # 路由注册与服务器初始化
│       └── pkg/                    # 工具包（Logger、Response、HandlerHelper）
│
└── docker-compose.yml          # 容器编排
```

## API 概览

### Trees

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/trees` | 获取图谱列表 |
| POST | `/api/trees` | 创建图谱（自动生成根节点） |
| GET | `/api/trees/:id` | 获取图谱详情（含根节点和所有节点） |
| DELETE | `/api/trees/:id` | 删除图谱 |

### Nodes

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/nodes/:id` | 获取节点详情 |
| POST | `/api/nodes/:id/expand` | AI 展开节点（生成子节点） |
| PATCH | `/api/nodes/:id/expanded` | 切换展开/折叠状态 |
| DELETE | `/api/nodes/:id/children` | 删除所有子节点 |
| GET | `/api/nodes/:id/article` | 获取节点文章 |
| POST | `/api/nodes/:id/article` | AI 生成文章 |
| GET | `/api/nodes/:id/questions` | 获取节点练习题 |
| POST | `/api/nodes/:id/questions` | AI 生成练习题 |

### AI & Prompts

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai/models` | 获取可用模型列表 |
| GET | `/api/prompts` | 提示词列表 |
| POST | `/api/prompts` | 创建提示词 |
| PUT | `/api/prompts/:id` | 更新提示词 |
| POST | `/api/prompts/generate` | AI 生成提示词 |
| POST | `/api/prompts/:id/optimize` | AI 优化提示词 |

## 数据模型

```
Tree ──1:N──> Node ──1:N──> Question
                   │
                   └──1:1──> Article
```

- **Tree** — 知识图谱（root_topic、description）
- **Node** — 知识节点（topic、description、importance、difficulty、depth、parent/child）
- **Question** — 练习题（question、answer、tags）
- **Article** — 学习文章（title、content，Markdown 格式）
- **Prompt** — 提示词模板（name、category、template、version）

## 端口

| 服务 | 端口 |
|------|------|
| 前端 | 6010 |
| 后端 | 6011 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## License

MIT
