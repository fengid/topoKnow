package service

import (
	"topoknow-backend/internal/pkg/logger"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// AIClient AI 客户端接口
type AIClient interface {
	Call(prompt string, maxTokens int, temperature float64) (string, error)
}

// OpenAIClient OpenAI 客户端
type OpenAIClient struct {
	client  *http.Client
	baseURL string
	apiKey  string
	model   string
}

// NewOpenAIClient 创建 OpenAI 客户端
func NewOpenAIClient(baseURL, apiKey, model string) *OpenAIClient {
	return &OpenAIClient{
		client: &http.Client{
			Timeout: 300 * time.Second,
		},
		baseURL: baseURL,
		apiKey:  apiKey,
		model:   model,
	}
}

// Call 调用 OpenAI API
func (c *OpenAIClient) Call(prompt string, maxTokens int, temperature float64) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("AI 服务未配置，请检查 API Key")
	}

	type Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}

	type Request struct {
		Model       string    `json:"model"`
		Messages    []Message `json:"messages"`
		MaxTokens   int       `json:"max_tokens"`
		Temperature float64   `json:"temperature"`
	}

	reqBody := Request{
		Model: c.model,
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		MaxTokens:   maxTokens,
		Temperature: temperature,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("AI 请求构建失败: %w", err)
	}

	logger.L.Infof("[AI-OpenAI] POST %s, model=%s, max_tokens=%d, temperature=%.2f",
		c.baseURL+"/chat/completions", c.model, maxTokens, temperature)

	req, err := http.NewRequest("POST", c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", classifyNetworkError(err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return "", fmt.Errorf("AI 服务认证失败，请检查 API Key")
	}
	if resp.StatusCode == 400 {
		return "", fmt.Errorf("AI 请求参数错误: %s", string(respBody))
	}
	if resp.StatusCode == 429 {
		return "", fmt.Errorf("AI 服务请求被拒绝 (429): %s", string(respBody))
	}
	if resp.StatusCode >= 500 {
		return "", fmt.Errorf("AI 服务暂时不可用，请稍后再试")
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("AI 服务返回异常 (%d): %s", resp.StatusCode, string(respBody))
	}

	type Response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	var result Response
	if err := json.Unmarshal(respBody, &result); err != nil {
		logger.L.Errorf("[AI] 响应 JSON 解析失败, body=%s", string(respBody))
		return "", fmt.Errorf("AI 返回数据格式异常，请重试")
	}

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}

	logger.L.Errorf("[AI] 响应无 choices, status=%d, body=%s", resp.StatusCode, string(respBody))
	return "", fmt.Errorf("AI 返回内容为空，请重试")
}

// ClaudeClient Claude 客户端
type ClaudeClient struct {
	client  *http.Client
	baseURL string
	apiKey  string
	model   string
}

// NewClaudeClient 创建 Claude 客户端
func NewClaudeClient(baseURL, apiKey, model string) *ClaudeClient {
	return &ClaudeClient{
		client: &http.Client{
			Timeout: 300 * time.Second,
		},
		baseURL: baseURL,
		apiKey:  apiKey,
		model:   model,
	}
}

// Call 调用 Claude API
func (c *ClaudeClient) Call(prompt string, maxTokens int, temperature float64) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("AI 服务未配置，请检查 API Key")
	}

	type Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}

	type Request struct {
		Model       string    `json:"model"`
		Messages    []Message `json:"messages"`
		MaxTokens   int       `json:"max_tokens"`
		Temperature float64   `json:"temperature"`
	}

	reqBody := Request{
		Model: c.model,
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		MaxTokens:   maxTokens,
		Temperature: temperature,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("AI 请求构建失败: %w", err)
	}

	req, err := http.NewRequest("POST", c.baseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", classifyNetworkError(err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return "", fmt.Errorf("AI 服务认证失败，请检查 API Key")
	}
	if resp.StatusCode == 429 {
		return "", fmt.Errorf("AI 服务请求被拒绝 (429): %s", string(respBody))
	}
	if resp.StatusCode >= 500 {
		return "", fmt.Errorf("AI 服务暂时不可用，请稍后再试")
	}

	type Response struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}

	var result Response
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("AI 返回数据格式异常，请重试")
	}

	if len(result.Content) > 0 {
		return result.Content[0].Text, nil
	}

	return "", fmt.Errorf("AI 返回内容为空，请重试")
}

