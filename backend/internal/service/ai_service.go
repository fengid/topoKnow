package service

import (
	"topoknow-backend/internal/config"
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/pkg/logger"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type AIService struct {
	factory   *AIClientFactory
	config    *config.AIConfig
	promptSvc *PromptService
}

func NewAIService(factory *AIClientFactory, cfg *config.Config) *AIService {
	return &AIService{
		factory: factory,
		config:  &cfg.AI,
	}
}

// SetPromptService 设置提示词服务
func (s *AIService) SetPromptService(promptSvc *PromptService) {
	s.promptSvc = promptSvc
}

// getPromptOrDefault 获取提示词模板，如果不存在则使用默认值
func (s *AIService) getPromptOrDefault(name string, defaultTemplate string) string {
	if s.promptSvc == nil {
		logger.L.Warnf("[Prompt] promptSvc 未初始化，使用默认模板: name=%s", name)
		return defaultTemplate
	}

	prompt, err := s.promptSvc.GetByName(name)
	if err != nil {
		if defaultTemplate == "" {
			logger.L.Errorf("[Prompt] 数据库查询失败且无默认模板: name=%s, err=%v", name, err)
		} else {
			logger.L.Warnf("[Prompt] 数据库查询失败，降级到默认模板: name=%s, err=%v", name, err)
		}
		return defaultTemplate
	}

	logger.L.Infof("[Prompt] 使用数据库提示词: name=%s, version=%d", prompt.Name, prompt.Version)
	return prompt.Template
}

// renderPrompt 渲染提示词模板
func (s *AIService) renderPrompt(template string, values map[string]string) string {
	if s.promptSvc != nil {
		return s.promptSvc.RenderTemplate(template, values)
	}

	result := template
	for key, value := range values {
		placeholder := fmt.Sprintf("{{.%s}}", key)
		result = strings.ReplaceAll(result, placeholder, value)
		placeholder2 := fmt.Sprintf("{{%s}}", key)
		result = strings.ReplaceAll(result, placeholder2, value)
	}
	return result
}

func (s *AIService) GenerateQuiz(request model.GenerateQuizRequest, modelID ...string) (*model.QuizResponse, error) {
	// 获取提示词模板
	defaultTemplate := `请为以下主题生成练习题：

主题：{{topic}}
难度：{{level}}
数量：{{count}}

请以JSON格式返回：
{
  "questions": [
    {
      "question": "练习题",
      "answer": "参考答案",
      "tags": ["标签"]
    }
  ]
}`

	template := s.getPromptOrDefault("generate_quiz", defaultTemplate)
	prompt := s.renderPrompt(template, map[string]string{
		"topic": request.Topic,
		"level": request.Level,
		"count": fmt.Sprintf("%d", request.Count),
	})

	logger.L.Infof("[AI] 正在调用 AI 生成练习题...")
	response, err := s.callAI(prompt, modelID...)
	if err != nil {
		logger.L.Errorf("[AI] AI 调用失败: %v", err)
		return nil, err
	}
	logger.L.Infof("[AI] AI 响应: %s", response)

	var result model.QuizResponse
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		logger.L.Errorf("[AI] 解析 AI 响应失败: %v", err)
		return nil, fmt.Errorf("AI 返回数据格式异常，请重试")
	}

	return &result, nil
}

func (s *AIService) ExplainNode(topic string, modelID ...string) (string, error) {
	// 获取提示词模板
	defaultTemplate := `请详细介绍以下技术主题，用于系统学习：

主题：{{topic}}

请以 Markdown 格式返回，包含以下部分：
1. 概述
2. 核心概念
3. 常见问题与解答
4. 实践应用建议`

	template := s.getPromptOrDefault("explain_node", defaultTemplate)
	prompt := s.renderPrompt(template, map[string]string{
		"topic": topic,
	})

	logger.L.Infof("[AI] 正在调用 AI 解释节点...")
	response, err := s.callAI(prompt, modelID...)
	if err != nil {
		logger.L.Errorf("[AI] AI 调用失败: %v", err)
		return "", err
	}
	logger.L.Infof("[AI] AI 响应 (前200字符): %s", response[:min(200, len(response))])

	return response, nil
}

