package repository

import (
	"gorm.io/gorm"
)

// BaseRepository 泛型基础仓库，提供通用 CRUD 操作
type BaseRepository[T any] struct {
	db *gorm.DB
}

// NewBaseRepository 创建泛型基础仓库
func NewBaseRepository[T any](db *gorm.DB) *BaseRepository[T] {
	return &BaseRepository[T]{db: db}
}

// DB 获取底层数据库连接（供子类使用）
func (r *BaseRepository[T]) DB() *gorm.DB {
	return r.db
}

// Create 创建实体
func (r *BaseRepository[T]) Create(entity *T) error {
	return r.db.Create(entity).Error
}

// FindByID 根据 ID 查找实体
func (r *BaseRepository[T]) FindByID(id string) (*T, error) {
	var entity T
	err := r.db.Where("id = ?", id).First(&entity).Error
	if err != nil {
		return nil, err
	}
	return &entity, nil
}

// FindAll 查找所有实体
func (r *BaseRepository[T]) FindAll() ([]T, error) {
	var entities []T
	err := r.db.Find(&entities).Error
	return entities, err
}

// Update 更新实体
func (r *BaseRepository[T]) Update(entity *T) error {
	return r.db.Save(entity).Error
}

// Delete 根据 ID 删除实体
func (r *BaseRepository[T]) Delete(id string) error {
	var entity T
	return r.db.Delete(&entity, "id = ?", id).Error
}

// FindByCondition 根据条件查找多个实体
func (r *BaseRepository[T]) FindByCondition(condition string, args ...any) ([]T, error) {
	var entities []T
	err := r.db.Where(condition, args...).Find(&entities).Error
	return entities, err
}

// FindOneByCondition 根据条件查找单个实体
func (r *BaseRepository[T]) FindOneByCondition(condition string, args ...any) (*T, error) {
	var entity T
	err := r.db.Where(condition, args...).First(&entity).Error
	if err != nil {
		return nil, err
	}
	return &entity, nil
}

// CountByCondition 根据条件统计数量
func (r *BaseRepository[T]) CountByCondition(condition string, args ...any) (int64, error) {
	var count int64
	var entity T
	err := r.db.Model(&entity).Where(condition, args...).Count(&count).Error
	return count, err
}

// DeleteByCondition 根据条件删除
func (r *BaseRepository[T]) DeleteByCondition(condition string, args ...any) error {
	var entity T
	return r.db.Where(condition, args...).Delete(&entity).Error
}
