package service

import (
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/repository"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type PromptService struct {
	promptRepo *repository.PromptRepository
	aiService  *AIService
}

func NewPromptService(promptRepo *repository.PromptRepository, aiService *AIService) *PromptService {
	return &PromptService{
		promptRepo: promptRepo,
		aiService:  aiService,
	}
}

func (s *PromptService) Create(req *model.CreatePromptRequest) (*model.Prompt, error) {
	prompt := &model.Prompt{
		Name:        req.Name,
		Category:    req.Category,
		Description: req.Description,
		Template:    req.Template,
		Variables:   req.Variables,
		IsActive:    req.IsActive,
		Version:     1,
	}

	if err := s.promptRepo.Create(prompt); err != nil {
		return nil, err
	}

	return prompt, nil
}

func (s *PromptService) Update(id uuid.UUID, req *model.UpdatePromptRequest) (*model.Prompt, error) {
	prompt, err := s.promptRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		prompt.Name = *req.Name
	}
	if req.Category != nil {
		prompt.Category = *req.Category
	}
	if req.Description != nil {
		prompt.Description = *req.Description
	}
	if req.Template != nil {
		prompt.Template = *req.Template
	}
	if req.Variables != nil {
		prompt.Variables = *req.Variables
	}
	if req.IsActive != nil {
		prompt.IsActive = *req.IsActive
	}

	prompt.Version++

	if err := s.promptRepo.Update(prompt); err != nil {
		return nil, err
	}

	return prompt, nil
}

func (s *PromptService) Delete(id uuid.UUID) error {
	// 软删除：设置为非活跃
	prompt, err := s.promptRepo.FindByID(id)
	if err != nil {
		return err
	}

	prompt.IsActive = false
	return s.promptRepo.Update(prompt)
}

func (s *PromptService) GetByID(id uuid.UUID) (*model.Prompt, error) {
	return s.promptRepo.FindByID(id)
}

func (s *PromptService) GetByName(name string) (*model.Prompt, error) {
	return s.promptRepo.FindByName(name)
}

func (s *PromptService) GetByCategory(category string) ([]model.Prompt, error) {
	return s.promptRepo.FindByCategory(category)
}

func (s *PromptService) List(page, pageSize int) ([]model.Prompt, int64, error) {
	return s.promptRepo.FindAllWithPagination(page, pageSize)
}

// RenderTemplate 渲染提示词模板
func (s *PromptService) RenderTemplate(template string, values map[string]string) string {
	result := template
	for key, value := range values {
		placeholder := fmt.Sprintf("{{.%s}}", key)
		result = strings.ReplaceAll(result, placeholder, value)

		// 也支持 {{key}} 格式
		placeholder2 := fmt.Sprintf("{{%s}}", key)
		result = strings.ReplaceAll(result, placeholder2, value)
	}
	return result
}

// GeneratePrompt AI 生成新提示词
func (s *PromptService) GeneratePrompt(req *model.GeneratePromptRequest) (*model.Prompt, error) {
	if s.aiService == nil {
		return nil, fmt.Errorf("AI service not available")
	}

	prompt := fmt.Sprintf(`你是一位专业的提示词工程师。请为以下任务生成高质量的 AI 提示词模板。

任务分类：%s
任务描述：%s
详细说明：%s
示例：%s

要求：
1. 提示词应该清晰、明确、可操作
2. 包含必要的上下文信息
3. 指定输出格式（JSON 或其他）
4. 考虑 edge cases 和错误处理
5. 使用 {{变量名}} 格式标记需要动态替换的部分

请直接返回生成的提示词模板，不需要其他说明。`, req.Category, req.Task, req.Description, req.Examples)

	aiResponse, err := s.aiService.callAI(prompt)
	if err != nil {
		return nil, err
	}

	// 清理 AI 返回的内容（去除可能的 markdown 代码块标记）
	aiResponse = strings.TrimSpace(aiResponse)
	aiResponse = strings.TrimPrefix(aiResponse, "```")
	aiResponse = strings.TrimPrefix(aiResponse, "json")
	aiResponse = strings.TrimPrefix(aiResponse, "```")
	aiResponse = strings.TrimSuffix(aiResponse, "```")
	aiResponse = strings.TrimSpace(aiResponse)

	return &model.Prompt{
		Name:        fmt.Sprintf("auto_generated_%s", req.Category),
		Category:    req.Category,
		Description: fmt.Sprintf("Auto-generated prompt for %s", req.Task),
		Template:    aiResponse,
		Version:     1,
		IsActive:    true,
	}, nil
}

