package service

import (
	"context"
	"fmt"
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
	ModelID      string     `json:"-"`
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
	Type    string      `json:"type"`
	Payload any    `json:"payload"`
	EventID int64       `json:"event_id"`
}

// --- Service ---

const maxWorkers = 2

type BatchGenService struct {
	aiService      *AIService
	nodeRepo       *repository.NodeRepository
	treeRepo       *repository.TreeRepository
	articleRepo    *repository.ArticleRepository
	nodeContextSvc *NodeContextService

	mu           sync.RWMutex
	activeTasks  map[string]*BatchGenTask       // treeID -> active task
	tasksByID    map[string]*BatchGenTask       // taskID -> task
	taskItems    map[string][]*QueueItem        // taskID -> ordered items
	layerGroups  map[string]*layerGroupProgress // "taskID:groupKey" -> progress
	subscribers  map[string][]chan SSEEvent     // treeID -> subscriber channels
	eventCounter int64

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

	groupKey := fmt.Sprintf("%s:L%d-nodes", task.ID, 1)
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

// Retry resets a failed item and re-enqueues it for processing.
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
	s.enqueueItem(target)

	s.broadcastEventLocked(treeID, "item_retry", map[string]any{
		"item_id": itemID,
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
	s.mu.RLock()
	task, ok := s.tasksByID[item.TaskID]
	if !ok || task.Status == "cancelled" {
		s.mu.RUnlock()
		return
	}
	treeID := task.TreeID
	item.Status = ItemRunning
	s.mu.RUnlock()

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

	s.markItemDone(item, treeID)
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

	content, err := s.aiService.GenerateArticle(node.Topic, node.Description, ancestors, siblings, item.ModelID)
	if err != nil {
		item.Error = fmt.Sprintf("AI 生成文章失败: %v", err)
		return
	}

	article := &model.Article{
		ID:        uuid.New(),
		NodeID:    node.ID,
		Title:     node.Topic + " 知识点详解",
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

// --- Internal: completion tracking ---

func (s *BatchGenService) markItemDone(item *QueueItem, treeID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

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

	// Layer group tracking
	if group, ok := s.layerGroups[item.LayerGroup]; ok && !group.Triggered {
		group.Completed++
		if group.Completed == group.Total {
			group.Triggered = true
			s.enqueueNextLayerLocked(task, item)
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

	// Task completion check
	if s.isTaskCompleteLocked(task) {
		task.Status = "completed"
		s.broadcastEventLocked(treeID, "task_completed", map[string]any{
			"task_id":  task.ID,
			"completed": task.CompletedItems,
			"failed":   task.FailedItems,
		})
	}

	s.broadcastEventLocked(treeID, "progress", map[string]any{
		"completed":     task.CompletedItems + task.FailedItems,
		"total":         task.TotalItems,
		"current_layer": item.Layer,
	})
}

func (s *BatchGenService) enqueueNextLayerLocked(task *BatchGenTask, triggerItem *QueueItem) {
	type childInfo struct {
		id    string
		topic string
	}
	var allChildren []childInfo

	for _, it := range s.taskItems[task.ID] {
		if it.LayerGroup == triggerItem.LayerGroup &&
			it.Type == ItemGenerateNodes &&
			it.Status == ItemCompleted {

			children, err := s.nodeRepo.FindChildren(it.NodeID)
			if err != nil {
				logger.L.Errorf("[BatchGen] 查询子节点失败: %v", err)
				continue
			}
			for _, c := range children {
				allChildren = append(allChildren, childInfo{c.ID.String(), c.Topic})
			}
		}
	}

	if len(allChildren) == 0 {
		return
	}

	var newItems []*QueueItem
	currentLayer := triggerItem.Layer

	// Enqueue article tasks for child nodes
	articleGroupKey := fmt.Sprintf("%s:L%d-articles", task.ID, currentLayer)
	s.layerGroups[articleGroupKey] = &layerGroupProgress{Total: len(allChildren)}

	for _, child := range allChildren {
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

	// Enqueue next layer node generation (if more layers remain)
	nextLayer := currentLayer + 1
	if nextLayer <= task.TargetLayers {
		nodeGroupKey := fmt.Sprintf("%s:L%d-nodes", task.ID, nextLayer)
		s.layerGroups[nodeGroupKey] = &layerGroupProgress{Total: len(allChildren)}

		for _, child := range allChildren {
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

	s.broadcastEventLocked(task.TreeID, "queue_update", map[string]any{
		"total_items":   task.TotalItems,
		"current_layer": currentLayer,
		"next_layer":    nextLayer,
		"new_items":     newItems,
	})
}

func (s *BatchGenService) isTaskCompleteLocked(task *BatchGenTask) bool {
	for _, item := range s.taskItems[task.ID] {
		if item.Status == ItemPending || item.Status == ItemRunning {
			return false
		}
	}
	return true
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
