package handler

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/handler_helper"
	"topoknow-backend/internal/pkg/logger"
	"topoknow-backend/internal/pkg/response"
	"topoknow-backend/internal/repository"
	"topoknow-backend/internal/service"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ArticleHandler struct {
	articleRepo    *repository.ArticleRepository
	nodeRepo       *repository.NodeRepository
	aiService      *service.AIService
	nodeContextSvc *service.NodeContextService
}

func NewArticleHandler(
	articleRepo *repository.ArticleRepository,
	nodeRepo *repository.NodeRepository,
	aiService *service.AIService,
	nodeContextSvc *service.NodeContextService,
) *ArticleHandler {
	return &ArticleHandler{
		articleRepo:    articleRepo,
		nodeRepo:       nodeRepo,
		aiService:      aiService,
		nodeContextSvc: nodeContextSvc,
	}
}

func (h *ArticleHandler) List(c *gin.Context) {
	articles, err := h.articleRepo.FindAll()
	if err != nil {
		response.InternalError(c, "Failed to fetch articles")
		return
	}

	response.Success(c, articles)
}

func (h *ArticleHandler) GetByNodeID(c *gin.Context) {
	nodeID, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	article, err := h.articleRepo.FindByNodeID(nodeID)
	if err != nil {
		// Return null if not found (no article yet)
		response.Success(c, nil)
		return
	}

	response.Success(c, article)
}

func (h *ArticleHandler) Create(c *gin.Context) {
	nodeID, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	var req struct {
		Topic string `json:"topic"`
		Model string `json:"model"`
	}
	_ = c.ShouldBindJSON(&req)

	// Check if article already exists
	exists, err := h.articleRepo.ExistsByNodeID(nodeID)
	if err != nil {
		response.InternalError(c, "Failed to check article existence")
		return
	}
	if exists {
		response.BadRequest(c, "Article already exists for this node")
		return
	}

	article, err := h.generateAndSave(nodeID, req.Model)
	if err != nil {
		logger.L.Errorf("[Article] Create failed: %v", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Created(c, article)
}

func (h *ArticleHandler) Regenerate(c *gin.Context) {
	nodeID, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	// Delete existing article
	if err := h.articleRepo.DeleteByNodeID(nodeID); err != nil {
		logger.L.Errorf("[Article] Failed to delete existing article: %v", err)
	}

	var regenReq struct {
		Topic string `json:"topic"`
		Model string `json:"model"`
	}
	_ = c.ShouldBindJSON(&regenReq)

	article, err := h.generateAndSave(nodeID, regenReq.Model)
	if err != nil {
		logger.L.Errorf("[Article] Regenerate failed: %v", err)
		response.InternalError(c, err.Error())
		return
	}

	response.Created(c, article)
}

func (h *ArticleHandler) Delete(c *gin.Context) {
	nodeID, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	exists, err := h.articleRepo.ExistsByNodeID(nodeID)
	if err != nil {
		response.InternalError(c, "Failed to check article existence")
		return
	}
	if !exists {
		response.NotFound(c, "Article not found")
		return
	}

	if err := h.articleRepo.DeleteByNodeID(nodeID); err != nil {
		response.InternalError(c, "Failed to delete article")
		return
	}

	logger.L.Infof("[Article] Article deleted for node: %s", nodeID)
	response.Success(c, nil)
}

func (h *ArticleHandler) DeleteByID(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	article, err := h.articleRepo.FindByID(id)
	if err != nil {
		response.NotFound(c, "Article not found")
		return
	}

	if err := h.articleRepo.Delete(id); err != nil {
		response.InternalError(c, "Failed to delete article")
		return
	}

	logger.L.Infof("[Article] Article deleted: %s (node: %s)", id, article.NodeID)
	response.Success(c, nil)
}

// generateAndSave 生成文章并保存（共享逻辑）
func (h *ArticleHandler) generateAndSave(nodeID string, modelID string) (*model.Article, error) {
	node, err := h.nodeRepo.FindByID(nodeID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch node: %w", err)
	}

	logger.L.Infof("[Article] Starting AI generation for node: %s (topic=%s)", nodeID, node.Topic)

	// Get ancestors path using NodeContextService
	ancestors, err := h.nodeContextSvc.GetAncestors(nodeID)
	if err != nil {
		logger.L.Errorf("[Article] Failed to get ancestors: %v, continuing without ancestors", err)
		ancestors = nil
	}

	// Get siblings using NodeContextService
	siblings, err := h.nodeContextSvc.GetSiblings(nodeID)
	if err != nil {
		logger.L.Errorf("[Article] Failed to get siblings: %v, continuing without siblings", err)
		siblings = nil
	}

	// Generate article with full context
	content, err := h.aiService.GenerateArticle(node.Topic, node.Description, ancestors, siblings, modelID)
	if err != nil {
		return nil, fmt.Errorf("%w", err)
	}

	article := &model.Article{
		ID:        uuid.New(),
		NodeID:    uuid.MustParse(nodeID),
		Title:     node.Topic + " 知识点详解",
		Content:   content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.articleRepo.Create(article); err != nil {
		return nil, fmt.Errorf("failed to save article: %w", err)
	}

	logger.L.Infof("[Article] Article created successfully: %s", article.ID)
	return article, nil
}
