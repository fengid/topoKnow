# API Reference

## Trees

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trees` | 图谱列表 |
| POST | `/api/trees` | 创建图谱（自动生成根节点） |
| GET | `/api/trees/:id` | 图谱详情（含根节点和所有节点） |
| DELETE | `/api/trees/:id` | 删除图谱 |

## Nodes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/nodes` | 节点列表 |
| POST | `/api/nodes` | 手动创建节点 |
| GET | `/api/nodes/:id` | 节点详情 |
| PUT | `/api/nodes/:id` | 更新节点 |
| DELETE | `/api/nodes/:id` | 删除节点 |
| GET | `/api/nodes/:id/children` | 子节点列表 |
| POST | `/api/nodes/:id/expand` | AI 展开节点（生成子节点） |
| PATCH | `/api/nodes/:id/expanded` | 切换展开/折叠 |
| DELETE | `/api/nodes/:id/children` | 删除所有子节点 |
| GET | `/api/nodes/:id/article` | 获取节点文章 |
| POST | `/api/nodes/:id/article` | AI 生成文章 |
| DELETE | `/api/nodes/:id/article` | 删除文章 |
| POST | `/api/nodes/:id/article/regenerate` | 重新生成文章 |
| GET | `/api/nodes/:id/questions` | 获取练习题列表 |
| POST | `/api/nodes/:id/questions` | AI 生成练习题 |

## Questions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/questions` | 全部练习题 |
| DELETE | `/api/questions/:id` | 删除练习题 |

## Articles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/articles` | 全部文章 |
| DELETE | `/api/articles/:id` | 删除文章 |

## AI

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ai/models` | 可用模型列表 |
| POST | `/api/ai/generate-path` | 生成学习路径 |
| POST | `/api/ai/generate-quiz` | 生成练习题 |
| POST | `/api/ai/explain-node` | 解释节点 |

## Prompts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prompts` | 提示词列表 |
| GET | `/api/prompts/:id` | 提示词详情 |
| GET | `/api/prompts/name/:name` | 按名称查询 |
| GET | `/api/prompts/category/:category` | 按分类查询 |
| GET | `/api/prompts/init` | 初始化默认提示词 |
| POST | `/api/prompts` | 创建提示词 |
| PUT | `/api/prompts/:id` | 更新提示词 |
| DELETE | `/api/prompts/:id` | 删除提示词（软删除） |
| POST | `/api/prompts/render` | 渲染提示词模板 |
| POST | `/api/prompts/generate` | AI 生成新提示词 |
| POST | `/api/prompts/:id/optimize` | AI 优化提示词 |