// GenerateArticle 生成知识点文章（针对当前节点，包含祖先路径和兄弟节点上下文）
func (s *AIService) GenerateArticle(topic string, description string, ancestors []model.AncestorInfo, siblings []model.SiblingInfo, modelID ...string) (string, error) {
	// 构建祖先路径上下文
	var ancestorsStr string
	if len(ancestors) > 0 {
		var builder strings.Builder
		builder.WriteString("\n完整学习路径（从根节点到当前节点的父节点）：\n")
		for _, anc := range ancestors {
			builder.WriteString(strings.Repeat("  ", anc.Depth))
			builder.WriteString("└─ ")
			builder.WriteString(anc.Topic)
			builder.WriteString(" (重要性: ")
			builder.WriteString(anc.Importance)
			builder.WriteString(")\n")
		}
		builder.WriteString("\n")
		ancestorsStr = builder.String()
	}

	// 构建兄弟节点上下文
	var siblingsStr string
	if len(siblings) > 0 {
		var builder strings.Builder
		builder.WriteString("\n同级知识节点（兄弟节点）：\n")
		for _, sib := range siblings {
			builder.WriteString("- ")
			builder.WriteString(sib.Topic)
			if sib.Description != "" {
				builder.WriteString("：")
				builder.WriteString(sib.Description)
			}
			builder.WriteString(" (重要性: ")
			builder.WriteString(sib.Importance)
			builder.WriteString(")\n")
		}
		builder.WriteString("\n")
		siblingsStr = builder.String()
	}

	// 获取提示词模板
	template := s.getPromptOrDefault("generate_article", "")
	if template == "" {
		return "", fmt.Errorf("提示词模板 generate_article 未找到，请检查数据库初始化")
	}
	prompt := s.renderPrompt(template, map[string]string{
		"topic":       topic,
		"description": description,
		"ancestors":   ancestorsStr,
		"siblings":    siblingsStr,
	})


	logger.L.Infof("[AI] 正在调用 AI 生成文章: topic=%s, ancestorsCount=%d", topic, len(ancestors))
	response, err := s.callAI(prompt, modelID...)
	if err != nil {
		logger.L.Errorf("[AI] AI 调用失败: %v", err)
		return "", err
	}

	// 解析 JSON 响应
	type ArticleResponse struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}

	var result ArticleResponse
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		// 记录解析失败的响应（截断避免日志过大）
		truncated := response
		if len(truncated) > 500 {
			truncated = truncated[:500] + "..."
		}
		logger.L.Errorf("[AI] 解析文章 JSON 失败: %v, 响应内容: %s", err, truncated)
		return "", fmt.Errorf("AI 返回数据格式异常，请重试")
	}

	logger.L.Infof("[AI] 文章生成完成: title=%s", result.Title)
	return result.Content, nil
}