// MiniMaxClient MiniMax 客户端
type MiniMaxClient struct {
	client  *http.Client
	baseURL string
	apiKey  string
	model   string
}

// NewMiniMaxClient 创建 MiniMax 客户端
func NewMiniMaxClient(baseURL, apiKey, model string) *MiniMaxClient {
	return &MiniMaxClient{
		client: &http.Client{
			Timeout: 300 * time.Second,
		},
		baseURL: baseURL,
		apiKey:  apiKey,
		model:   model,
	}
}

// classifyNetworkError 将网络错误分类为用户友好的消息
func classifyNetworkError(err error) error {
	if err == nil {
		return nil
	}
	errMsg := err.Error()
	if strings.Contains(errMsg, "timeout") || strings.Contains(errMsg, "deadline exceeded") {
		return fmt.Errorf("AI 服务连接超时，请检查网络或稍后重试")
	}
	if strings.Contains(errMsg, "connection refused") || strings.Contains(errMsg, "no such host") {
		return fmt.Errorf("AI 服务连接失败，请检查网络配置")
	}
	return fmt.Errorf("AI 服务网络异常，请稍后重试: %s", errMsg)
}

// Call 调用 MiniMax API
func (c *MiniMaxClient) Call(prompt string, maxTokens int, temperature float64) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("AI 服务未配置，请检查 API Key")
	}

	logger.L.Infof("[AI-MiniMax] 开始调用 API...")
	logger.L.Infof("[AI-MiniMax] 模型: %s", c.model)

	type Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}

	type Request struct {
		Model       string    `json:"model"`
		Messages    []Message `json:"messages"`
		MaxTokens   int       `json:"max_tokens,omitempty"`
		Temperature float64   `json:"temperature,omitempty"`
		TopP        float64   `json:"top_p,omitempty"`
		Stream      bool      `json:"stream,omitempty"`
	}

	reqBody := Request{
		Model: c.model,
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		MaxTokens:   maxTokens,
		Temperature: temperature,
		TopP:        0.95,
		Stream:      false,
	}

	logger.L.Infof("[AI-MiniMax] 提示词：\n%s\n", prompt)
	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal MiniMax request: %w", err)
	}

	req, err := http.NewRequest("POST", c.baseURL+"/text/chatcompletion_v2", bytes.NewReader(body))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", classifyNetworkError(err)
	}
	defer resp.Body.Close()

	logger.L.Infof("[AI-MiniMax] 响应状态: %d", resp.StatusCode)

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// 检查 HTTP 状态码
	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return "", fmt.Errorf("AI 服务认证失败，请检查 API Key")
	}
	if resp.StatusCode == 429 {
		return "", fmt.Errorf("AI 服务请求被拒绝 (429): %s", string(respBody))
	}
	if resp.StatusCode != http.StatusOK {
		logger.L.Errorf("[AI-MiniMax] 错误响应内容 (前500字符): %s", string(respBody[:min(500, len(respBody))]))
		return "", fmt.Errorf("AI 服务暂时不可用，请稍后再试")
	}

	// MiniMax response format
	type BaseResp struct {
		StatusCode int    `json:"status_code"`
		StatusMsg  string `json:"status_msg"`
		RequestID  string `json:"request_id"`
		Usage      struct {
			TotalTokens      int `json:"total_tokens"`
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
	}

	type Choice struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	}

	type Response struct {
		BaseResp BaseResp `json:"base_resp"`
		Choices  []Choice `json:"choices"`
	}

	var result Response
	if err := json.Unmarshal(respBody, &result); err != nil {
		logger.L.Errorf("[AI-MiniMax] 解析 JSON 响应失败 (前500字符): %s", string(respBody[:min(500, len(respBody))]))
		return "", fmt.Errorf("AI 返回数据格式异常，请重试")
	}

	if result.BaseResp.StatusCode != 0 {
		statusMsg := result.BaseResp.StatusMsg
		if strings.Contains(statusMsg, "余额") {
			return "", fmt.Errorf("AI 服务余额不足，请联系管理员")
		}
		logger.L.Errorf("[AI-MiniMax] API 错误 (码=%d): %s, request_id=%s",
			result.BaseResp.StatusCode, statusMsg, result.BaseResp.RequestID)
		return "", fmt.Errorf("AI 服务暂时不可用，请稍后再试")
	}

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("AI 返回内容为空，请重试")
}