// OptimizePrompt AI 优化现有提示词
func (s *PromptService) OptimizePrompt(id uuid.UUID, feedback string) (*model.Prompt, error) {
	prompt, err := s.promptRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if s.aiService == nil {
		return nil, fmt.Errorf("AI service not available")
	}

	optimizePrompt := fmt.Sprintf(`你是一位专业的提示词工程师。请优化以下 AI 提示词。

原始提示词：
%s

用户反馈/优化建议：
%s

请分析问题并提供优化后的提示词。优化要求：
1. 保持原有意图和结构
2. 提高清晰度和准确性
3. 改进输出质量
4. 考虑用户的使用场景

请直接返回优化后的提示词，不需要其他说明。`, prompt.Template, feedback)

	aiResponse, err := s.aiService.callAI(optimizePrompt)
	if err != nil {
		return nil, err
	}

	// 清理 AI 返回的内容
	aiResponse = strings.TrimSpace(aiResponse)
	aiResponse = strings.TrimPrefix(aiResponse, "```")
	aiResponse = strings.TrimPrefix(aiResponse, "json")
	aiResponse = strings.TrimPrefix(aiResponse, "```")
	aiResponse = strings.TrimSuffix(aiResponse, "```")
	aiResponse = strings.TrimSpace(aiResponse)

	// 更新提示词
	prompt.Template = aiResponse
	prompt.Version++

	if err := s.promptRepo.Update(prompt); err != nil {
		return nil, err
	}

	return prompt, nil
}

