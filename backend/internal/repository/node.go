package repository

import (
	"topoknow-backend/internal/model"

	"gorm.io/gorm"
)

type NodeRepository struct {
	*BaseRepository[model.Node]
}

func NewNodeRepository(db *gorm.DB) *NodeRepository {
	return &NodeRepository{
		BaseRepository: NewBaseRepository[model.Node](db),
	}
}

func (r *NodeRepository) FindByIDWithChildren(id string) (*model.Node, error) {
	var node model.Node
	if err := r.DB().Where("id = ?", id).First(&node).Error; err != nil {
		return nil, err
	}

	// Get children
	var children []model.Node
	if err := r.DB().Where("parent_id = ?", id).Order("position_order ASC").Find(&children).Error; err != nil {
		return nil, err
	}
	node.Children = children

	return &node, nil
}

func (r *NodeRepository) FindChildren(parentID string) ([]model.Node, error) {
	var nodes []model.Node
	err := r.DB().Where("parent_id = ?", parentID).
		Order("position_order ASC").
		Find(&nodes).Error
	return nodes, err
}

func (r *NodeRepository) UpdateExpanded(id string, isExpanded bool) error {
	return r.DB().Model(&model.Node{}).Where("id = ?", id).Update("is_expanded", isExpanded).Error
}

func (r *NodeRepository) Delete(id string) error {
	return r.DB().Transaction(func(tx *gorm.DB) error {
		return deleteNodeAndChildren(tx, id)
	})
}

func deleteNodeAndChildren(tx *gorm.DB, id string) error {
	// Get all children
	var children []model.Node
	if err := tx.Where("parent_id = ?", id).Find(&children).Error; err != nil {
		return err
	}

	// Delete children first (recursive)
	for _, child := range children {
		if err := deleteNodeAndChildren(tx, child.ID.String()); err != nil {
			return err
		}
	}

	// Delete questions for this node
	if err := tx.Where("node_id = ?", id).Delete(&model.Question{}).Error; err != nil {
		return err
	}

	// Delete article for this node
	if err := tx.Where("node_id = ?", id).Delete(&model.Article{}).Error; err != nil {
		return err
	}

	// Delete this node
	return tx.Delete(&model.Node{}, "id = ?", id).Error
}

func (r *NodeRepository) GetMaxPositionOrder(parentID *string) (int, error) {
	var maxOrder int
	err := r.DB().Model(&model.Node{}).
		Where("parent_id = ?", parentID).
		Select("COALESCE(MAX(position_order), -1)").
		Scan(&maxOrder).Error
	return maxOrder, err
}

// DeleteChildren 删除指定节点的所有后代节点及其关联数据，保留节点本身
func (r *NodeRepository) DeleteChildren(parentID string) error {
	return r.DB().Transaction(func(tx *gorm.DB) error {
		var allIDs []string
		queue := []string{parentID}
		for len(queue) > 0 {
			var childIDs []string
			if err := tx.Model(&model.Node{}).
				Where("parent_id IN ?", queue).
				Pluck("id", &childIDs).Error; err != nil {
				return err
			}
			if len(childIDs) == 0 {
				break
			}
			allIDs = append(allIDs, childIDs...)
			queue = childIDs
		}
		if len(allIDs) == 0 {
			return nil
		}

		if err := tx.Where("node_id IN ?", allIDs).Delete(&model.Question{}).Error; err != nil {
			return err
		}
		if err := tx.Where("node_id IN ?", allIDs).Delete(&model.Article{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id IN ?", allIDs).Delete(&model.Node{}).Error; err != nil {
			return err
		}

		return tx.Model(&model.Node{}).Where("id = ?", parentID).Update("is_expanded", false).Error
	})
}

// FindSiblings 获取同一父节点下的兄弟节点（不包含自身）
func (r *NodeRepository) FindSiblings(nodeID string) ([]model.Node, error) {
	node, err := r.FindByID(nodeID)
	if err != nil {
		return nil, err
	}
	if node.ParentID == nil {
		return nil, nil
	}
	var siblings []model.Node
	err = r.DB().Where("parent_id = ? AND id != ?", *node.ParentID, nodeID).
		Order("position_order ASC").
		Find(&siblings).Error
	return siblings, err
}

// FindAncestors 获取从根节点到指定节点的祖先链路（不包含指定节点）
func (r *NodeRepository) FindAncestors(nodeID string) ([]model.Node, error) {
	var ancestors []model.Node

	err := r.DB().Raw(`
		WITH RECURSIVE ancestor_tree AS (
			SELECT n.*, 0 as level
			FROM nodes n
			WHERE n.id = ?
			UNION ALL
			SELECT p.*, at.level + 1
			FROM nodes p
			INNER JOIN ancestor_tree at ON p.id = at.parent_id
		)
		SELECT * FROM ancestor_tree WHERE level > 0 ORDER BY level DESC
	`, nodeID).Scan(&ancestors).Error

	return ancestors, err
}

// GetArticleExistsByNodeIDs 批量查询哪些节点有文章
func (r *NodeRepository) GetArticleExistsByNodeIDs(nodeIDs []string) (map[string]bool, error) {
	if len(nodeIDs) == 0 {
		return make(map[string]bool), nil
	}

	var results []struct {
		NodeID string `gorm:"column:node_id"`
	}

	err := r.DB().Table("articles").
		Select("DISTINCT node_id").
		Where("node_id IN ?", nodeIDs).
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	existsMap := make(map[string]bool)
	for _, result := range results {
		existsMap[result.NodeID] = true
	}

	return existsMap, nil
}

// GetQuestionCountsByNodeIDs 批量查询每个节点的题目数量
func (r *NodeRepository) GetQuestionCountsByNodeIDs(nodeIDs []string) (map[string]int, error) {
	if len(nodeIDs) == 0 {
		return make(map[string]int), nil
	}

	var results []struct {
		NodeID string `gorm:"column:node_id"`
		Count  int    `gorm:"column:count"`
	}

	err := r.DB().Table("questions").
		Select("node_id, COUNT(*) as count").
		Where("node_id IN ?", nodeIDs).
		Group("node_id").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	countMap := make(map[string]int)
	for _, result := range results {
		countMap[result.NodeID] = result.Count
	}

	return countMap, nil
}
