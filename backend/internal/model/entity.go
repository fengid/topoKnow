package model

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// StringArray PostgreSQL text[] 的自定义类型
type StringArray []string

// Scan 实现 sql.Scanner 接口
func (sa *StringArray) Scan(value interface{}) error {
	if value == nil {
		*sa = nil
		return nil
	}

	var err error
	*sa, err = PGArrayToSlice(value.(string))
	return err
}

// SliceToPGArray 将 Go slice 转换为 PostgreSQL 数组格式
func SliceToPGArray(s []string) string {
	if len(s) == 0 {
		return "{}"
	}
	var builder strings.Builder
	builder.WriteString("{")
	for i, v := range s {
		if i > 0 {
			builder.WriteString(",")
		}
		builder.WriteString("\"")
		// 转义反斜杠和双引号以防止 SQL 注入
		escaped := strings.ReplaceAll(v, "\\", "\\\\")
		escaped = strings.ReplaceAll(escaped, "\"", "\\\"")
		builder.WriteString(escaped)
		builder.WriteString("\"")
	}
	builder.WriteString("}")
	return builder.String()
}

// PGArrayToSlice 将 PostgreSQL 数组转换为 Go slice
func PGArrayToSlice(s string) ([]string, error) {
	if s == "{}" || s == "" {
		return nil, nil
	}
	// 移除 { 和 }
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")

	var result []string
	var current string
	inQuote := false

	for _, c := range s {
		switch {
		case c == '"' && !inQuote:
			inQuote = true
		case c == '"' && inQuote:
			inQuote = false
		case c == ',' && !inQuote:
			result = append(result, current)
			current = ""
		default:
			current += string(c)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result, nil
}

// Tree - 知识树
type Tree struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	RootTopic   string    `json:"root_topic" gorm:"not null"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	RootNode    *Node     `json:"root_node,omitempty" gorm:"-"`

	// Preload relationship
	Nodes []Node `json:"nodes,omitempty" gorm:"foreignKey:TreeID;references:ID"`
}

// Node - 知识节点
type Node struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TreeID        uuid.UUID  `json:"tree_id" gorm:"type:uuid;index;not null"`
	ParentID      *uuid.UUID `json:"parent_id" gorm:"type:uuid;index"`
	Topic         string     `json:"topic" gorm:"not null"`
	Description   string     `json:"description"`
	Importance    string     `json:"importance" gorm:"size:20;default:'medium'"` // high, medium, low
	Difficulty    int        `json:"difficulty" gorm:"default:3"`                // 1-5
	Depth         int        `json:"depth" gorm:"not null;default:0"`
	PositionOrder int        `json:"position_order" gorm:"default:0"`
	IsExpanded    *bool     `json:"is_expanded" gorm:"default:true"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	// 计算字段（非持久化）
	HasArticle    bool `json:"has_article" gorm:"-"`
	QuestionCount int  `json:"question_count" gorm:"-"`

	Tree     Tree      `json:"-" gorm:"foreignKey:TreeID"`
	Parent   *Node     `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children []Node    `json:"children,omitempty" gorm:"-"`
	Questions []Question `json:"-" gorm:"foreignKey:NodeID"`
	Article  *Article  `json:"-" gorm:"foreignKey:NodeID"`
}

// Question - 练习题
type Question struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	NodeID    uuid.UUID `json:"node_id" gorm:"type:uuid;index;not null"`
	Question  string    `json:"question" gorm:"not null"`
	Answer    string    `json:"answer" gorm:"type:text"` // Markdown format
	Tags      StringArray `json:"tags" gorm:"type:text[]"`
	Source    string    `json:"source" gorm:"size:100"` // AI or manual
	CreatedAt time.Time `json:"created_at"`

	Node Node `json:"-" gorm:"foreignKey:NodeID"`
}

// Article - 知识点文章（每个节点对应一篇文章）
type Article struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	NodeID    uuid.UUID `json:"node_id" gorm:"type:uuid;index;not null"`
	Title     string    `json:"title" gorm:"not null"`
	Content   string    `json:"content" gorm:"type:text"` // Markdown format
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Node Node `json:"-" gorm:"foreignKey:NodeID"`
}