// InitDefaultPrompts 初始化默认提示词
func (s *PromptService) InitDefaultPrompts() error {
	defaults := []struct {
		Name     string
		Category string
		Template string
		Version  int
	}{
		{
			Name:     "expand_node",
			Category: "tree",
			Version:  3,
			Template: `你是一位专业的知识教育专家和知识拓扑构建专家。

当前节点信息：
- 学习主题：{{topic}}
- 已掌握程度：{{level}}

请生成下一层级的知识分支，要求：
1. 专业性：确保知识点准确、深入
2. 实用性：优先覆盖核心知识体系
3. 难度递进：从基础到高级

请以JSON格式返回结果，格式如下：
{
  "children": [
    {
      "name": "子节点名称",
      "description": "描述",
      "importance": "high/medium/low",
      "difficulty": 3,
      "practice_questions": [
        {
          "question": "练习题",
          "answer": "参考答案",
          "tags": ["标签1", "标签2"]
        }
      ]
    }
  ]
}`,
		},
		{
			Name:     "root_node_info",
			Category: "tree",
			Version:  5,
			Template: `你是一位资深的教育专家和学习规划师。请为以下学习主题生成知识拓扑的根节点信息。

学习主题：{{topic}}

构建模式：{{mode}}（understanding=理解模式，按知识体系划分，描述学习要点；interview=面试模式，按面试问题域划分，描述该技术在真实面试中的考察频率与核心考点）

要求：
1. 只返回纯 JSON 对象，不要任何其他文字
2. 不要使用 markdown 代码块标记
3. 不要有前言、结语或解释
4. 用中文输出描述内容

JSON 格式（importance 取 high/medium/low，difficulty 取 1-5 的整数）：
{"description":"该主题的详细概述和学习目标（100-200字，用中文）","importance":"high","difficulty":3}

示例：
{"description":"人工智能是计算机科学的重要分支，研究如何让机器模拟人类智能行为。核心领域包括机器学习、深度学习、自然语言处理、计算机视觉和强化学习等。学习路径涵盖数学基础、算法原理、模型训练与工程实践，是当今科技领域最前沿且应用广泛的方向之一。","importance":"high","difficulty":4}

开始生成，学习主题：{{topic}}`,
		},
		{
			Name:     "explain_node",
			Category: "node",
			Version:  2,
			Template: `请详细介绍以下学习主题，用于系统学习：

主题：{{topic}}

请以 Markdown 格式返回，包含以下部分：
1. 概述
2. 核心概念
3. 常见问题与解答
4. 实践应用建议`,
		},
		{
			Name:     "generate_quiz",
			Category: "quiz",
			Version:  2,
			Template: `你是一位专业的教育专家。请为以下主题生成练习题：

主题：{{topic}}
难度：{{level}}  (basic/intermediate/advanced)
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
}`,
		},
		{
			Name:     "generate_article",
			Category: "article",
			Version:  4,
			Template: `你是一位资深的教育专家和知识学习导师。请为以下学习路径中的当前节点生成一篇深入、全面的知识点文章。

{{ancestors}}{{siblings}}当前节点信息：
- 主题：{{topic}}
- 描述：{{description}}

要求：
1. 只返回纯 JSON 对象，不要有任何前言或结语
2. **JSON 格式必须正确**：
   - title 和 content 是字符串类型，必须用双引号包裹
   - **content 中的所有双引号必须转义为 \"**
   - **content 中的换行符必须转义为 \n**
   - **content 中的反斜杠必须转义为 \\**
3. 不要使用 markdown 代码块标记
4. **文章长度控制在 1000～4000 字之间**，由 AI 根据知识点的重要性和复杂度决定具体字数，确保内容深入且重点突出
5. 根据祖先路径理解整体学习上下文，在文章开头说明当前主题在整个知识体系中的位置
6. 如果有兄弟节点，在文章中提及当前主题与兄弟主题的关联和区别，帮助读者建立横向知识联系
7. 内容要聚焦于当前主题，结合父主题的上下文深入展开

JSON 格式：
{
  "title": "文章标题（简洁明了）",
  "content": "Markdown 格式的文章内容，必须包含以下适用于任何学科的通用章节：\n## 概述\n（当前主题在知识体系中的位置，与父主题的关系）\n## 前置知识\n（理解本主题需要的基础知识）\n## 核心概念\n（详细解释核心概念和术语）\n## 深入原理\n（底层原理或机制的深入分析；理论类主题可改为推导/论证）\n## 关键知识点\n（逐条详细讲解重要知识点）\n## 与相关主题的关联\n（与兄弟节点主题的对比和联系）\n## 常见误区\n（初学者容易犯的错误和误解）\n## 学习与实践建议\n（按主题领域自适应：技术/工程类可含代码示例与工程实践，理论/数学类可含推导与习题思路，应试类可含高频考点，通识/兴趣类给出学习路径与资源）"
}

开始生成，只返回 JSON 对象：`,
		},
		{
			Name:     "generate_single_question",
			Category: "quiz",
			Version:  4,
			Template: `你是一位专业的知识教育专家。请为以下学习路径中的最后一个节点生成一道练习题。

{{ancestors}}{{siblings}}当前节点信息：
- 主题：{{topic}}
- 描述：{{description}}{{existing}}

要求：
1. 只返回纯 JSON 对象，不要任何其他文字
2. **JSON 格式必须正确**：answer 字段中的双引号必须转义为 \"、换行符必须转义为 \n、反斜杠必须转义为 \\
3. 不要使用 markdown 代码块标记
4. 不要生成与已有问题重复或相似的问题
5. 根据祖先路径理解整体学习上下文，确保问题与前置知识连贯
6. 如果提供了兄弟节点，问题必须聚焦当前节点主题，不要问及兄弟节点的主题

JSON 格式：
{"question":"练习题问题","answer":"参考答案（详细，用 Markdown 格式）","tags":["相关技术标签"]}

示例：
{"question":"请解释 Go 语言中 GMP 模型的工作原理？","answer":"GMP 模型是 Go 调度器的核心...","tags":["Go","并发","调度器"]}

开始生成，只返回 JSON：`,
		},
		{
			Name:     "generate_single_question_interview",
			Category: "question",
			Version:  1,
			Template: `你是一位资深技术面试官。请为面试考点拓扑中的当前节点生成一道面试官追问式考题。

{{ancestors}}{{siblings}}当前节点信息：
- 考点：{{topic}}
- 描述：{{description}}{{existing}}

要求：
1. 只返回纯 JSON 对象，不要任何其他文字
2. **JSON 格式必须正确**：answer 字段中的双引号必须转义为 \"、换行符必须转义为 \n、反斜杠必须转义为 \\
3. 不要使用 markdown 代码块标记
4. 不要生成与已有问题重复或相似的问题
5. 问题用面试官原话视角提问（如"为什么…""如果…会怎样""…怎么选"），对应真实面试追问
6. 答案给出可直接背诵的 30 秒标准回答

JSON 格式：
{"question":"面试官追问式问题","answer":"标准回答（Markdown 格式，先一句话结论再展开）","tags":["标签1","标签2"]}`,
		},
		{
			Name:     "child_nodes_batch",
			Category: "tree",
			Version:  5,
			Template: `你是一位资深教育专家和知识体系架构师。你正在为「{{rootTopic}}」这个主题构建知识拓扑。

请为当前节点生成子节点：若已有子节点则追加新方向，若为空则首次生成。

## 学习主题
{{rootTopic}}

## 知识树路径（从根到当前节点）
{{path}}{{existingChildren}}

## 深度策略
{{depthStrategy}}

## 生成约束
1. 返回一个 JSON 数组，每个元素是一个子节点对象；若已有子节点且该层已覆盖完整，可返回空数组 []
2. 生成数量由你根据主题的内在结构自行决定，宁精勿多，每个子节点都是独立且重要的方向
3. 主题名称简洁（2-6个字），是该领域的标准术语
4. 描述要说明：这个知识点学习的核心要点与重要性（50-100字）
5. 重要性基于学习重要性：high=核心必学, medium=重要推荐, low=拓展了解
6. 难度基于理解深度：1=了解即可, 3=需要深入理解, 5=需要实战经验
7. 只返回纯 JSON 数组，不要任何其他文字或 markdown 标记

## 禁止生成
- 与已有子节点重复或高度重叠的主题
- 过于宽泛、无信息量的主题（如单独使用“其他”“综合”“进阶”等笼统词，而不是具体的知识领域）
- 与「{{rootTopic}}」无关的边缘话题
- 过于理论化缺乏实践意义的主题
- 主题之间高度重叠

JSON 格式（importance 取 high/medium/low，difficulty 取 1-5 的整数）：
[{"topic":"子主题名称","description":"知识相关描述","importance":"high","difficulty":3}]`,
		},
		{
			Name:     "child_nodes_batch_interview",
			Category: "tree",
			Version:  1,
			Template: `你是一位资深技术面试官和面试备考专家。你正在为「{{rootTopic}}」这个主题构建面试考点拓扑（而非教材式知识体系）。

请为当前节点生成子节点：若已有子节点则追加新考点，若为空则首次生成。每个子节点对应面试中的一个独立提问主题或追问点。

## 学习主题
{{rootTopic}}

## 考点树路径（从根到当前节点）
{{path}}{{existingChildren}}

## 分层策略
{{depthStrategy}}

## 生成约束
1. 返回一个 JSON 数组；若已有子节点且该层考点已覆盖完整，可返回空数组 []
2. 生成数量由你根据该主题真实面试的高频程度自行决定，宁精勿多
3. 主题名称用面试官的提问视角命名（如“为什么快”“三问题区别”“方案怎么选”），而非教材章节名（2-10个字）
4. 描述说明：面试官考察什么、标准回答要点、高频程度（50-100字）
5. 重要性基于面试频率：high=必问, medium=常问, low=偶问
6. 难度基于回答难度：1=背概念即可, 3=需理解原理, 5=需实战踩坑经验
7. 只返回纯 JSON 数组，不要任何其他文字或 markdown 标记

## 禁止生成
- 与已有子节点重复或高度相似的考点
- 教材目录式划分（如“基础概念”“实践应用”这种领域划分，而非具体提问）
- 与「{{rootTopic}}」无关的边缘话题
- 无法引出实质回答的空泛话题

JSON 格式（importance 取 high/medium/low，difficulty 取 1-5 的整数）：
[{"topic":"考点名称","description":"面试官考察什么与回答要点","importance":"high","difficulty":3}]`,
		},
		{
			Name:     "generate_article_interview",
			Category: "article",
			Version:  2,
			Template: `你是一位资深技术面试官和面试教练，深谙背诵记忆规律。请为面试考点拓扑中的当前节点生成一篇可直接背诵的面试速记文章。

{{ancestors}}{{siblings}}当前节点信息：
- 考点：{{topic}}
- 描述：{{description}}

要求：
1. 只返回纯 JSON 对象，不要有任何前言或结语
2. **JSON 格式必须正确**：
   - title 和 content 是字符串类型，必须用双引号包裹
   - **content 中的所有双引号必须转义为 \"**
   - **content 中的换行符必须转义为 \n**
   - **content 中的反斜杠必须转义为 \\**
3. 不要使用 markdown 代码块标记
4. **全文控制在 500～1500 字**，面试速记要短、要能背，拒绝注水
5. 每个知识点先给 30 秒版本，再给 5 分钟版本
6. 如有兄弟节点，在对比辨析中体现与兄弟考点的区别（面试最爱问“区别”）

JSON 格式：
{
  "title": "标题（考点 + 面试速记）",
  "content": "Markdown 格式，必须包含以下章节：\n## 一句话答案\n（面试时脱口而出的 30 秒版本，必须先背下来）\n## 高频面试问答\n（3-6 组：**Q：面试官原话式提问**，A：30 秒标准回答，可直接背诵）\n## 关键数字与参数\n（必背的数字/配置/公式，逐条列出，如容量、默认值、阈值）\n## 对比辨析\n（与兄弟主题/易混概念的对比表格，表格比段落好背）\n## 追问链\n（面试官顺着答案往深处追问的问题及答法。**格式强制**：每个条目固定两行——第一行【追问】+问题，第二行以 → 开头给答法，条目之间空一行，严禁问答挤在同一行）\n示例：\n【追问】为什么用跳表不用红黑树？\n→ antirez 原话三点：实现简单；范围查询友好；改造灵活。\n\n【追问】跳表查询复杂度是多少？\n→ O(logN)，层数按概率随机生成。"'
}开始生成，只返回 JSON：`,
		},
	}

	for _, d := range defaults {
		_, err := s.promptRepo.SyncDefault(d.Name, d.Category, d.Template, d.Version)
		if err != nil {
			return fmt.Errorf("failed to sync default prompt %s: %w", d.Name, err)
		}
	}

	// 停用已废弃的模板（代码不再引用，保留历史记录但从管理列表语义上移除）
	for _, name := range deprecatedPrompts {
		if p, err := s.promptRepo.FindByName(name); err == nil && p != nil && p.IsActive {
			p.IsActive = false
			if err := s.promptRepo.Update(p); err != nil {
				return fmt.Errorf("failed to deactivate prompt %s: %w", name, err)
			}
		}
	}

	return nil
}

// deprecatedPrompts 历史上被代码引用、现已被替代的模板名
var deprecatedPrompts = []string{"child_node_info"}

// ValidateRequiredPrompts 验证所有必需的提示词模板是否存在于数据库中
func (s *PromptService) ValidateRequiredPrompts() error {
	required := []string{
		"root_node_info",
		"expand_node",
		"explain_node",
		"generate_quiz",
		"generate_article",
		"generate_article_interview",
		"generate_single_question",
		"generate_single_question_interview",
		"child_nodes_batch",
		"child_nodes_batch_interview",
	}

	var missing []string
	for _, name := range required {
		prompt, err := s.promptRepo.FindByName(name)
		if err != nil || prompt == nil {
			missing = append(missing, name)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("缺少必需的提示词模板: %s", strings.Join(missing, ", "))
	}
	return nil
}
