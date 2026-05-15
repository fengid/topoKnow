package handler

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/logger"
	"topoknow-backend/internal/repository"
)

// PopulateNodeMetadata 填充节点的文章和题目元数据
func PopulateNodeMetadata(nodes []*model.Node, nodeRepo *repository.NodeRepository) {
	if len(nodes) == 0 {
		return
	}

	// 收集所有节点 ID
	nodeIDs := make([]string, 0, len(nodes))
	for _, node := range nodes {
		nodeIDs = append(nodeIDs, node.ID.String())
	}

	// 批量查询文章存在性
	articleExists, err := nodeRepo.GetArticleExistsByNodeIDs(nodeIDs)
	if err != nil {
		logger.L.Warnf("[NodeHelper] Failed to get article exists: %v", err)
		articleExists = make(map[string]bool)
	}

	// 批量查询题目数量
	questionCounts, err := nodeRepo.GetQuestionCountsByNodeIDs(nodeIDs)
	if err != nil {
		logger.L.Warnf("[NodeHelper] Failed to get question counts: %v", err)
		questionCounts = make(map[string]int)
	}

	// 填充计算字段
	for _, node := range nodes {
		nodeIDStr := node.ID.String()
		node.HasArticle = articleExists[nodeIDStr]
		node.QuestionCount = questionCounts[nodeIDStr]
	}
}
