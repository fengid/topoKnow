package handler

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/handler_helper"
	"topoknow-backend/internal/pkg/logger"
	"topoknow-backend/internal/pkg/response"
	"topoknow-backend/internal/repository"
	"topoknow-backend/internal/service"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const MaxChildNodes = 10

type NodeHandler struct {
	nodeRepo  *repository.NodeRepository
	treeRepo  *repository.TreeRepository
	aiService *service.AIService
}

func NewNodeHandler(nodeRepo *repository.NodeRepository, treeRepo *repository.TreeRepository, aiService *service.AIService) *NodeHandler {
	return &NodeHandler{
		nodeRepo:  nodeRepo,
		treeRepo:  treeRepo,
		aiService: aiService,
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
		IsExpanded:   &[]bool{true}[0],
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

	if err := h.nodeRepo.Delete(id); err != nil {
		response.NotFound(c, "Node not found")
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
		Topic            string   `json:"topic"`
		Level            string   `json:"level"`
		ExistingChildren []string `json:"existing_children"`
		Model            string   `json:"model"`
	}
	_ = c.ShouldBindJSON(&expandReq)
	modelID := expandReq.Model

	// 获取节点信息
	parentNode, err := h.nodeRepo.FindByID(id)
	if err != nil {
		response.NotFound(c, "Node not found")
		return
	}

	// 查询已有子节点
	existingChildren, err := h.nodeRepo.FindChildren(id)
	if err != nil {
		response.InternalError(c, "Failed to fetch children")
		return
	}

	// 构建已有子节点的丰富信息
	existingSiblings := make([]model.SiblingInfo, 0, len(existingChildren))
	for _, child := range existingChildren {
		existingSiblings = append(existingSiblings, model.SiblingInfo{
			Topic:       child.Topic,
			Description: child.Description,
			Importance:  child.Importance,
		})
	}

	// 检查子节点数量是否已达上限
	if len(existingChildren) >= MaxChildNodes {
		response.SuccessWithError(c, fmt.Sprintf("已达到子节点数量上限（%d个），无法继续展开", MaxChildNodes))
		return
	}

	// 查询祖先节点链路（从根节点到父节点的路径）
	var ancestors []model.AncestorInfo
	ancestorsNodes, err := h.nodeRepo.FindAncestors(id)
	if err != nil {
		logger.L.Errorf("[Node] 查询祖先节点失败: %v", err)
	} else {
		ancestors = make([]model.AncestorInfo, 0, len(ancestorsNodes))
		for _, anc := range ancestorsNodes {
			ancestors = append(ancestors, model.AncestorInfo{
				Topic:       anc.Topic,
				Description: anc.Description,
				Importance:  anc.Importance,
				Difficulty:  anc.Difficulty,
				Depth:       anc.Depth,
			})
		}
	}

	// 获取根节点职位名称
	rootTopic := parentNode.Topic
	tree, err := h.treeRepo.FindByID(parentNode.TreeID.String())
	if err != nil {
		logger.L.Errorf("[Node] 查询树信息失败: %v", err)
	} else {
		rootTopic = tree.RootTopic
	}

	// 构建完整上下文
	ctx := model.ExpandContext{
		RootTopic:        rootTopic,
		ParentTopic:      parentNode.Topic,
		ParentDesc:       parentNode.Description,
		ParentImportance: parentNode.Importance,
		ChildDepth:       parentNode.Depth + 1,
		Ancestors:        ancestors,
		ExistingSiblings: existingSiblings,
	}

	if len(existingChildren) == 0 {
		// 无子节点 → 批量生成
		childInfos, err := h.aiService.GenerateChildNodes(ctx, modelID)
		if err != nil {
			logger.L.Errorf("[Node] AI 批量生成子节点失败: %v", err)
			response.InternalError(c, err.Error())
			return
		}

		var createdNodes []model.Node
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
			if err := h.nodeRepo.Create(childNode); err != nil {
				logger.L.Errorf("[Node] 创建子节点失败: %v", err)
				continue
			}
			createdNodes = append(createdNodes, *childNode)
		}

		if len(createdNodes) == 0 {
			response.InternalError(c, "AI 生成失败，请稍后重试")
			return
		}

		logger.L.Infof("[Node] 批量创建子节点完成: parent=%s, count=%d", parentNode.Topic, len(createdNodes))
		h.nodeRepo.UpdateExpanded(id, true)

		// 填充计算字段
		nodePtrs := make([]*model.Node, len(createdNodes))
		for i := range createdNodes {
			nodePtrs[i] = &createdNodes[i]
		}
		PopulateNodeMetadata(nodePtrs, h.nodeRepo)

		response.Success(c, createdNodes)
		return
	}

	// 有子节点 → 单个生成
	childInfo, err := h.aiService.GenerateChildNodeInfo(ctx, modelID)
	if err != nil {
		logger.L.Errorf("[Node] AI 生成子节点失败: %v", err)
		response.Success(c, existingChildren)
		return
	}

	// 检查 AI 返回的主题是否已存在（双重检查）
	for _, existing := range existingSiblings {
		if strings.EqualFold(existing.Topic, childInfo.Topic) {
			logger.L.Infof("[Node] AI 返回的主题 '%s' 已存在，跳过创建", childInfo.Topic)
			response.Success(c, existingChildren)
			return
		}
	}

	// 创建新子节点
	childNode := &model.Node{
		TreeID:        parentNode.TreeID,
		ParentID:      &parentNode.ID,
		Topic:         childInfo.Topic,
		Description:   childInfo.Description,
		Importance:    childInfo.Importance,
		Difficulty:    childInfo.Difficulty,
		Depth:         parentNode.Depth + 1,
		PositionOrder: len(existingChildren) + 1,
	}

	if err := h.nodeRepo.Create(childNode); err != nil {
		logger.L.Errorf("[Node] 创建子节点失败: %v", err)
		response.InternalError(c, "Failed to create child node")
		return
	}

	logger.L.Infof("[Node] 成功创建子节点: topic=%s, parent=%s", childNode.Topic, parentNode.Topic)
	h.nodeRepo.UpdateExpanded(id, true)

	// 填充计算字段
	PopulateNodeMetadata([]*model.Node{childNode}, h.nodeRepo)

	response.Success(c, []model.Node{*childNode})
}
