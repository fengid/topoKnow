package repository

import (
	"topoknow-backend/internal/model"

	"gorm.io/gorm"
)

type ArticleRepository struct {
	*BaseRepository[model.Article]
}

func NewArticleRepository(db *gorm.DB) *ArticleRepository {
	return &ArticleRepository{
		BaseRepository: NewBaseRepository[model.Article](db),
	}
}

func (r *ArticleRepository) FindByNodeID(nodeID string) (*model.Article, error) {
	return r.FindOneByCondition("node_id = ?", nodeID)
}

func (r *ArticleRepository) ExistsByNodeID(nodeID string) (bool, error) {
	count, err := r.CountByCondition("node_id = ?", nodeID)
	return count > 0, err
}

func (r *ArticleRepository) DeleteByNodeID(nodeID string) error {
	return r.DeleteByCondition("node_id = ?", nodeID)
}
