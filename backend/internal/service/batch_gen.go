package service

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/logger"
	"topoknow-backend/internal/repository"

	"github.com/google/uuid"
)

// --- Queue item types ---

type ItemType string

const (
	ItemGenerateNodes   ItemType = "generate_nodes"
	ItemGenerateArticle ItemType = "generate_article"
)

type ItemStatus string

const (
	ItemPending   ItemStatus = "pending"
	ItemRunning   ItemStatus = "running"
	ItemCompleted ItemStatus = "completed"
	ItemFailed    ItemStatus = "failed"
)

// 重试与失败队列策略
const (
	maxWorkers     = 2
	maxRetries     = 2 // 每个 item 每轮最多重试次数（含首次共 3 次尝试）
	maxFailurePass = 1 // 主流程结束后对失败项最多再跑的轮数
)

// childNodeInfo 用于在生成子任务时传递子节点信息
type childNodeInfo struct {
	id    string
	topic string
}

// QueueItem represents a single task in the batch generation queue.
type QueueItem struct {
	ID           string     `json:"id"`
	TaskID       string     `json:"task_id"`
	Type         ItemType   `json:"type"`
	NodeID       string     `json:"node_id"`
	Layer        int        `json:"layer"`
	TreeDepth    int        `json:"tree_depth"`
	LayerGroup   string     `json:"layer_group"`
	ParentTopic  string     `json:"parent_topic,omitempty"`
	NodeTopic    string     `json:"node_topic,omitempty"`
	Status       ItemStatus `json:"status"`
	Error        string     `json:"error,omitempty"`
	NodesCreated int        `json:"nodes_created,omitempty"`
	RetryCount   int        `json:"retry_count,omitempty"`
	ModelID      string     `json:"-"`

	// ChildrenEnqueued 标记该 node-gen 项的子节点是否已被安排（文章+下一层）。
	// 用于保证“节点生成成功 ⇒ 恰好入队一次子节点”，无论首次/重试/失败轮。
	ChildrenEnqueued bool `json:"-"`
}

// BatchGenTask represents a batch generation task.
type BatchGenTask struct {
	ID             string    `json:"id"`
	TreeID         string    `json:"tree_id"`
	RootNodeID     string    `json:"root_node_id"`
	TargetLayers   int       `json:"target_layers"`
	ModelID        string    `json:"model_id"`
	Status         string    `json:"status"` // running, cancelled, completed
	CreatedAt      time.Time `json:"created_at"`
	TotalItems     int       `json:"total_items"`
	CompletedItems int       `json:"completed_items"`
	FailedItems    int       `json:"failed_items"`
}

type layerGroupProgress struct {
	Total     int
	Completed int
	Triggered bool
}

// SSEEvent is pushed to subscribers via SSE.
type SSEEvent struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
	EventID int64  `json:"event_id"`
}

// --- Service ---

