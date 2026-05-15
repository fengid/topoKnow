package repository

import (
	"topoknow-backend/internal/config"
	"sync"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	db     *gorm.DB
	dbOnce sync.Once
	dbErr  error
)

func InitDB(cfg *config.Config) (*gorm.DB, error) {
	dbOnce.Do(func() {
		db, dbErr = gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
	})
	return db, dbErr
}