// GenerateSingleQuestion 生成单个练习题（避免重复，包含祖先路径上下文）
func (s *AIService) GenerateSingleQuestion(topic string, description string, ancestors []model.AncestorInfo, existingQuestions []string, modelID ...string) (*model.SingleQuestionResponse, error) {
	// 构建已有问题列表
	existingStr := ""
	if len(existingQuestions) > 0 {
		existingStr = "\n\n请注意：以下问题已存在，不要生成重复或相似的：\n- " + strings.Join(existingQuestions, "\n- ")
	}

	// 构建祖先路径上下文
	var ancestorsStr string
	if len(ancestors) > 0 {
		var builder strings.Builder
		builder.WriteString("\n完整学习路径（从根节点到当前节点的父节点）：\n")
		for _, anc := range ancestors {
			builder.WriteString(strings.Repeat("  ", anc.Depth))
			builder.WriteString("└─ ")
			builder.WriteString(anc.Topic)
			builder.WriteString(" (重要性: ")
			builder.WriteString(anc.Importance)
			builder.WriteString(")\n")
		}
		builder.WriteString("\n")
		ancestorsStr = builder.String()
	}

	// 获取提示词模板
	template := s.getPromptOrDefault("generate_single_question", "")
	if template == "" {
		return nil, fmt.Errorf("提示词模板 generate_single_question 未找到，请检查数据库初始化")
	}
	prompt := s.renderPrompt(template, map[string]string{
		"topic":       topic,
		"description": description,
		"ancestors":   ancestorsStr,
		"existing":    existingStr,
	})


	logger.L.Infof("[AI] 正在调用 AI 生成练习题: topic=%s, existingCount=%d, ancestorsCount=%d", topic, len(existingQuestions), len(ancestors))
	response, err := s.callAI(prompt, modelID...)
	if err != nil {
		logger.L.Errorf("[AI] AI 调用失败: %v", err)
		return nil, err
	}
	logger.L.Infof("[AI] AI 响应 (前200字符): %s", response[:min(200, len(response))])

	// 尝试解析 AI 返回的 JSON
	var result model.SingleQuestionResponse
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		logger.L.Errorf("[AI] 解析 AI 响应 JSON 失败: %v", err)
		// 尝试清理响应中的 markdown 代码块
		cleanedResponse := strings.TrimSpace(response)
		cleanedResponse = strings.TrimPrefix(cleanedResponse, "```json")
		cleanedResponse = strings.TrimPrefix(cleanedResponse, "```")
		cleanedResponse = strings.TrimSuffix(cleanedResponse, "```")
		cleanedResponse = strings.TrimSpace(cleanedResponse)

		if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
			return nil, fmt.Errorf("AI 返回数据格式异常，请重试")
		}
	}

	// 验证数据有效性
	if result.Question == "" {
		return nil, fmt.Errorf("AI 返回内容为空，请重试")
	}
	if result.Answer == "" {
		result.Answer = "请参考相关文档。"
	}
	if result.Tags == nil {
		result.Tags = []string{topic}
	}

	logger.L.Infof("[AI] 练习题生成完成: %s", result.Question[:min(50, len(result.Question))])

	return &result, nil
}

// GenerateChildNodeInfo 生成子节点信息（深度感知、学习导向）
func (s *AIService) GenerateChildNodeInfo(ctx model.ExpandContext, modelID ...string) (*model.ChildNodeInfo, error) {
	logger.L.Infof("[AI] 生成子节点信息: rootTopic=%s, parent=%s, childDepth=%d, siblingsCount=%d",
		ctx.RootTopic, ctx.ParentTopic, ctx.ChildDepth, len(ctx.ExistingSiblings))

	// 构建树形路径
	pathStr := s.buildTreePath(ctx)

	// 构建已有子节点列表（含描述）
	existingStr := ""
	if len(ctx.ExistingSiblings) > 0 {
		var b strings.Builder
		b.WriteString("\n\n已有子节点（不要生成重复或高度相似的主题）：\n")
		for i, sib := range ctx.ExistingSiblings {
			b.WriteString(fmt.Sprintf("%d. %s", i+1, sib.Topic))
			if sib.Description != "" {
				b.WriteString(" — ")
				b.WriteString(sib.Description)
			}
			b.WriteString(fmt.Sprintf(" [%s]\n", sib.Importance))
		}
		existingStr = b.String()
	}

	// 深度策略
	depthStrategy := getDepthStrategy(ctx.ChildDepth)

	// 获取提示词模板
	template := s.getPromptOrDefault("child_node_info", "")
	if template == "" {
		return nil, fmt.Errorf("提示词模板 child_node_info 未找到，请检查数据库初始化")
	}
	prompt := s.renderPrompt(template, map[string]string{
		"rootTopic":        ctx.RootTopic,
		"path":             pathStr,
		"existingChildren": existingStr,
		"depthStrategy":    depthStrategy,
	})


	logger.L.Infof("[AI] 正在调用 AI 生成子节点信息...")
	response, err := s.callAI(prompt, modelID...)
	if err != nil {
		logger.L.Errorf("[AI] AI 调用失败: %v", err)
		return nil, err
	}
	logger.L.Infof("[AI] AI 响应: %s", response)

	// 解析 AI 返回的 JSON（兼容单个 JSON、JSON 数组、JSONL）
	results, err := parseChildNodeInfoList(response)
	if err != nil {
		return nil, fmt.Errorf("AI 返回数据格式异常，请重试")
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("AI 返回内容为空，请重试")
	}
	result := results[0]
	validateChildNodeInfo(&result)
	if result.Topic == "" {
		return nil, fmt.Errorf("AI 返回内容为空，请重试")
	}

	return &result, nil
}

