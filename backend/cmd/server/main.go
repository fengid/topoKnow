package main

import (
	"os"

	"topoknow-backend/internal/config"
	"topoknow-backend/internal/pkg/logger"
	"topoknow-backend/internal/server"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		// Logger not yet initialized, use panic
		panic("Failed to load config: " + err.Error())
	}

	// Initialize structured logger
	logger.Init(cfg.App.Mode)
	defer logger.Sync()

	// Create and start server
	srv := server.New(cfg)
	if err := srv.Start(); err != nil {
		logger.L.Fatalf("Failed to start server: %v", err)
	}
}

func init() {
	// Ensure data directories exist
	dirs := []string{
		"uploads",
		"logs",
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			// Logger not yet initialized here, use stderr
			os.Stderr.WriteString("Warning: failed to create directory " + dir + ": " + err.Error() + "\n")
		}
	}
}
