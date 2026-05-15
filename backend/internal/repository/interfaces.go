package repository

import (
	"topoknow-backend/internal/model"

	"github.com/google/uuid"
)

// TreeRepositoryInterface 知识树仓库接口
type TreeRepositoryInterface interface {
	Create(tree *model.Tree) error
	FindByID(id string) (*model.Tree, error)
	FindAll() ([]model.Tree, error)
	FindByIDWithRootNode(id string) (*model.Tree, error)
	FindByRootTopicWithRootNode(rootTopic string) (*model.Tree, error)
	Delete(id string) error
}

// NodeRepositoryInterface 节点仓库接口
type NodeRepositoryInterface interface {
	Create(node *model.Node) error
	FindByID(id string) (*model.Node, error)
	FindByIDWithChildren(id string) (*model.Node, error)
	FindChildren(parentID string) ([]model.Node, error)
	Update(node *model.Node) error
	UpdateExpanded(id string, isExpanded bool) error
	Delete(id string) error
	DeleteChildren(parentID string) error
	GetMaxPositionOrder(parentID *string) (int, error)
	FindSiblings(nodeID string) ([]model.Node, error)
	FindAncestors(nodeID string) ([]model.Node, error)
}

// ArticleRepositoryInterface 文章仓库接口
type ArticleRepositoryInterface interface {
	Create(article *model.Article) error
	FindByNodeID(nodeID string) (*model.Article, error)
	ExistsByNodeID(nodeID string) (bool, error)
	DeleteByNodeID(nodeID string) error
}

// QuestionRepositoryInterface 练习题仓库接口
type QuestionRepositoryInterface interface {
	Create(question *model.Question) error
	FindByID(id string) (*model.Question, error)
	FindByNodeID(nodeID string) ([]model.Question, error)
	Delete(id string) error
	GetAllQuestionsByNodeID(nodeID string) ([]string, error)
}

// PromptRepositoryInterface 提示词仓库接口
type PromptRepositoryInterface interface {
	Create(prompt *model.Prompt) error
	Update(prompt *model.Prompt) error
	FindByID(id uuid.UUID) (*model.Prompt, error)
	FindByName(name string) (*model.Prompt, error)
	FindByCategory(category string) ([]model.Prompt, error)
	FindAllWithPagination(page, pageSize int) ([]model.Prompt, int64, error)
	SyncDefault(name, category, template string, codeVersion int) (*model.Prompt, error)
}

// 编译时接口实现检查
var (
	_ TreeRepositoryInterface     = (*TreeRepository)(nil)
	_ NodeRepositoryInterface     = (*NodeRepository)(nil)
	_ ArticleRepositoryInterface  = (*ArticleRepository)(nil)
	_ QuestionRepositoryInterface = (*QuestionRepository)(nil)
	_ PromptRepositoryInterface   = (*PromptRepository)(nil)
)
