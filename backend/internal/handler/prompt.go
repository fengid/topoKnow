package handler

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/response"
	"topoknow-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PromptHandler struct {
	promptSvc *service.PromptService
}

func NewPromptHandler(promptSvc *service.PromptService) *PromptHandler {
	return &PromptHandler{promptSvc: promptSvc}
}

func (h *PromptHandler) List(c *gin.Context) {
	page := parseInt(c.DefaultQuery("page", "1"))
	pageSize := parseInt(c.DefaultQuery("page_size", "20"))

	// 边界验证
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	prompts, total, err := h.promptSvc.List(page, pageSize)
	if err != nil {
		response.InternalError(c, "Failed to fetch prompts")
		return
	}

	response.SuccessWithMeta(c, prompts, response.PaginationMeta{
		Total:  int(total),
		Page:   page,
		Limit:  pageSize,
	})
}

func (h *PromptHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid prompt ID")
		return
	}

	prompt, err := h.promptSvc.GetByID(id)
	if err != nil {
		response.NotFound(c, "Prompt not found")
		return
	}

	response.Success(c, prompt)
}

func (h *PromptHandler) GetByName(c *gin.Context) {
	name := c.Param("name")

	prompt, err := h.promptSvc.GetByName(name)
	if err != nil {
		response.NotFound(c, "Prompt not found")
		return
	}

	response.Success(c, prompt)
}

func (h *PromptHandler) GetByCategory(c *gin.Context) {
	category := c.Param("category")

	prompts, err := h.promptSvc.GetByCategory(category)
	if err != nil {
		response.InternalError(c, "Failed to fetch prompts")
		return
	}

	response.Success(c, prompts)
}

func (h *PromptHandler) Create(c *gin.Context) {
	var req model.CreatePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	prompt, err := h.promptSvc.Create(&req)
	if err != nil {
		response.InternalError(c, "Failed to create prompt")
		return
	}

	response.Created(c, prompt)
}

func (h *PromptHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid prompt ID")
		return
	}

	var req model.UpdatePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	prompt, err := h.promptSvc.Update(id, &req)
	if err != nil {
		response.InternalError(c, "Failed to update prompt")
		return
	}

	response.Success(c, prompt)
}

func (h *PromptHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid prompt ID")
		return
	}

	if err := h.promptSvc.Delete(id); err != nil {
		response.InternalError(c, "Failed to delete prompt")
		return
	}

	response.Success(c, nil)
}

func (h *PromptHandler) Render(c *gin.Context) {
	var req struct {
		Template string            `json:"template" binding:"required"`
		Values   map[string]string `json:"values" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result := h.promptSvc.RenderTemplate(req.Template, req.Values)
	response.Success(c, gin.H{"rendered": result})
}

func (h *PromptHandler) Generate(c *gin.Context) {
	var req model.GeneratePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	prompt, err := h.promptSvc.GeneratePrompt(&req)
	if err != nil {
		response.InternalError(c, "Failed to generate prompt: "+err.Error())
		return
	}

	response.Success(c, prompt)
}

func (h *PromptHandler) Optimize(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid prompt ID")
		return
	}

	var req struct {
		Feedback string `json:"feedback" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	prompt, err := h.promptSvc.OptimizePrompt(id, req.Feedback)
	if err != nil {
		response.InternalError(c, "Failed to optimize prompt: "+err.Error())
		return
	}

	response.Success(c, prompt)
}

func (h *PromptHandler) InitDefaults(c *gin.Context) {
	if err := h.promptSvc.InitDefaultPrompts(); err != nil {
		response.InternalError(c, "Failed to initialize default prompts")
		return
	}

	response.Success(c, gin.H{"message": "Default prompts initialized"})
}

// parseInt 辅助函数
func parseInt(s string) int {
	var result int
	for _, c := range s {
		if c < '0' || c > '9' {
			break
		}
		result = result*10 + int(c-'0')
	}
	return result
}
