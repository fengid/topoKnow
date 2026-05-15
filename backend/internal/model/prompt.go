package model

import (
	"time"

	"github.com/google/uuid"
)

// Prompt 提示词模板
type Prompt struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string     `json:"name" gorm:"size:100;not null;index"`         // 唯一标识
	Category    string     `json:"category" gorm:"size:50;not null;index"`      // 分类
	Description string     `json:"description" gorm:"type:text"`                // 描述
	Template    string     `json:"template" gorm:"type:text;not null"`          // 提示词模板
	Variables   string     `json:"variables" gorm:"type:jsonb"`                 // 变量定义 JSON
	Version     int        `json:"version" gorm:"default:1"`                    // 版本号
	IsActive    bool       `json:"is_active" gorm:"default:true"`               // 是否激活
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// CreatePromptRequest 创建提示词请求
type CreatePromptRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`
	Category    string `json:"category" binding:"required,min=1,max=50"`
	Description string `json:"description"`
	Template    string `json:"template" binding:"required,min=10"`
	Variables   string `json:"variables"` // JSON string
	IsActive    bool   `json:"is_active"`
}

// UpdatePromptRequest 更新提示词请求
type UpdatePromptRequest struct {
	Name        *string `json:"name" binding:"omitempty,min=1,max=100"`
	Category    *string `json:"category" binding:"omitempty,min=1,max=50"`
	Description *string `json:"description"`
	Template    *string `json:"template" binding:"omitempty,min=10"`
	Variables   *string `json:"variables"` // JSON string
	IsActive    *bool   `json:"is_active"`
}

// GeneratePromptRequest AI 生成提示词请求
type GeneratePromptRequest struct {
	Category    string `json:"category" binding:"required"`
	Task        string `json:"task" binding:"required"`          // 任务描述
	Description string `json:"description"`                      // 详细描述
	Examples    string `json:"examples"`                         // 示例输入输出
}
