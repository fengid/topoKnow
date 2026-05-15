package handler

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/handler_helper"
	"topoknow-backend/internal/pkg/logger"
	"topoknow-backend/internal/pkg/response"
	"topoknow-backend/internal/repository"
	"topoknow-backend/internal/service"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type QuestionHandler struct {
	questionRepo   *repository.QuestionRepository
	nodeRepo       *repository.NodeRepository
	aiService      *service.AIService
	nodeContextSvc *service.NodeContextService
}

func NewQuestionHandler(
	questionRepo *repository.QuestionRepository,
	nodeRepo *repository.NodeRepository,
	aiService *service.AIService,
	nodeContextSvc *service.NodeContextService,
) *QuestionHandler {
	return &QuestionHandler{
		questionRepo:   questionRepo,
		nodeRepo:       nodeRepo,
		aiService:      aiService,
		nodeContextSvc: nodeContextSvc,
	}
}

func (h *QuestionHandler) List(c *gin.Context) {
	questions, err := h.questionRepo.FindAll()
	if err != nil {
		response.InternalError(c, "Failed to fetch questions")
		return
	}

	response.Success(c, questions)
}

func (h *QuestionHandler) GetByNodeID(c *gin.Context) {
	nodeID, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	questions, err := h.questionRepo.FindByNodeID(nodeID)
	if err != nil {
		response.InternalError(c, "Failed to fetch questions")
		return
	}

	response.Success(c, questions)
}

func (h *QuestionHandler) Create(c *gin.Context) {
	nodeID, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	var req struct {
		Topic string `json:"topic"`
		Model string `json:"model"`
	}
	_ = c.ShouldBindJSON(&req)

	// Get current node info
	node, err := h.nodeRepo.FindByID(nodeID)
	if err != nil {
		response.InternalError(c, "Failed to fetch node")
		return
	}

	// Get existing questions for deduplication
	existingQuestions, err := h.questionRepo.GetAllQuestionsByNodeID(nodeID)
	if err != nil {
		logger.L.Errorf("[Question] Failed to get existing questions: %v", err)
		existingQuestions = []string{}
	}

	// Get ancestors path using NodeContextService
	ancestors, err := h.nodeContextSvc.GetAncestors(nodeID)
	if err != nil {
		logger.L.Errorf("[Question] Failed to get ancestors: %v, continuing without ancestors", err)
		ancestors = nil
	}

	// Generate single question using AI with deduplication
	logger.L.Infof("[Question] Generating question for node: %s (topic=%s), existing count: %d, ancestors count: %d",
		nodeID, node.Topic, len(existingQuestions), len(ancestors))

	result, err := h.aiService.GenerateSingleQuestion(node.Topic, node.Description, ancestors, existingQuestions, req.Model)
	if err != nil {
		logger.L.Errorf("[Question] AI generation failed: %v", err)
		response.InternalError(c, err.Error())
		return
	}

	// Create question
	question := &model.Question{
		ID:        uuid.New(),
		NodeID:    uuid.MustParse(nodeID),
		Question:  result.Question,
		Answer:    result.Answer,
		Tags:      result.Tags,
		Source:    "AI",
		CreatedAt: time.Now(),
	}

	if err := h.questionRepo.Create(question); err != nil {
		response.InternalError(c, "Failed to save question")
		return
	}

	logger.L.Infof("[Question] Question created successfully: %s", question.ID)

	response.Created(c, question)
}

func (h *QuestionHandler) Delete(c *gin.Context) {
	id, ok := handler_helper.RequireParam(c, "id")
	if !ok {
		return
	}

	// Check if question exists
	question, err := h.questionRepo.FindByID(id)
	if err != nil {
		response.NotFound(c, "Question not found")
		return
	}

	if err := h.questionRepo.Delete(id); err != nil {
		response.InternalError(c, "Failed to delete question")
		return
	}

	logger.L.Infof("[Question] Question deleted: %s (node: %s)", id, question.NodeID)

	response.Success(c, nil)
}
