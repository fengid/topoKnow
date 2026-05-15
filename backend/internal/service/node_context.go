package service

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/repository"
)

// NodeContextService 提供节点上下文查询服务
type NodeContextService struct {
	nodeRepo *repository.NodeRepository
}

// NewNodeContextService 创建节点上下文服务
func NewNodeContextService(nodeRepo *repository.NodeRepository) *NodeContextService {
	return &NodeContextService{
		nodeRepo: nodeRepo,
	}
}

// GetAncestors 获取节点的祖先路径（从根到当前节点的父节点）
// 使用递归 CTE 查询避免 N+1 问题
func (s *NodeContextService) GetAncestors(nodeID string) ([]model.AncestorInfo, error) {
	ancestorNodes, err := s.nodeRepo.FindAncestors(nodeID)
	if err != nil {
		return nil, err
	}

	ancestors := make([]model.AncestorInfo, 0, len(ancestorNodes))
	for _, node := range ancestorNodes {
		ancestors = append(ancestors, model.AncestorInfo{
			Topic:      node.Topic,
			Depth:      node.Depth,
			Importance: node.Importance,
		})
	}

	return ancestors, nil
}

// GetSiblings 获取节点的兄弟节点信息
func (s *NodeContextService) GetSiblings(nodeID string) ([]model.SiblingInfo, error) {
	siblingNodes, err := s.nodeRepo.FindSiblings(nodeID)
	if err != nil {
		return nil, err
	}

	siblings := make([]model.SiblingInfo, 0, len(siblingNodes))
	for _, sib := range siblingNodes {
		siblings = append(siblings, model.SiblingInfo{
			Topic:       sib.Topic,
			Description: sib.Description,
			Importance:  sib.Importance,
		})
	}

	return siblings, nil
}

// GetAncestorsForNode 获取指定节点的祖先信息（用于文章/问题生成）
func (s *NodeContextService) GetAncestorsForNode(nodeID string) ([]model.AncestorInfo, error) {
	return s.GetAncestors(nodeID)
}

// GetSiblingsForNode 获取指定节点的兄弟节点信息（用于文章/问题生成）
func (s *NodeContextService) GetSiblingsForNode(nodeID string) ([]model.SiblingInfo, error) {
	return s.GetSiblings(nodeID)
}

// GetNodeWithContext 获取节点及其完整上下文（祖先+兄弟）
func (s *NodeContextService) GetNodeWithContext(nodeID string) (*model.Node, []model.AncestorInfo, []model.SiblingInfo, error) {
	node, err := s.nodeRepo.FindByID(nodeID)
	if err != nil {
		return nil, nil, nil, err
	}

	ancestors, _ := s.GetAncestors(nodeID)
	siblings, _ := s.GetSiblings(nodeID)

	return node, ancestors, siblings, nil
}
