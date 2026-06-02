# 批量生成队列分组优化设计

## 背景

批量生成队列面板按 `item.layer` 分组显示任务。后端 `enqueueNextLayerLocked` 中，文章生成任务 `layer=currentLayer`，下一层节点生成 `layer=nextLayer`。这导致相邻两层显示相同节点主题（文章和展开操作引用同一批子节点），用户困惑。

## 方案

按节点所在树层分组。对同一层树节点的所有操作（生成节点、生成文章、展开子节点）归入同一显示组。

## 数据模型变更

### QueueItem 新增 tree_depth 字段

```go
type QueueItem struct {
    // ...existing fields...
    Layer      int  `json:"layer"`       // 处理波次（不变）
    TreeDepth  int  `json:"tree_depth"`  // 节点所在树层（新增）
}
```

- `layer`：后端处理波次，用于 layerGroup 完成追踪，不变
- `tree_depth`：该操作涉及的树深度，用于前端显示分组

### tree_depth 赋值规则

| 位置 | 场景 | tree_depth |
|------|------|------------|
| `Start` | 初始 generate_nodes（根节点展开） | 1 |
| `enqueueNextLayerLocked` | 文章生成 | currentLayer |
| `enqueueNextLayerLocked` | 展开子节点 | currentLayer |

示例（layers=2）：

| item | layer | tree_depth | 说明 |
|------|-------|------------|------|
| generate_nodes(root) | 1 | 1 | 创建第 1 层节点 |
| generate_article(depth-1) × 5 | 1 | 1 | 为第 1 层节点生成文章 |
| generate_nodes(depth-1) × 5 | 2 | 1 | 展开第 1 层节点 |
| generate_article(depth-2) × N | 2 | 2 | 为第 2 层节点生成文章 |
| generate_nodes(depth-2) × N | 3 | 2 | 展开第 2 层节点 |

## 前端变更

### QueueList 分组

按 `item.tree_depth` 分组，标签从 "Layer N" 改为 "第 N 层"。组内按 type 排序：`generate_nodes` 在前，`generate_article` 在后。

### QueueItemRow 显示

- `generate_nodes` 类型：初始项显示"生成节点"，后续项显示"展开子节点"
- `generate_article` 类型：显示"生成文章"（不变）
- 区分初始项和后续项：`item.layer === item.tree_depth` 为初始项（"生成节点"），否则为"展开子节点"

### TypeScript 类型

```typescript
interface QueueItem {
  // ...existing fields...
  tree_depth: number  // 新增
}
```

## 不变的部分

- 后端处理逻辑：worker 并发、layerGroup 完成追踪、SSE 事件广播
- 后端 `layer` 字段语义和处理流程
- 前端 SSE 事件处理（queue_update 已包含 new_items）
- 前端进度条、重试、取消等功能

## 影响范围

- `backend/internal/service/batch_gen.go`：QueueItem struct、Start、enqueueNextLayerLocked
- `frontend/src/types/batchGen.ts`：QueueItem 类型
- `frontend/src/features/tree/components/BatchGenPanel/QueueList.tsx`：分组逻辑
- `frontend/src/features/tree/components/BatchGenPanel/QueueItemRow.tsx`：显示标签