type BatchGenService struct {
	aiService      *AIService
	nodeRepo       *repository.NodeRepository
	treeRepo       *repository.TreeRepository
	articleRepo    *repository.ArticleRepository
	nodeContextSvc *NodeContextService

	mu                sync.RWMutex
	activeTasks       map[string]*BatchGenTask       // treeID -> active task
	tasksByID         map[string]*BatchGenTask       // taskID -> task
	taskItems         map[string][]*QueueItem        // taskID -> ordered items
	layerGroups       map[string]*layerGroupProgress // groupKey -> progress
	failurePassCount  map[string]int                 // taskID -> 已执行的失败轮次数
	subscribers       map[string][]chan SSEEvent     // treeID -> subscriber channels
	eventCounter      int64
	groupSeq          int64 // group key 自增序号（保证唯一，避免失败轮级联碰撞）

	taskCh chan *QueueItem
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

func NewBatchGenService(
	aiService *AIService,
	nodeRepo *repository.NodeRepository,
	treeRepo *repository.TreeRepository,
	articleRepo *repository.ArticleRepository,
	nodeContextSvc *NodeContextService,
) *BatchGenService {
	ctx, cancel := context.WithCancel(context.Background())

	s := &BatchGenService{
		aiService:      aiService,
		nodeRepo:       nodeRepo,
		treeRepo:       treeRepo,
		articleRepo:    articleRepo,
		nodeContextSvc: nodeContextSvc,
		activeTasks:    make(map[string]*BatchGenTask),
		tasksByID:      make(map[string]*BatchGenTask),
		taskItems:      make(map[string][]*QueueItem),
		layerGroups:    make(map[string]*layerGroupProgress),
		failurePassCount: make(map[string]int),
		subscribers:    make(map[string][]chan SSEEvent),
		taskCh:         make(chan *QueueItem, 256),
		ctx:            ctx,
		cancel:         cancel,
	}

	for range maxWorkers {
		s.wg.Add(1)
		go s.worker()
	}

	return s
}

// Start creates and starts a new batch generation task.
func (s *BatchGenService) Start(treeID, rootNodeID string, layers int, modelID string) (*BatchGenTask, error) {
	if layers < 1 || layers > 5 {
		return nil, fmt.Errorf("layers must be between 1 and 5")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.activeTasks[treeID]; ok && existing.Status == "running" {
		return nil, fmt.Errorf("tree already has an active batch generation task")
	}

	task := &BatchGenTask{
		ID:           uuid.New().String(),
		TreeID:       treeID,
		RootNodeID:   rootNodeID,
		TargetLayers: layers,
		ModelID:      modelID,
		Status:       "running",
		CreatedAt:    time.Now(),
		TotalItems:   1,
	}

	s.activeTasks[treeID] = task
	s.tasksByID[task.ID] = task
	s.failurePassCount[task.ID] = 0

	groupKey := s.newGroupKey()
	s.layerGroups[groupKey] = &layerGroupProgress{Total: 1}

	item := &QueueItem{
		ID:         uuid.New().String(),
		TaskID:     task.ID,
		Type:       ItemGenerateNodes,
		NodeID:     rootNodeID,
		Layer:      1,
		TreeDepth:  1,
		LayerGroup: groupKey,
		Status:     ItemPending,
		ModelID:    modelID,
	}

	s.taskItems[task.ID] = []*QueueItem{item}
	s.enqueueItem(item)

	s.broadcastEventLocked(treeID, "task_created", map[string]any{
		"task_id": task.ID,
		"layers":  layers,
	})

	s.broadcastEventLocked(treeID, "queue_update", map[string]any{
		"total_items":   task.TotalItems,
		"current_layer": 1,
		"next_layer":    1,
		"new_items":     []*QueueItem{item},
	})

	return task, nil
}

// Cancel stops the active batch generation task for the given tree.
func (s *BatchGenService) Cancel(treeID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, ok := s.activeTasks[treeID]
	if !ok || task.Status != "running" {
		return fmt.Errorf("no active task for tree %s", treeID)
	}

	task.Status = "cancelled"
	s.broadcastEventLocked(treeID, "task_cancelled", map[string]any{
		"task_id": task.ID,
	})

	return nil
}

// Retry resets a failed item and re-enqueues it for processing（手动重试）。
// 重试成功后，若该 node-gen 项的 layer group 已触发，markItemDoneLocked 会通过
// enqueueChildrenForItemLocked 保证其子节点被正确入队（方案B）。
func (s *BatchGenService) Retry(treeID, itemID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, ok := s.activeTasks[treeID]
	if !ok {
		return fmt.Errorf("no task for tree %s", treeID)
	}

	var target *QueueItem
	for _, item := range s.taskItems[task.ID] {
		if item.ID == itemID && item.Status == ItemFailed {
			target = item
			break
		}
	}
	if target == nil {
		return fmt.Errorf("failed item %s not found", itemID)
	}

	// Undo previous failure counting
	task.FailedItems--
	if group, ok := s.layerGroups[target.LayerGroup]; ok && !group.Triggered {
		group.Completed--
	}

	target.Status = ItemPending
	target.Error = ""
	target.RetryCount = 0
	s.enqueueItem(target)

	s.broadcastEventLocked(treeID, "item_retry", map[string]any{
		"item_id":     target.ID,
		"retry_count": 0,
		"manual":      true,
	})

	return nil
}

// Status returns the current task and all items for the given tree.
func (s *BatchGenService) Status(treeID string) (*BatchGenTask, []*QueueItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	task, ok := s.activeTasks[treeID]
	if !ok {
		return nil, nil, fmt.Errorf("no task for tree %s", treeID)
	}

	items := make([]*QueueItem, len(s.taskItems[task.ID]))
	copy(items, s.taskItems[task.ID])
	return task, items, nil
}

// Subscribe registers a channel to receive SSE events for the given tree.
func (s *BatchGenService) Subscribe(treeID string) chan SSEEvent {
	ch := make(chan SSEEvent, 32)
	s.mu.Lock()
	s.subscribers[treeID] = append(s.subscribers[treeID], ch)
	s.mu.Unlock()
	return ch
}

// Unsubscribe removes a subscriber channel.
func (s *BatchGenService) Unsubscribe(treeID string, ch chan SSEEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	subs := s.subscribers[treeID]
	for i, sub := range subs {
		if sub == ch {
			s.subscribers[treeID] = append(subs[:i], subs[i+1:]...)
			break
		}
	}
}

// Shutdown gracefully stops all workers and closes subscriber channels.
func (s *BatchGenService) Shutdown() {
	s.cancel()
	s.wg.Wait()

	s.mu.Lock()
	defer s.mu.Unlock()

	for treeID, subs := range s.subscribers {
		for _, ch := range subs {
			close(ch)
		}
		delete(s.subscribers, treeID)
	}
}

// --- Internal: queue and workers ---

func (s *BatchGenService) enqueueItem(item *QueueItem) {
	if s.ctx.Err() != nil {
		return
	}
	select {
	case s.taskCh <- item:
	default:
		logger.L.Errorf("[BatchGen] task channel full, cannot enqueue item %s", item.ID)
	}
}

func (s *BatchGenService) worker() {
	defer s.wg.Done()

	for {
		select {
		case <-s.ctx.Done():
			return
		case item, ok := <-s.taskCh:
			if !ok {
				return
			}
			s.processItem(item)
		}
	}
}

func (s *BatchGenService) processItem(item *QueueItem) {
	// Check cancellation
	s.mu.Lock()
	task, ok := s.tasksByID[item.TaskID]
	if !ok || task.Status == "cancelled" {
		s.mu.Unlock()
		return
	}
	treeID := task.TreeID
	item.Status = ItemRunning
	s.mu.Unlock()

	s.broadcastEvent(treeID, "item_started", map[string]any{
		"item_id": item.ID,
		"type":    item.Type,
		"node_id": item.NodeID,
	})

	switch item.Type {
	case ItemGenerateNodes:
		s.processGenerateNodes(item)
	case ItemGenerateArticle:
		s.processGenerateArticle(item)
	}

	// 失败结果交给 handleItemResult 决定：瞬态重试 / 永久失败
	s.handleItemResult(item, treeID)
}

// --- Internal: item processors ---

func (s *BatchGenService) processGenerateNodes(item *QueueItem) {
	parentNode, existingChildren, ctx, err := s.nodeContextSvc.BuildExpandContext(item.NodeID)
	if err != nil {
		item.Error = fmt.Sprintf("构建上下文失败: %v", err)
		return
	}

	item.ParentTopic = parentNode.Topic

	if len(existingChildren) > 0 {
		logger.L.Infof("[BatchGen] 节点 %s 已有 %d 个子节点，跳过生成", parentNode.Topic, len(existingChildren))
		return
	}

	childInfos, err := s.aiService.GenerateChildNodes(*ctx, item.ModelID)
	if err != nil {
		item.Error = fmt.Sprintf("AI 生成失败: %v", err)
		return
	}

	created := 0
	for i, info := range childInfos {
		childNode := &model.Node{
			TreeID:        parentNode.TreeID,
			ParentID:      &parentNode.ID,
			Topic:         info.Topic,
			Description:   info.Description,
			Importance:    info.Importance,
			Difficulty:    info.Difficulty,
			Depth:         parentNode.Depth + 1,
			PositionOrder: i + 1,
		}
		if err := s.nodeRepo.Create(childNode); err != nil {
			logger.L.Errorf("[BatchGen] 创建子节点失败: %v", err)
			continue
		}
		created++
	}

	item.NodesCreated = created
	logger.L.Infof("[BatchGen] 生成子节点完成: parent=%s, created=%d", parentNode.Topic, created)
}

func (s *BatchGenService) processGenerateArticle(item *QueueItem) {
	exists, err := s.articleRepo.ExistsByNodeID(item.NodeID)
	if err != nil {
		item.Error = fmt.Sprintf("检查文章失败: %v", err)
		return
	}
	if exists {
		logger.L.Infof("[BatchGen] 节点 %s 已有文章，跳过", item.NodeID)
		return
	}

	node, err := s.nodeRepo.FindByID(item.NodeID)
	if err != nil {
		item.Error = fmt.Sprintf("节点不存在: %v", err)
		return
	}

	item.NodeTopic = node.Topic

	ancestors, _ := s.nodeContextSvc.GetAncestors(item.NodeID)
	siblings, _ := s.nodeContextSvc.GetSiblings(item.NodeID)

	// 模式来自树（单一事实来源）；查询失败走重试，绝不静默降级——
	// 否则 interview 树会用错模板生成并落库，错误被永久固化
	tree, treeErr := s.treeRepo.FindByID(node.TreeID.String())
	if treeErr != nil {
		item.Error = fmt.Sprintf("查询树信息失败: %v", treeErr)
		return
	}
	treeMode := NormalizeTreeMode(tree.Mode)

	content, err := s.aiService.GenerateArticle(node.Topic, node.Description, ancestors, siblings, treeMode, item.ModelID)
	if err != nil {
		item.Error = fmt.Sprintf("AI 生成文章失败: %v", err)
		return
	}

	article := &model.Article{
		ID:        uuid.New(),
		NodeID:    node.ID,
		Title:     node.Topic + ArticleTitleSuffix(treeMode),
		Content:   content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := s.articleRepo.Create(article); err != nil {
		item.Error = fmt.Sprintf("保存文章失败: %v", err)
		return
	}

	logger.L.Infof("[BatchGen] 文章生成完成: node=%s", node.Topic)
}

// --- Internal: result handling (retry / failure-queue) ---

// handleItemResult 处理一个 item 的执行结果：
//   - 成功 → markItemDoneLocked
//   - 瞬态失败且仍有重试次数 → 非阻塞延迟重入队（time.AfterFunc），worker 立即释放
//   - 永久失败或重试耗尽 → markItemDoneLocked（最终失败）
//
// 调用方：processItem（worker 协程）。
func (s *BatchGenService) handleItemResult(item *QueueItem, treeID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 成功
	if item.Error == "" {
		s.markItemDoneLocked(item, treeID)
		return
	}

	// 瞬态失败 + 仍有重试次数：非阻塞退避重试
	if !isPermanentError(item.Error) && item.RetryCount < maxRetries {
		item.RetryCount++
		backoff := backoffDuration(item.RetryCount)
		retryCount := item.RetryCount
		reason := item.Error
		item.Error = ""
		item.Status = ItemPending // 等待退避后重新入队；非终态，task 不会提前完成
		logger.L.Infof("[BatchGen] item %s 瞬态失败，第 %d 次重试将在 %v 后入队: %s",
			item.ID, retryCount, backoff, reason)
		s.broadcastEventLocked(treeID, "item_retry", map[string]any{
			"item_id":     item.ID,
			"retry_count": retryCount,
			"backoff_ms":  backoff.Milliseconds(),
			"reason":      reason,
		})
		// 退避结束后重新入队；worker 在此期间可处理其它 item（不阻塞并发）
		time.AfterFunc(backoff, func() {
			s.enqueueItem(item)
		})
		return
	}

	// 永久失败或重试耗尽
	logger.L.Errorf("[BatchGen] item %s 最终失败（已重试 %d 次）: %s", item.ID, item.RetryCount, item.Error)
	s.markItemDoneLocked(item, treeID)
}

// markItemDoneLocked 将一个 item 置为终态（成功或失败），更新计数、推进 layer barrier、
// 处理方案B 的子节点传播，并在全部完成时触发失败轮或结束任务。
// 调用方需持有 s.mu。
func (s *BatchGenService) markItemDoneLocked(item *QueueItem, treeID string) {
	// Idempotency: already in terminal state
	if item.Status == ItemCompleted || item.Status == ItemFailed {
		return
	}

	if item.Error != "" {
		item.Status = ItemFailed
	} else {
		item.Status = ItemCompleted
	}

	task, ok := s.tasksByID[item.TaskID]
	if !ok {
		return
	}

	if item.Status == ItemCompleted {
		task.CompletedItems++
	} else {
		task.FailedItems++
	}

	// Layer barrier：等该组所有 item 终态后再安排下一层
	if group, ok := s.layerGroups[item.LayerGroup]; ok && !group.Triggered {
		group.Completed++
		if group.Completed == group.Total {
			group.Triggered = true
			s.enqueueNextLayerLocked(task, item)
		}
	}

	// 方案B：node-gen 项成功，但其所在 group 已触发（属于重试/失败轮的“迟到成功”），
	// 需单独为其入队子节点。barrier 路径里 enqueueNextLayerLocked 已设 ChildrenEnqueued，
	// 此处 !ChildrenEnqueued 守卫保证恰好入队一次。
	if item.Status == ItemCompleted && item.Type == ItemGenerateNodes && !item.ChildrenEnqueued {
		if g, ok := s.layerGroups[item.LayerGroup]; !ok || g.Triggered {
			s.enqueueChildrenForItemLocked(task, item)
		}
	}

	// Broadcast result
	if item.Status == ItemCompleted {
		s.broadcastEventLocked(treeID, "item_completed", map[string]any{
			"item_id":       item.ID,
			"type":          item.Type,
			"node_id":       item.NodeID,
			"nodes_created": item.NodesCreated,
			"node_topic":    item.NodeTopic,
			"parent_topic":  item.ParentTopic,
		})
	} else {
		s.broadcastEventLocked(treeID, "item_failed", map[string]any{
			"item_id": item.ID,
			"type":    item.Type,
			"node_id": item.NodeID,
			"error":   item.Error,
		})
	}

	// 全部终态：决定失败轮或结束任务
	if s.isTaskCompleteLocked(task) {
		if s.failurePassCount[task.ID] < maxFailurePass && s.hasFailedItemsLocked(task) {
			s.startFailurePassLocked(task, treeID)
		} else {
			task.Status = "completed"
			s.broadcastEventLocked(treeID, "task_completed", map[string]any{
				"task_id":   task.ID,
				"completed": task.CompletedItems,
				"failed":    task.FailedItems,
			})
		}
	}

	s.broadcastEventLocked(treeID, "progress", map[string]any{
		"completed":     task.CompletedItems + task.FailedItems,
		"total":         task.TotalItems,
		"current_layer": item.Layer,
	})
}

// enqueueNextLayerLocked 在某 layer group 的 barrier 打破时调用：
// 收集该组所有“成功且尚未入队子节点”的 node-gen 项的子节点，统一安排文章+下一层。
func (s *BatchGenService) enqueueNextLayerLocked(task *BatchGenTask, triggerItem *QueueItem) {
	var allChildren []childNodeInfo

	for _, it := range s.taskItems[task.ID] {
		if it.LayerGroup == triggerItem.LayerGroup &&
			it.Type == ItemGenerateNodes &&
			it.Status == ItemCompleted &&
			!it.ChildrenEnqueued {

			children, err := s.nodeRepo.FindChildren(it.NodeID)
			if err != nil {
				logger.L.Errorf("[BatchGen] 查询子节点失败: %v", err)
				continue
			}
			for _, c := range children {
				allChildren = append(allChildren, childNodeInfo{c.ID.String(), c.Topic})
			}
			it.ChildrenEnqueued = true
		}
	}

	if len(allChildren) == 0 {
		return
	}

	newItems := s.spawnChildTasksLocked(task, triggerItem, allChildren)

	s.broadcastEventLocked(task.TreeID, "queue_update", map[string]any{
		"total_items":   task.TotalItems,
		"current_layer": triggerItem.Layer,
		"next_layer":    triggerItem.Layer + 1,
		"new_items":     newItems,
	})
}

// enqueueChildrenForItemLocked 方案B：为单个“迟到成功”的 node-gen 项入队其子节点。
// 用于重试成功 / 失败轮成功（此时 layer group 已触发，barrier 路径不会再处理它）。
func (s *BatchGenService) enqueueChildrenForItemLocked(task *BatchGenTask, item *QueueItem) {
	if item.Type != ItemGenerateNodes || item.ChildrenEnqueued {
		return
	}
	item.ChildrenEnqueued = true

	children, err := s.nodeRepo.FindChildren(item.NodeID)
	if err != nil {
		logger.L.Errorf("[BatchGen] 查询子节点失败: %v", err)
		return
	}
	if len(children) == 0 {
		return
	}

	childInfos := make([]childNodeInfo, 0, len(children))
	for _, c := range children {
		childInfos = append(childInfos, childNodeInfo{c.ID.String(), c.Topic})
	}

	newItems := s.spawnChildTasksLocked(task, item, childInfos)

	s.broadcastEventLocked(task.TreeID, "queue_update", map[string]any{
		"total_items":   task.TotalItems,
		"current_layer": item.Layer,
		"next_layer":    item.Layer + 1,
		"new_items":     newItems,
	})
}

// spawnChildTasksLocked 为一组子节点创建并入队：文章任务（当前层）+ 下一层节点生成任务（若未达 TargetLayers）。
// parent.Layer 为父节点的生成层；子节点文章项用 parent.Layer，下一层节点项用 parent.Layer+1。
// 调用方需持有 s.mu。
func (s *BatchGenService) spawnChildTasksLocked(task *BatchGenTask, parent *QueueItem, children []childNodeInfo) []*QueueItem {
	currentLayer := parent.Layer
	nextLayer := currentLayer + 1
	var newItems []*QueueItem

	// 文章任务（为每个子节点生成一篇）
	articleGroupKey := s.newGroupKey()
	s.layerGroups[articleGroupKey] = &layerGroupProgress{Total: len(children)}
	for _, child := range children {
		articleItem := &QueueItem{
			ID:         uuid.New().String(),
			TaskID:     task.ID,
			Type:       ItemGenerateArticle,
			NodeID:     child.id,
			Layer:      currentLayer,
			TreeDepth:  currentLayer,
			LayerGroup: articleGroupKey,
			Status:     ItemPending,
			NodeTopic:  child.topic,
			ModelID:    task.ModelID,
		}
		s.taskItems[task.ID] = append(s.taskItems[task.ID], articleItem)
		task.TotalItems++
		newItems = append(newItems, articleItem)
		s.enqueueItem(articleItem)
	}

	// 下一层节点生成（未达深度上限时）
	if nextLayer <= task.TargetLayers {
		nodeGroupKey := s.newGroupKey()
		s.layerGroups[nodeGroupKey] = &layerGroupProgress{Total: len(children)}
		for _, child := range children {
			nodeItem := &QueueItem{
				ID:         uuid.New().String(),
				TaskID:     task.ID,
				Type:       ItemGenerateNodes,
				NodeID:     child.id,
				Layer:      nextLayer,
				TreeDepth:  currentLayer,
				LayerGroup: nodeGroupKey,
				Status:     ItemPending,
				NodeTopic:  child.topic,
				ModelID:    task.ModelID,
			}
			s.taskItems[task.ID] = append(s.taskItems[task.ID], nodeItem)
			task.TotalItems++
			newItems = append(newItems, nodeItem)
			s.enqueueItem(nodeItem)
		}
	}

	return newItems
}

// startFailurePassLocked 在主流程全部终态后，把所有失败项重置并重新入队（失败队列）。
// 失败项重新获得完整的重试预算（RetryCount=0）。每项成功后由方案B 保证子节点传播。
// 调用方需持有 s.mu。
func (s *BatchGenService) startFailurePassLocked(task *BatchGenTask, treeID string) {
	s.failurePassCount[task.ID]++
	pass := s.failurePassCount[task.ID]

	var reset []*QueueItem
	for _, it := range s.taskItems[task.ID] {
		if it.Status == ItemFailed {
			it.Status = ItemPending
			it.Error = ""
			it.RetryCount = 0
			task.FailedItems--
			reset = append(reset, it)
		}
	}

	logger.L.Infof("[BatchGen] 启动失败轮 #%d：重置 %d 个失败项", pass, len(reset))

	s.broadcastEventLocked(treeID, "failure_pass_started", map[string]any{
		"task_id": task.ID,
		"pass":    pass,
		"count":   len(reset),
	})

	for _, it := range reset {
		s.broadcastEventLocked(treeID, "item_retry", map[string]any{
			"item_id":      it.ID,
			"retry_count":  0,
			"failure_pass": true,
		})
		s.enqueueItem(it)
	}
}

// hasFailedItemsLocked 判断任务中是否还有失败项。调用方需持有 s.mu。
func (s *BatchGenService) hasFailedItemsLocked(task *BatchGenTask) bool {
	for _, it := range s.taskItems[task.ID] {
		if it.Status == ItemFailed {
			return true
		}
	}
	return false
}

func (s *BatchGenService) isTaskCompleteLocked(task *BatchGenTask) bool {
	for _, item := range s.taskItems[task.ID] {
		if item.Status == ItemPending || item.Status == ItemRunning {
			return false
		}
	}
	return true
}

// newGroupKey 生成唯一的 layer group 键（自增），避免失败轮/重试级联时键碰撞。
// 调用方需持有 s.mu。
func (s *BatchGenService) newGroupKey() string {
	s.groupSeq++
	return fmt.Sprintf("g%d", s.groupSeq)
}

// isPermanentError 判断是否为“不可重试”的永久性错误（认证/欠费/参数）。
// 其余错误（429 / 5xx / 超时 / 网络 / 解析 / 空响应）视为瞬态，可重试。
func isPermanentError(errMsg string) bool {
	return strings.Contains(errMsg, "认证失败") ||
		strings.Contains(errMsg, "余额不足") ||
		strings.Contains(errMsg, "参数错误")
}

// backoffDuration 返回第 retryCount 次重试前的非阻塞退避时长。
func backoffDuration(retryCount int) time.Duration {
	switch retryCount {
	case 1:
		return 2 * time.Second
	case 2:
		return 5 * time.Second
	default:
		return 5 * time.Second
	}
}

// --- Internal: SSE broadcast ---

func (s *BatchGenService) broadcastEvent(treeID, eventType string, payload any) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.broadcastEventLocked(treeID, eventType, payload)
}

func (s *BatchGenService) broadcastEventLocked(treeID, eventType string, payload any) {
	s.eventCounter++
	event := SSEEvent{
		Type:    eventType,
		Payload: payload,
		EventID: s.eventCounter,
	}

	subs := s.subscribers[treeID]
	var active []chan SSEEvent
	for _, ch := range subs {
		select {
		case ch <- event:
			active = append(active, ch)
		default:
			close(ch)
		}
	}
	s.subscribers[treeID] = active
}
