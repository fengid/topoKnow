package handler

import (
	"strings"
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/handler_helper"
	"topoknow-backend/internal/pkg/logger"
	"topoknow-backend/internal/pkg/response"
	"topoknow-backend/internal/repository"
	"topoknow-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type NodeHandler struct {
	nodeRepo       *repository.NodeRepository
	treeRepo       *repository.TreeRepository
	aiService      *service.AIService
	nodeContextSvc *service.NodeContextService
}

func NewNodeHandler(nodeRepo *repository.NodeRepository, treeRepo *repository.TreeRepository, aiService *service.AIService, nodeContextSvc *service.NodeContextService) *NodeHandler {
	return &NodeHandler{
		nodeRepo:       nodeRepo,
		treeRepo:       treeRepo,
		aiService:      aiService,
		nodeContextSvc: nodeContextSvc,
	}
}

func (h *NodeHandler) List(c *gin.Context) {
	nodes, err := h.nodeRepo.FindAll()
	if err != nil {
		response.InternalError(c, "Failed to fetch nodes")
		return
	}

	response.Success(c, nodes)
}

func (h *NodeHandler) GetByID(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	node, err := h.nodeRepo.FindByIDWithChildren(id)
	if err != nil {
		response.NotFound(c, "Node not found")
		return
	}

	// 填充节点及其子节点的计算字段
	allNodes := []*model.Node{node}
	for i := range node.Children {
		allNodes = append(allNodes, &node.Children[i])
	}
	PopulateNodeMetadata(allNodes, h.nodeRepo)

	response.Success(c, node)
}

func (h *NodeHandler) GetChildren(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	children, err := h.nodeRepo.FindChildren(id)
	if err != nil {
		response.InternalError(c, "Failed to fetch children")
		return
	}

	response.Success(c, children)
}

func (h *NodeHandler) Create(c *gin.Context) {
	var req model.CreateNodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// Parse tree ID
	treeID, err := uuid.Parse(req.TreeID)
	if err != nil {
		response.BadRequest(c, "Invalid tree ID")
		return
	}

	// Parse parent ID if provided
	var parentID *uuid.UUID
	if req.ParentID != nil {
		pid, err := uuid.Parse(*req.ParentID)
		if err != nil {
			response.BadRequest(c, "Invalid parent ID")
			return
		}
		parentID = &pid
	}

	// Get parent to determine depth
	var depth int
	if parentID != nil {
		parent, err := h.nodeRepo.FindByID(parentID.String())
		if err != nil {
			response.BadRequest(c, "Parent node not found")
			return
		}
		depth = parent.Depth + 1
	}

	// Get max position order
	maxOrder, _ := h.nodeRepo.GetMaxPositionOrder(req.ParentID)

	// Set defaults
	importance := req.Importance
	if importance == "" {
		importance = "medium"
	}

	difficulty := req.Difficulty
	if difficulty == 0 {
		difficulty = 3
	}

	node := &model.Node{
		TreeID:        treeID,
		ParentID:      parentID,
		Topic:         req.Topic,
		Description:   req.Description,
		Importance:    importance,
		Difficulty:    difficulty,
		Depth:         depth,
		PositionOrder: maxOrder + 1,
		IsExpanded:    &[]bool{true}[0],
	}

	if err := h.nodeRepo.Create(node); err != nil {
		response.InternalError(c, "Failed to create node")
		return
	}

	response.Created(c, node)
}

func (h *NodeHandler) Update(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	var req model.UpdateNodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	node, err := h.nodeRepo.FindByID(id)
	if err != nil {
		response.NotFound(c, "Node not found")
		return
	}

	// Update fields
	if req.Topic != nil {
		node.Topic = *req.Topic
	}
	if req.Description != nil {
		node.Description = *req.Description
	}
	if req.Importance != nil {
		node.Importance = *req.Importance
	}
	if req.Difficulty != nil {
		node.Difficulty = *req.Difficulty
	}

	if err := h.nodeRepo.Update(node); err != nil {
		response.InternalError(c, "Failed to update node")
		return
	}

	response.Success(c, node)
}

func (h *NodeHandler) Delete(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	node, err := h.nodeRepo.FindByID(id)
	if err != nil {
		response.NotFound(c, "Node not found")
		return
	}

	// 根节点删除 → 删除整棵树
	if node.ParentID == nil {
		if err := h.treeRepo.Delete(node.TreeID.String()); err != nil {
			response.InternalError(c, "Failed to delete tree")
			return
		}
		response.Success(c, gin.H{"deleted_tree": true})
		return
	}

	if err := h.nodeRepo.Delete(id); err != nil {
		response.InternalError(c, "Failed to delete node")
		return
	}

	response.Success(c, nil)
}