// GenerateChildNodes 批量生成子节点信息（无子节点时使用，AI 自行决定数量）
func (s *AIService) GenerateChildNodes(ctx model.ExpandContext, modelID ...string) ([]model.ChildNodeInfo, error) {
	logger.L.Infof("[AI] 批量生成子节点: rootTopic=%s, parent=%s, childDepth=%d",
		ctx.RootTopic, ctx.ParentTopic, ctx.ChildDepth)

	// 复用路径构建逻辑
	pathStr := s.buildTreePath(ctx)

	// 深度策略
	depthStrategy := getDepthStrategy(ctx.ChildDepth)

	template := s.getPromptOrDefault("child_nodes_batch", "")
	if template == "" {
		return nil, fmt.Errorf("提示词模板 child_nodes_batch 未找到，请检查数据库初始化")
	}
	prompt := s.renderPrompt(template, map[string]string{
		"rootTopic":     ctx.RootTopic,
		"path":          pathStr,
		"depthStrategy": depthStrategy,
	})


	logger.L.Infof("[AI] 正在调用 AI 批量生成子节点...")
	response, err := s.callAI(prompt, modelID...)
	if err != nil {
		logger.L.Errorf("[AI] AI 调用失败: %v", err)
		return nil, err
	}
	logger.L.Infof("[AI] AI 响应: %s", response)

	results, err := parseChildNodeInfoList(response)
	if err != nil {
		return nil, fmt.Errorf("AI 返回数据格式异常，请重试")
	}

	// 验证每个节点
	validated := make([]model.ChildNodeInfo, 0, len(results))
	for i := range results {
		validateChildNodeInfo(&results[i])
		if results[i].Topic != "" {
			validated = append(validated, results[i])
		}
	}

	if len(validated) == 0 {
		return nil, fmt.Errorf("AI 返回内容为空，请重试")
	}

	logger.L.Infof("[AI] 批量生成完成，共 %d 个子节点", len(validated))
	return validated, nil
}

// buildTreePath 构建树形路径字符串（复用逻辑）
func (s *AIService) buildTreePath(ctx model.ExpandContext) string {
	var pathBuilder strings.Builder
	for _, anc := range ctx.Ancestors {
		pathBuilder.WriteString(strings.Repeat("  ", anc.Depth))
		pathBuilder.WriteString("├─ ")
		pathBuilder.WriteString(anc.Topic)
		if anc.Description != "" {
			pathBuilder.WriteString("：")
			pathBuilder.WriteString(anc.Description)
		}
		pathBuilder.WriteString("\n")
	}
	if ctx.ChildDepth > 0 {
		pathBuilder.WriteString(strings.Repeat("  ", ctx.ChildDepth-1))
	}
	pathBuilder.WriteString("└─ [当前节点] ")
	pathBuilder.WriteString(ctx.ParentTopic)
	if ctx.ParentDesc != "" {
		pathBuilder.WriteString("：")
		pathBuilder.WriteString(ctx.ParentDesc)
	}
	return pathBuilder.String()
}

