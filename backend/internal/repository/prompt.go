package repository

import (
	"topoknow-backend/internal/model"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PromptRepository struct {
	*BaseRepository[model.Prompt]
}

func NewPromptRepository(db *gorm.DB) *PromptRepository {
	return &PromptRepository{
		BaseRepository: NewBaseRepository[model.Prompt](db),
	}
}

func (r *PromptRepository) FindByID(id uuid.UUID) (*model.Prompt, error) {
	return r.FindOneByCondition("id = ?", id)
}

func (r *PromptRepository) FindByName(name string) (*model.Prompt, error) {
	return r.FindOneByCondition("name = ? AND is_active = ?", name, true)
}

func (r *PromptRepository) FindByCategory(category string) ([]model.Prompt, error) {
	var prompts []model.Prompt
	err := r.DB().Where("category = ? AND is_active = ?", category, true).
		Order("created_at DESC").
		Find(&prompts).Error
	return prompts, err
}

func (r *PromptRepository) FindAllWithPagination(page, pageSize int) ([]model.Prompt, int64, error) {
	var prompts []model.Prompt
	var total int64

	if err := r.DB().Model(&model.Prompt{}).Where("is_active = ?", true).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count prompts: %w", err)
	}

	offset := (page - 1) * pageSize
	err := r.DB().Where("is_active = ?", true).
		Order("category, name").
		Offset(offset).
		Limit(pageSize).
		Find(&prompts).Error

	return prompts, total, err
}

// SyncDefault 同步默认提示词（版本号比较）
func (r *PromptRepository) SyncDefault(name, category, template string, codeVersion int) (*model.Prompt, error) {
	prompt, err := r.FindByName(name)
	if err != nil {
		// 不存在，创建
		newPrompt := &model.Prompt{
			Name:      name,
			Category:  category,
			Template:  template,
			Variables: "[]",
			Version:   codeVersion,
			IsActive:  true,
		}
		if err := r.Create(newPrompt); err != nil {
			return nil, err
		}
		return newPrompt, nil
	}

	// 存在，代码版本更高则更新
	if codeVersion > prompt.Version {
		prompt.Template = template
		prompt.Version = codeVersion
		if err := r.Update(prompt); err != nil {
			return nil, err
		}
	}
	return prompt, nil
}
