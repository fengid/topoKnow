package model

// Request DTOs

// SingleQuestionResponse - AI 生成的单个练习题
type SingleQuestionResponse struct {
	Question string   `json:"question"`
	Answer   string   `json:"answer"`
	Tags     []string `json:"tags"`
}

type CreateTreeRequest struct {
	RootTopic string `json:"root_topic" binding:"required"`
	PromptID  string `json:"prompt_id"` // 可选，提示词 ID
}

type CreateNodeRequest struct {
	TreeID      string  `json:"tree_id" binding:"required"`
	ParentID    *string `json:"parent_id"`
	Topic       string  `json:"topic" binding:"required"`
	Description string  `json:"description"`
	Importance  string  `json:"importance" binding:"omitempty,oneof=high medium low"`
	Difficulty  int     `json:"difficulty" binding:"omitempty,min=1,max=5"`
}

type UpdateNodeRequest struct {
	Topic       *string `json:"topic"`
	Description *string `json:"description"`
	Importance  *string `json:"importance" binding:"omitempty,oneof=high medium low"`
	Difficulty  *int    `json:"difficulty" binding:"omitempty,min=1,max=5"`
}

type GenerateQuizRequest struct {
	Topic   string   `json:"topic" binding:"required"`
	Count   int      `json:"count" binding:"omitempty,min=1,max=20"`
	Level   string   `json:"level" binding:"omitempty,oneof=basic intermediate advanced"`
	Tags    []string `json:"tags,omitempty"`
}

// Response DTOs

type QuizResponse struct {
	Questions []QuizQuestion `json:"questions"`
}

type QuizQuestion struct {
	Question string   `json:"question"`
	Answer   string   `json:"answer"`
	Topic    string   `json:"topic"`
	Tags     []string `json:"tags"`
}

// RootNodeInfo - AI 生成的根节点信息
type RootNodeInfo struct {
	Description  string `json:"description"`
	Importance   string `json:"importance"` // high, medium, low
	Difficulty   int    `json:"difficulty"` // 1-5
}

// ChildNodeInfo - AI 生成的子节点信息
type ChildNodeInfo struct {
	Topic       string `json:"topic"`
	Description string `json:"description"`
	Importance  string `json:"importance"` // high, medium, low
	Difficulty  int    `json:"difficulty"` // 1-5
}

// AncestorInfo - 祖先节点信息，用于 AI 生成子节点时的上下文
type AncestorInfo struct {
	Topic       string `json:"topic"`
	Description string `json:"description"`
	Importance  string `json:"importance"`
	Difficulty  int    `json:"difficulty"`
	Depth       int    `json:"depth"`
}

// SiblingInfo - 兄弟节点信息，用于子节点生成和文章生成的上下文
type SiblingInfo struct {
	Topic       string `json:"topic"`
	Description string `json:"description"`
	Importance  string `json:"importance"`
}

// ExpandContext - AI 生成子节点时的完整上下文
type ExpandContext struct {
	RootTopic        string
	ParentTopic      string
	ParentDesc       string
	ParentImportance string
	ChildDepth       int
	Ancestors        []AncestorInfo
	ExistingSiblings []SiblingInfo
}
