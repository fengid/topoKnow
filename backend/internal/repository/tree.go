package repository

import (
	"topoknow-backend/internal/model"

	"gorm.io/gorm"
)

type TreeRepository struct {
	*BaseRepository[model.Tree]
}

func NewTreeRepository(db *gorm.DB) *TreeRepository {
	return &TreeRepository{
		BaseRepository: NewBaseRepository[model.Tree](db),
	}
}

func (r *TreeRepository) FindAll() ([]model.Tree, error) {
	var trees []model.Tree
	err := r.DB().Order("created_at DESC").Find(&trees).Error
	return trees, err
}

func (r *TreeRepository) FindByIDWithRootNode(id string) (*model.Tree, error) {
	var tree model.Tree
	if err := r.DB().Where("id = ?", id).First(&tree).Error; err != nil {
		return nil, err
	}

	// Find root node (depth = 0)
	var rootNode model.Node
	if err := r.DB().Where("tree_id = ? AND depth = 0", id).First(&rootNode).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return nil, err
		}
	} else {
		tree.RootNode = &rootNode
	}

	// Load all nodes (except root which is already loaded)
	var nodes []model.Node
	if err := r.DB().Where("tree_id = ? AND depth > 0", id).Order("position_order ASC").Find(&nodes).Error; err != nil {
		return nil, err
	}
	tree.Nodes = nodes

	return &tree, nil
}

func (r *TreeRepository) Delete(id string) error {
	return r.DB().Transaction(func(tx *gorm.DB) error {
		// Get all node IDs for this tree
		var nodeIDs []string
		if err := tx.Model(&model.Node{}).Where("tree_id = ?", id).Pluck("id", &nodeIDs).Error; err != nil {
			return err
		}

		if len(nodeIDs) > 0 {
			// Delete all questions for these nodes
			if err := tx.Where("node_id IN ?", nodeIDs).Delete(&model.Question{}).Error; err != nil {
				return err
			}

			// Delete all articles for these nodes
			if err := tx.Where("node_id IN ?", nodeIDs).Delete(&model.Article{}).Error; err != nil {
				return err
			}

			// Delete all nodes
			if err := tx.Where("tree_id = ?", id).Delete(&model.Node{}).Error; err != nil {
				return err
			}
		}

		// Delete the tree itself
		result := tx.Delete(&model.Tree{}, "id = ?", id)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
}

func (r *TreeRepository) FindByRootTopicWithRootNode(rootTopic string) (*model.Tree, error) {
	var tree model.Tree
	err := r.DB().Where("LOWER(root_topic) = LOWER(?)", rootTopic).First(&tree).Error
	if err != nil {
		return nil, err
	}

	// Find root node (depth = 0)
	var rootNode model.Node
	if err := r.DB().Where("tree_id = ? AND depth = 0", tree.ID).First(&rootNode).Error; err != nil {
		return nil, gorm.ErrRecordNotFound
	}
	tree.RootNode = &rootNode

	return &tree, nil
}