// getDepthStrategy 根据子节点深度返回对应的生成策略
func getDepthStrategy(childDepth int) string {
	switch {
	case childDepth == 1:
		return `当前是第1层（大类划分）。
生成规则：
- 生成该职位核心知识大类（如：语言基础、数据结构与算法、框架、数据库、系统设计等）
- 每个大类应该是独立的考察维度
- 覆盖面要广，遵循 MECE 原则（互斥且完整）
- 优先生成学习中最核心的大类`

	case childDepth == 2:
		return `当前是第2层（子领域）。
生成规则：
- 在父节点这个大类下，生成具体的子领域或核心模块
- 例如"数据库"下可以是：索引原理、事务机制、SQL优化、分库分表等
- 每个子领域应该是可以独立深入学习的方向
- 优先生成最重要的子领域`

	case childDepth == 3:
		return `当前是第3层（具体知识点）。
生成规则：
- 生成可以直接作为练习题考点的具体技术知识点
- 例如"索引原理"下可以是：B+树结构、聚簇索引、覆盖索引、索引失效场景等
- 知识点要足够具体，能对应到 1-3 个练习问题
- 优先生成最核心的高频知识点`

	default:
		return fmt.Sprintf(`当前是第%d层（深入细节）。
生成规则：
- 生成更细粒度的技术细节、边界情况、或实战场景
- 内容应该是深入理解所需的进阶问题
- 避免过于宽泛，聚焦在父节点主题的某个具体方面
- 如果父节点已经足够具体，可以生成"原理分析"、"常见陷阱"、"性能优化"等实战维度`, childDepth)
	}
}

func (s *AIService) GenerateRootNodeInfo(topic string, modelID ...string) (*model.RootNodeInfo, error) {
	logger.L.Infof("[AI] 生成根节点信息: topic=%s", topic)

	template := s.getPromptOrDefault("root_node_info", "")
	if template == "" {
		return nil, fmt.Errorf("提示词模板 root_node_info 未找到，请检查数据库初始化")
	}
	prompt := s.renderPrompt(template, map[string]string{
		"topic": topic,
	})

	logger.L.Infof("[AI] 正在调用 AI 生成根节点信息...")
	response, err := s.callAI(prompt, modelID...)
	if err != nil {
		logger.L.Errorf("[AI] AI 调用失败: %v", err)
		return nil, err
	}
	logger.L.Infof("[AI] AI 响应: %s", response)

	// 尝试解析 AI 返回的 JSON
	var result model.RootNodeInfo
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		logger.L.Errorf("[AI] 解析 AI 响应 JSON 失败: %v", err)
		return nil, fmt.Errorf("AI 返回数据格式异常，请重试")
	}

	// 验证数据有效性
	if result.Importance != "high" && result.Importance != "medium" && result.Importance != "low" {
		result.Importance = "high"
	}
	if result.Difficulty < 1 || result.Difficulty > 5 {
		result.Difficulty = 3
	}
	if result.Description == "" {
		result.Description = fmt.Sprintf("系统性地学习%s相关知识，掌握核心概念和实践技能。", topic)
	}

	return &result, nil
}

// GenerateRootNodeInfoWithPrompt 使用指定提示词生成根节点信息
func (s *AIService) GenerateRootNodeInfoWithPrompt(topic string, promptID string, modelID ...string) (*model.RootNodeInfo, error) {
	logger.L.Infof("[AI] 使用提示词生成根节点信息: topic=%s, promptID=%s", topic, promptID)

	// 如果没有指定 prompt_id，使用默认方法
	if promptID == "" {
		logger.L.Infof("[AI] 未指定 prompt_id，使用默认提示词 root_node_info")
		return s.GenerateRootNodeInfo(topic, modelID...)
	}

	// 解析 prompt_id 为 UUID
	promptUUID, err := uuid.Parse(promptID)
	if err != nil {
		logger.L.Warnf("[AI] prompt_id 格式无效: %s, err=%v", promptID, err)
		return nil, fmt.Errorf("无效的 prompt_id: %s", promptID)
	}

	// 获取提示词
	prompt, err := s.promptSvc.GetByID(promptUUID)
	if err != nil || prompt == nil {
		logger.L.Warnf("[AI] 提示词未找到: promptID=%s, err=%v", promptID, err)
		return nil, fmt.Errorf("提示词未找到: %s", promptID)
	}
	if !prompt.IsActive {
		logger.L.Warnf("[AI] 提示词未激活: name=%s, promptID=%s", prompt.Name, promptID)
		return nil, fmt.Errorf("提示词未激活: %s", prompt.Name)
	}

	logger.L.Infof("[AI] 使用自定义提示词: name=%s, category=%s, version=%d", prompt.Name, prompt.Category, prompt.Version)

	// 渲染提示词
	template := prompt.Template
	values := map[string]string{
		"topic": topic,
	}

	renderedPrompt := s.renderPrompt(template, values)
	logger.L.Infof("[AI] 渲染后的提示词 (前200字符): %s", renderedPrompt[:min(200, len(renderedPrompt))])

	// 调用 AI
	response, err := s.callAI(renderedPrompt, modelID...)
	if err != nil {
		logger.L.Errorf("[AI] AI 调用失败: %v", err)
		return nil, err
	}
	logger.L.Infof("[AI] AI 响应 (前200字符): %s", response[:min(200, len(response))])

	// 尝试解析 AI 返回的 JSON
	var result model.RootNodeInfo
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		// 如果解析失败，使用默认值
		return &model.RootNodeInfo{
			Description: fmt.Sprintf("系统性地学习 %s 相关知识，掌握核心概念和实践技能。", topic),
			Importance:  "high",
			Difficulty:  3,
		}, nil
	}

	// 验证数据有效性
	if result.Importance != "high" && result.Importance != "medium" && result.Importance != "low" {
		result.Importance = "high"
	}
	if result.Difficulty < 1 || result.Difficulty > 5 {
		result.Difficulty = 3
	}
	if result.Description == "" {
		result.Description = fmt.Sprintf("系统性地学习 %s 相关知识，掌握核心概念和实践技能。", topic)
	}

	return &result, nil
}

