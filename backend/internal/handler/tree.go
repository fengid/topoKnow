package handler

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/response"
	"topoknow-backend/internal/repository"
	"topoknow-backend/internal/service"
	"fmt"

	"github.com/gin-gonic/gin"
)

type TreeHandler struct {
	treeRepo *repository.TreeRepository
	nodeRepo *repository.NodeRepository
	aiSvc    *service.AIService
}

func NewTreeHandler(treeRepo *repository.TreeRepository, nodeRepo *repository.NodeRepository, aiSvc *service.AIService) *TreeHandler {
	return &TreeHandler{
		treeRepo: treeRepo,
		nodeRepo: nodeRepo,
		aiSvc:    aiSvc,
	}
}

func (h *TreeHandler) List(c *gin.Context) {
	trees, err := h.treeRepo.FindAll()
	if err != nil {
		response.InternalError(c, "Failed to fetch trees")
		return
	}

	response.Success(c, trees)
}

func (h *TreeHandler) Create(c *gin.Context) {
	var req model.CreateTreeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	// 检查数据库是否已存在相同主题的树
	existingTree, err := h.treeRepo.FindByRootTopicWithRootNode(req.RootTopic)
	if err == nil && existingTree != nil {
		// 已存在相同主题的树，返回已存在的树
		c.JSON(200, response.Response{
			Success: true,
			Data:    existingTree,
			Message: fmt.Sprintf("已存在主题为「%s」的学习树，已为您返回该树", req.RootTopic),
		})
		return
	}
	// 如果错误不是 "record not found"，说明是其他数据库错误
	if err != nil && err.Error() != "record not found" {
		response.InternalError(c, "Failed to check existing tree")
		return
	}

	// AI 生成根节点信息
	var description string
	var importance string
	var difficulty int

	if h.aiSvc != nil {
		// 如果传了 prompt_id，尝试使用对应的提示词模板
		nodeInfo, err := h.aiSvc.GenerateRootNodeInfoWithPrompt(req.RootTopic, req.PromptID)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}
		description = nodeInfo.Description
		importance = nodeInfo.Importance
		difficulty = nodeInfo.Difficulty
	} else {
		response.InternalError(c, "AI service not configured")
		return
	}

	// Create tree
	tree := &model.Tree{
		RootTopic:   req.RootTopic,
		Description: description,
	}

	if err := h.treeRepo.Create(tree); err != nil {
		response.InternalError(c, "Failed to create tree")
		return
	}

	// Create root node
	rootNode := &model.Node{
		TreeID:      tree.ID,
		ParentID:    nil,
		Topic:       req.RootTopic,
		Description: description,
		Importance:  importance,
		Difficulty:  difficulty,
		Depth:       0,
	}

	if err := h.nodeRepo.Create(rootNode); err != nil {
		response.InternalError(c, "Failed to create root node")
		return
	}

	tree.RootNode = rootNode

	response.Created(c, tree)
}

func (h *TreeHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Tree ID is required")
		return
	}

	tree, err := h.treeRepo.FindByIDWithRootNode(id)
	if err != nil {
		if err.Error() == "record not found" {
			response.NotFound(c, "Tree not found")
			return
		}
		response.InternalError(c, "Failed to fetch tree")
		return
	}

	// 填充所有节点的计算字段
	allNodes := make([]*model.Node, 0, 1+len(tree.Nodes))
	if tree.RootNode != nil {
		allNodes = append(allNodes, tree.RootNode)
	}
	for i := range tree.Nodes {
		allNodes = append(allNodes, &tree.Nodes[i])
	}
	PopulateNodeMetadata(allNodes, h.nodeRepo)

	response.Success(c, tree)
}

func (h *TreeHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "Tree ID is required")
		return
	}

	if err := h.treeRepo.Delete(id); err != nil {
		if err.Error() == "record not found" {
			response.NotFound(c, "Tree not found")
			return
		}
		response.InternalError(c, "Failed to delete tree")
		return
	}

	response.Success(c, nil)
}
