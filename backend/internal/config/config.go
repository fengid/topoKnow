package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	App      AppConfig      `yaml:"app"`
	Database DatabaseConfig `yaml:"database"`
	AI       AIConfig       `yaml:"ai"`
}

type AppConfig struct {
	Host        string   `yaml:"host"`
	Port        int      `yaml:"port"`
	Mode        string   `yaml:"mode"`
	CORSOrigins []string `yaml:"cors_origins"`
}

type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	Name     string `yaml:"name"`
	SSLMode  string `yaml:"sslmode"`
}

type AIConfig struct {
	// 旧字段（向后兼容）
	Provider    string  `yaml:"provider"`
	APIKey      string  `yaml:"api_key"`
	Model       string  `yaml:"model"`
	MaxTokens   int     `yaml:"max_tokens"`
	Temperature float64 `yaml:"temperature"`

	// 新字段：多 provider 多模型
	DefaultModel string                    `yaml:"default_model"`
	Models       []ModelConfig             `yaml:"models"`
	Providers    map[string]ProviderConfig `yaml:"providers"`
}

type ModelConfig struct {
	ID          string  `yaml:"id"`
	Provider    string  `yaml:"provider"`
	DisplayName string  `yaml:"display_name"`
	MaxTokens   int     `yaml:"max_tokens"`
	Temperature float64 `yaml:"temperature"`
}

type ProviderConfig struct {
	APIKey  string `yaml:"api_key"`
	BaseURL string `yaml:"base_url"`
}

func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
	)
}

func Load() (*Config, error) {
	configPaths := []string{
		"config.yaml",
		"./config.yaml",
		"/app/config.yaml",
	}

	for _, path := range configPaths {
		cfg, err := loadFromFile(path)
		if err == nil {
			// 向后兼容：旧配置迁移到新结构
			if len(cfg.AI.Models) == 0 && cfg.AI.Provider != "" {
				cfg.AI.DefaultModel = cfg.AI.Model
				cfg.AI.Models = []ModelConfig{
					{
						ID:          cfg.AI.Model,
						Provider:    cfg.AI.Provider,
						DisplayName: cfg.AI.Provider + " " + cfg.AI.Model,
						MaxTokens:   cfg.AI.MaxTokens,
						Temperature: cfg.AI.Temperature,
					},
				}
				cfg.AI.Providers = map[string]ProviderConfig{
					cfg.AI.Provider: {
						APIKey:  cfg.AI.APIKey,
						BaseURL: getProviderDefaultURL(cfg.AI.Provider),
					},
				}
			}
			return cfg, nil
		}
	}

	return nil, fmt.Errorf("config.yaml not found in: %v", configPaths)
}

func loadFromFile(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse %s: %w", path, err)
	}

	return &cfg, nil
}

func getProviderDefaultURL(provider string) string {
	urls := map[string]string{
		"openai":    "https://api.openai.com/v1",
		"claude":    "https://api.anthropic.com/v1",
		"anthropic": "https://api.anthropic.com/v1",
		"minimax":   "https://api.minimax.chat/v1",
		"glm":       "https://open.bigmodel.cn/api/paas/v4",
	}
	if url, ok := urls[provider]; ok {
		return url
	}
	return "https://api.openai.com/v1"
}