// cleanAIResponse 清理 AI 响应中的 markdown 代码块
func cleanAIResponse(raw string) string {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	return strings.TrimSpace(cleaned)
}

// parseChildNodeInfoList 解析 AI 响应为 ChildNodeInfo 列表，兼容三种格式：
// 1. JSON 数组:  [{...}, {...}]
// 2. JSONL:      {...}\n{...}
// 3. 单个 JSON:  {...}
func parseChildNodeInfoList(raw string) ([]model.ChildNodeInfo, error) {
	cleaned := cleanAIResponse(raw)

	// 尝试 JSON 数组
	var arr []model.ChildNodeInfo
	if err := json.Unmarshal([]byte(cleaned), &arr); err == nil && len(arr) > 0 {
		return arr, nil
	}

	// 尝试 JSONL（逐行解析）
	lines := strings.Split(cleaned, "\n")
	var results []model.ChildNodeInfo
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var item model.ChildNodeInfo
		if err := json.Unmarshal([]byte(line), &item); err == nil && item.Topic != "" {
			results = append(results, item)
		}
	}
	if len(results) > 0 {
		return results, nil
	}

	// 尝试单个 JSON 对象
	var single model.ChildNodeInfo
	if err := json.Unmarshal([]byte(cleaned), &single); err == nil && single.Topic != "" {
		return []model.ChildNodeInfo{single}, nil
	}

	return nil, fmt.Errorf("AI 返回数据格式异常，请重试")
}

// validateChildNodeInfo 验证并修正 ChildNodeInfo 字段
func validateChildNodeInfo(info *model.ChildNodeInfo) {
	if info.Importance != "high" && info.Importance != "medium" && info.Importance != "low" {
		info.Importance = "medium"
	}
	if info.Difficulty < 1 || info.Difficulty > 5 {
		info.Difficulty = 3
	}
}

func (s *AIService) callAI(prompt string, modelID ...string) (string, error) {
	mid := ""
	if len(modelID) > 0 {
		mid = modelID[0]
	}

	client, err := s.factory.GetClient(mid)
	if err != nil {
		return "", fmt.Errorf("获取 AI 客户端失败: %w", err)
	}

	// 确定实际使用的 model ID（空则用默认）
	if mid == "" {
		mid = s.factory.GetDefaultModelID()
	}

	maxTokens := s.config.MaxTokens
	temperature := s.config.Temperature
	for _, m := range s.config.Models {
		if m.ID == mid {
			if m.MaxTokens > 0 {
				maxTokens = m.MaxTokens
			}
			if m.Temperature > 0 {
				temperature = m.Temperature
			}
			break
		}
	}

	return client.Call(prompt, maxTokens, temperature)
}
