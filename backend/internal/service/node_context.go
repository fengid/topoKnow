package service

import (
	"fmt"

	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/logger"
	"topoknow-backend/internal/repository"
)

// NodeContextService 提供节点上下文查询服务
type NodeContextService struct {
	nodeRepo *repository.NodeRepository
	treeRepo *repository.TreeRepository
}

func NewNodeContextService(nodeRepo *repository.NodeRepository, treeRepo *repository.TreeRepository) *NodeContextService {
	return &NodeContextService{
		nodeRepo: nodeRepo,
		treeRepo: treeRepo,
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

// BuildExpandContext 构建节点展开所需的完整上下文（用于 AI 子节点生成）
func (s *NodeContextService) BuildExpandContext(nodeID string) (*model.Node, []model.Node, *model.ExpandContext, error) {
	parentNode, err := s.nodeRepo.FindByID(nodeID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("node not found: %w", err)
	}

	existingChildren, err := s.nodeRepo.FindChildren(nodeID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to fetch children: %w", err)
	}

	existingSiblings := make([]model.SiblingInfo, 0, len(existingChildren))
	for _, child := range existingChildren {
		existingSiblings = append(existingSiblings, model.SiblingInfo{
			Topic:       child.Topic,
			Description: child.Description,
			Importance:  child.Importance,
		})
	}

	var ancestors []model.AncestorInfo
	ancestorsNodes, err := s.nodeRepo.FindAncestors(nodeID)
	if err != nil {
		logger.L.Errorf("[NodeContext] 查询祖先节点失败: %v", err)
	} else {
		ancestors = make([]model.AncestorInfo, 0, len(ancestorsNodes))
		for _, anc := range ancestorsNodes {
			ancestors = append(ancestors, model.AncestorInfo{
				Topic:       anc.Topic,
				Description: anc.Description,
				Importance:  anc.Importance,
				Difficulty:  anc.Difficulty,
				Depth:       anc.Depth,
			})
		}
	}

	rootTopic := parentNode.Topic
	tree, err := s.treeRepo.FindByID(parentNode.TreeID.String())
	if err != nil {
		logger.L.Errorf("[NodeContext] 查询树信息失败: %v", err)
	} else {
		rootTopic = tree.RootTopic
	}

	// 模式来自树（单一事实来源），决定后续提示词与分层策略
	treeMode := "understanding"
	if tree != nil && tree.Mode != "" {
		treeMode = tree.Mode
	}

	ctx := &model.ExpandContext{
		RootTopic:        rootTopic,
		ParentTopic:      parentNode.Topic,
		ParentDesc:       parentNode.Description,
		ParentImportance: parentNode.Importance,
		ChildDepth:       parentNode.Depth + 1,
		Mode:             treeMode,
		Ancestors:        ancestors,
		ExistingSiblings: existingSiblings,
	}

	return parentNode, existingChildren, ctx, nil
}
