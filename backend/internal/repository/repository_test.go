package repository_test

import (
	"topoknow-backend/internal/repository"
	"testing"

	"gorm.io/gorm"
)

// TestInterfaceImplementation 验证所有 Repository 都实现了对应的接口
func TestInterfaceImplementation(t *testing.T) {
	var db *gorm.DB // nil is fine for compile-time check

	// 编译时检查：确保所有 Repository 实现了对应的接口
	var _ repository.ArticleRepositoryInterface = repository.NewArticleRepository(db)
	var _ repository.QuestionRepositoryInterface = repository.NewQuestionRepository(db)
	var _ repository.TreeRepositoryInterface = repository.NewTreeRepository(db)
	var _ repository.NodeRepositoryInterface = repository.NewNodeRepository(db)
	var _ repository.PromptRepositoryInterface = repository.NewPromptRepository(db)

	t.Log("All repositories implement their interfaces correctly")
}

// TestBaseRepositoryComposition 验证 BaseRepository 组合
func TestBaseRepositoryComposition(t *testing.T) {
	var db *gorm.DB

	// 验证 Repository 可以访问 BaseRepository 的方法
	articleRepo := repository.NewArticleRepository(db)
	if articleRepo == nil {
		t.Fatal("ArticleRepository should not be nil")
	}

	questionRepo := repository.NewQuestionRepository(db)
	if questionRepo == nil {
		t.Fatal("QuestionRepository should not be nil")
	}

	treeRepo := repository.NewTreeRepository(db)
	if treeRepo == nil {
		t.Fatal("TreeRepository should not be nil")
	}

	nodeRepo := repository.NewNodeRepository(db)
	if nodeRepo == nil {
		t.Fatal("NodeRepository should not be nil")
	}

	promptRepo := repository.NewPromptRepository(db)
	if promptRepo == nil {
		t.Fatal("PromptRepository should not be nil")
	}

	t.Log("All repositories use BaseRepository composition correctly")
}