func (h *NodeHandler) DeleteChildren(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	if err := h.nodeRepo.DeleteChildren(id); err != nil {
		response.InternalError(c, "Failed to delete children")
		return
	}

	response.Success(c, nil)
}

type UpdateExpandedRequest struct {
	IsExpanded bool `json:"is_expanded"`
}

func (h *NodeHandler) UpdateExpanded(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	var req UpdateExpandedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	node, err := h.nodeRepo.FindByID(id)
	if err != nil {
		response.NotFound(c, "Node not found")
		return
	}

	if err := h.nodeRepo.UpdateExpanded(id, req.IsExpanded); err != nil {
		response.InternalError(c, "Failed to update expanded state")
		return
	}

	node.IsExpanded = &req.IsExpanded
	response.Success(c, node)
}

func (h *NodeHandler) Expand(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	var expandReq struct {
		Topic string `json:"topic"`
		Level string `json:"level"`
		Model string `json:"model"`
	}
	_ = c.ShouldBindJSON(&expandReq)
	modelID := expandReq.Model

	// 使用共享上下文构建器（含树的模式、已有子节点）
	parentNode, existingChildren, ctx, err := h.nodeContextSvc.BuildExpandContext(id)
	if err != nil {
		response.NotFound(c, "Node not found")
		return
	}

	// 统一批量生成：无子节点时首批生成，有子节点时追加（AI 参考已有子节点避免重复）
	childInfos, err := h.aiService.GenerateChildNodes(*ctx, modelID)
	if err != nil {
		logger.L.Errorf("[Node] AI 批量生成子节点失败: %v", err)
		response.InternalError(c, err.Error())
		return
	}

	// 服务端兜底（提示词是软约束）：与已有子节点大小写不敏感去重 + 硬上限截断
	const maxChildrenHardCap = 15
	existingTopics := make(map[string]struct{}, len(existingChildren))
	for _, ch := range existingChildren {
		existingTopics[strings.ToLower(strings.TrimSpace(ch.Topic))] = struct{}{}
	}
	var deduped []model.ChildNodeInfo
	for _, info := range childInfos {
		key := strings.ToLower(strings.TrimSpace(info.Topic))
		if key == "" {
			continue
		}
		if _, dup := existingTopics[key]; dup {
			logger.L.Infof("[Node] AI 返回的主题 '%s' 已存在，跳过", info.Topic)
			continue
		}
		existingTopics[key] = struct{}{}
		deduped = append(deduped, info)
		if len(deduped) >= maxChildrenHardCap {
			logger.L.Warnf("[Node] AI 返回子节点数超过硬上限 %d，截断", maxChildrenHardCap)
			break
		}
	}
	childInfos = deduped

	if len(childInfos) == 0 {
		response.SuccessWithError(c, "AI 未生成新的子节点，该层可能已覆盖完整")
		return
	}

	var createdNodes []model.Node
	positionOrder := len(existingChildren)
	for _, info := range childInfos {
		positionOrder++
		childNode := &model.Node{
			TreeID:        parentNode.TreeID,
			ParentID:      &parentNode.ID,
			Topic:         info.Topic,
			Description:   info.Description,
			Importance:    info.Importance,
			Difficulty:    info.Difficulty,
			Depth:         parentNode.Depth + 1,
			PositionOrder: positionOrder,
		}
		if err := h.nodeRepo.Create(childNode); err != nil {
			logger.L.Errorf("[Node] 创建子节点失败: %v", err)
			continue
		}
		createdNodes = append(createdNodes, *childNode)
	}

	if len(createdNodes) == 0 {
		response.SuccessWithError(c, "AI 未生成新的子节点，该层可能已覆盖完整")
		return
	}

	logger.L.Infof("[Node] 批量创建子节点完成: parent=%s, mode=%s, existing=%d, created=%d",
		parentNode.Topic, ctx.Mode, len(existingChildren), len(createdNodes))
	h.nodeRepo.UpdateExpanded(id, true)

	// 填充计算字段
	nodePtrs := make([]*model.Node, len(createdNodes))
	for i := range createdNodes {
		nodePtrs[i] = &createdNodes[i]
	}
	PopulateNodeMetadata(nodePtrs, h.nodeRepo)

	response.Success(c, createdNodes)
}
