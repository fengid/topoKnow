package repository

import (
	"topoknow-backend/internal/model"

	"gorm.io/gorm"
)

type QuestionRepository struct {
	*BaseRepository[model.Question]
}

func NewQuestionRepository(db *gorm.DB) *QuestionRepository {
	return &QuestionRepository{
		BaseRepository: NewBaseRepository[model.Question](db),
	}
}

func (r *QuestionRepository) Create(question *model.Question) error {
	// 将 Go slice 转换为 PostgreSQL 数组格式
	if question.Tags != nil {
		tagsStr := model.SliceToPGArray([]string(question.Tags))
		return r.DB().Exec("INSERT INTO questions (id, node_id, question, answer, tags, source, created_at) VALUES (?, ?, ?, ?, ?::text[], ?, ?)",
			question.ID, question.NodeID, question.Question, question.Answer, tagsStr, question.Source, question.CreatedAt).Error
	}
	return r.BaseRepository.Create(question)
}

func (r *QuestionRepository) FindByNodeID(nodeID string) ([]model.Question, error) {
	var questions []model.Question
	err := r.DB().Where("node_id = ?", nodeID).
		Order("created_at DESC").
		Find(&questions).Error
	return questions, err
}

// GetAllQuestionsByNodeID 获取节点的所有练习题文本（用于 AI 去重）
func (r *QuestionRepository) GetAllQuestionsByNodeID(nodeID string) ([]string, error) {
	var questions []model.Question
	err := r.DB().Select("question").Where("node_id = ?", nodeID).Find(&questions).Error
	if err != nil {
		return nil, err
	}

	result := make([]string, len(questions))
	for i, q := range questions {
		result[i] = q.Question
	}
	return result, nil
}
