package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"topoknow-backend/internal/pkg/response"
	"topoknow-backend/internal/service"

	"github.com/gin-gonic/gin"
)

type BatchGenHandler struct {
	batchService *service.BatchGenService
}

func NewBatchGenHandler(batchService *service.BatchGenService) *BatchGenHandler {
	return &BatchGenHandler{batchService: batchService}
}

func (h *BatchGenHandler) Start(c *gin.Context) {
	treeID := c.Param("id")

	var req struct {
		NodeID string `json:"node_id" binding:"required"`
		Layers int    `json:"layers" binding:"required,min=1,max=5"`
		Model  string `json:"model"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	task, err := h.batchService.Start(treeID, req.NodeID, req.Layers, req.Model)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, task)
}

func (h *BatchGenHandler) Stream(c *gin.Context) {
	treeID := c.Param("id")

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	// Send initial snapshot if a task exists
	task, items, err := h.batchService.Status(treeID)
	if err == nil && task != nil {
		snapshot, _ := json.Marshal(map[string]any{
			"type": "status_snapshot",
			"payload": map[string]any{
				"task":  task,
				"items": items,
			},
		})
		fmt.Fprintf(c.Writer, "data: %s\n\n", snapshot)
		c.Writer.(http.Flusher).Flush()
	}

	// Subscribe to events
	sub := h.batchService.Subscribe(treeID)
	defer h.batchService.Unsubscribe(treeID, sub)

	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case event, ok := <-sub:
			if !ok {
				return
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(c.Writer, "data: %s\n\n", data)
			c.Writer.(http.Flusher).Flush()

		case <-heartbeat.C:
			fmt.Fprintf(c.Writer, ": heartbeat\n\n")
			c.Writer.(http.Flusher).Flush()

		case <-c.Request.Context().Done():
			return
		}
	}
}

func (h *BatchGenHandler) Cancel(c *gin.Context) {
	treeID := c.Param("id")

	if err := h.batchService.Cancel(treeID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *BatchGenHandler) Retry(c *gin.Context) {
	treeID := c.Param("id")
	itemID := c.Param("itemId")

	if err := h.batchService.Retry(treeID, itemID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *BatchGenHandler) Status(c *gin.Context) {
	treeID := c.Param("id")

	task, items, err := h.batchService.Status(treeID)
	if err != nil {
		response.Success(c, gin.H{
			"task":  nil,
			"items": []any{},
		})
		return
	}

	response.Success(c, gin.H{
		"task":  task,
		"items": items,
	})
}
