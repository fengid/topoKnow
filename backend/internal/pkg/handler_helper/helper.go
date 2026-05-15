package handler_helper

import (
	"topoknow-backend/internal/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RequireParam 验证路径参数是否存在
func RequireParam(c *gin.Context, paramName string) (string, bool) {
	value := c.Param(paramName)
	if value == "" {
		response.BadRequest(c, paramName+" is required")
		return "", false
	}
	return value, true
}

// HandleRepositoryError 统一处理 Repository 错误
// 返回 true 表示已处理错误，调用方应直接返回
func HandleRepositoryError(c *gin.Context, err error, notFoundMsg, internalMsg string) bool {
	if err == nil {
		return false
	}

	if err == gorm.ErrRecordNotFound {
		response.NotFound(c, notFoundMsg)
		return true
	}

	response.InternalError(c, internalMsg)
	return true
}

// ExecuteWithErrorHandling 执行操作并统一处理错误
func ExecuteWithErrorHandling(c *gin.Context, operation func() (any, error), errorMsg string) bool {
	result, err := operation()
	if err != nil {
		response.InternalError(c, errorMsg)
		return false
	}

	response.Success(c, result)
	return true
}
