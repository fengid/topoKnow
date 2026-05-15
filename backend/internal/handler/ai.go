package handler

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/response"
	"topoknow-backend/internal/service"

	"github.com/gin-gonic/gin"
)

type AIHandler struct {
	aiService *service.AIService
	factory   *service.AIClientFactory
}

func NewAIHandler(aiService *service.AIService, factory *service.AIClientFactory) *AIHandler {
	return &AIHandler{aiService: aiService, factory: factory}
}

func (h *AIHandler) GetModels(c *gin.Context) {
	models := h.factory.GetAvailableModels()
	defaultModel := h.factory.GetDefaultModelID()
	response.Success(c, gin.H{
		"models":        models,
		"default_model": defaultModel,
	})
}

func (h *AIHandler) GeneratePath(c *gin.Context) {
	var req struct {
		Topic  string `json:"topic" binding:"required"`
		Level  string `json:"level"`
		Depth  int    `json:"depth"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if req.Level == "" {
		req.Level = "intermediate"
	}
	if req.Depth == 0 {
		req.Depth = 3
	}

	// TODO: Implement full path generation
	response.Success(c, gin.H{
		"topic": req.Topic,
		"path": []gin.H{
			{"name": req.Topic + " 基础", "depth": 0},
			{"name": req.Topic + " 进阶", "depth": 1},
			{"name": req.Topic + " 高级", "depth": 2},
		},
	})
}

func (h *AIHandler) GenerateQuiz(c *gin.Context) {
	var req model.GenerateQuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if req.Count == 0 {
		req.Count = 5
	}
	if req.Level == "" {
		req.Level = "intermediate"
	}

	quiz, err := h.aiService.GenerateQuiz(req)
	if err != nil {
		response.InternalError(c, "Failed to generate quiz")
		return
	}

	response.Success(c, quiz)
}

func (h *AIHandler) ExplainNode(c *gin.Context) {
	var req struct {
		Topic string `json:"topic" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	explanation, err := h.aiService.ExplainNode(req.Topic)
	if err != nil {
		response.InternalError(c, "Failed to generate explanation")
		return
	}

	response.Success(c, gin.H{
		"topic":      req.Topic,
		"explanation": explanation,
	})
}
