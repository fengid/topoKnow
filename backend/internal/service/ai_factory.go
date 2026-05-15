package service

import (
	"topoknow-backend/internal/config"
	"fmt"
	"sync"
)

// ModelInfo 模型信息（用于 API 响应）
type ModelInfo struct {
	ID          string `json:"id"`
	Provider    string `json:"provider"`
	DisplayName string `json:"display_name"`
}

// AIClientFactory AI 客户端工厂（client 池）
type AIClientFactory struct {
	mu           sync.RWMutex
	clients      map[string]AIClient
	models       map[string]config.ModelConfig
	providers    map[string]config.ProviderConfig
	defaultModel string
}

// NewAIClientFactory 创建 AI 客户端工厂
func NewAIClientFactory(cfg *config.AIConfig) *AIClientFactory {
	modelsMap := make(map[string]config.ModelConfig, len(cfg.Models))
	for _, m := range cfg.Models {
		modelsMap[m.ID] = m
	}

	return &AIClientFactory{
		clients:      make(map[string]AIClient),
		models:       modelsMap,
		providers:    cfg.Providers,
		defaultModel: cfg.DefaultModel,
	}
}

// GetClient 按 model ID 获取 AI client（懒加载 + 缓存）
func (f *AIClientFactory) GetClient(modelID string) (AIClient, error) {
	if modelID == "" {
		modelID = f.defaultModel
	}

	f.mu.RLock()
	if client, ok := f.clients[modelID]; ok {
		f.mu.RUnlock()
		return client, nil
	}
	f.mu.RUnlock()

	f.mu.Lock()
	defer f.mu.Unlock()

	// Double check
	if client, ok := f.clients[modelID]; ok {
		return client, nil
	}

	modelCfg, ok := f.models[modelID]
	if !ok {
		return nil, fmt.Errorf("未找到模型配置: %s", modelID)
	}

	providerCfg, ok := f.providers[modelCfg.Provider]
	if !ok {
		return nil, fmt.Errorf("未找到 provider 配置: %s", modelCfg.Provider)
	}

	if providerCfg.APIKey == "" {
		return nil, fmt.Errorf("provider %s 的 API Key 未配置", modelCfg.Provider)
	}

	client := newClient(modelCfg.Provider, providerCfg.BaseURL, providerCfg.APIKey, modelCfg.ID)
	f.clients[modelID] = client
	return client, nil
}

// GetDefaultModelID 返回默认模型 ID
func (f *AIClientFactory) GetDefaultModelID() string {
	return f.defaultModel
}

// GetAvailableModels 返回可用模型列表（只返回已配置 API Key 的 provider 下的模型）
func (f *AIClientFactory) GetAvailableModels() []ModelInfo {
	var result []ModelInfo
	for _, m := range f.models {
		if providerCfg, ok := f.providers[m.Provider]; ok && providerCfg.APIKey != "" {
			result = append(result, ModelInfo{
				ID:          m.ID,
				Provider:    m.Provider,
				DisplayName: m.DisplayName,
			})
		}
	}
	return result
}

// newClient 按 provider 创建 AI client
func newClient(provider, baseURL, apiKey, model string) AIClient {
	switch provider {
	case "claude", "anthropic":
		return NewClaudeClient(baseURL, apiKey, model)
	case "minimax":
		return NewMiniMaxClient(baseURL, apiKey, model)
	case "glm", "openai":
		return NewOpenAIClient(baseURL, apiKey, model)
	default:
		return NewOpenAIClient(baseURL, apiKey, model)
	}
}

// NewAIClient 创建单个 AI 客户端（向后兼容）
func NewAIClient(cfg *config.AIConfig) AIClient {
	factory := NewAIClientFactory(cfg)
	client, err := factory.GetClient(cfg.DefaultModel)
	if err != nil {
		baseURL := "https://api.openai.com/v1"
		return newClient(cfg.Provider, baseURL, cfg.APIKey, cfg.Model)
	}
	return client
}
