// Package einox 多智能体DEMO实现
package einox

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/sashabaranov/go-openai"
)

// 步骤定义结构
type AgentStep struct {
	StepID      int    `json:"step_id"`     // 步骤ID
	Description string `json:"description"` // 步骤描述
	Query       string `json:"query"`       // 步骤问题
	AgentID     int    `json:"agent_id"`    // 所需智能体ID
	AgentName   string `json:"agent_name"`  // 智能体名称
	Result      string `json:"result"`      // 步骤执行结果
	Status      string `json:"status"`      // 步骤状态：pending, completed, failed
}

// 多智能体解析结果
type MultiAgentParsing struct {
	OriginalQuery string      `json:"original_query"` // 原始问题
	Steps         []AgentStep `json:"steps"`          // 解析出的步骤
	FinalResult   string      `json:"final_result"`   // 最终结果
	Status        string      `json:"status"`         // 整体状态：parsing, executing, completed, failed
}

// MultiAgentDemo 多智能体DEMO处理流程
// 传入用户问题，返回处理流程与结果
func MultiAgentDemo(userQuery string) (*MultiAgentParsing, error) {
	if userQuery == "" {
		return nil, errors.New("用户问题不能为空")
	}

	// 1. 解析用户问题为多个步骤
	steps, err := parseQueryToSteps(userQuery)
	if err != nil {
		return nil, fmt.Errorf("解析问题失败: %w", err)
	}

	// 创建多智能体解析结果
	result := &MultiAgentParsing{
		OriginalQuery: userQuery,
		Steps:         steps,
		Status:        "executing",
	}

	// 2. 对每个步骤进行处理
	finalResult, err := executeSteps(result)
	if err != nil {
		result.Status = "failed"
		return result, fmt.Errorf("执行步骤失败: %w", err)
	}

	// 3. 设置最终结果
	result.FinalResult = finalResult
	result.Status = "completed"

	return result, nil
}

// parseQueryToSteps 解析用户查询为多个步骤
func parseQueryToSteps(query string) ([]AgentStep, error) {
	// 使用LLM将用户问题分解为步骤
	// 创建LLM请求
	systemPrompt := "你是一个计划分解专家，负责将复杂问题分解为可执行的步骤。每个步骤都需要明确的描述、具体的问题和所需的专业领域。"
	userPrompt := fmt.Sprintf(`请将以下问题分解为2-4个执行步骤："%s"
	
以JSON格式输出，包含以下字段：
[
  {
    "step_id": 1,
    "description": "步骤描述",
    "query": "该步骤需要解决的具体问题",
    "domain": "所需专业领域"
  }
]`, query)

	// 调用LLM
	stepsParsing, err := callLLM(systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("调用LLM解析步骤失败: %w", err)
	}

	// 解析JSON结果
	var parsedSteps []struct {
		StepID      int    `json:"step_id"`
		Description string `json:"description"`
		Query       string `json:"query"`
		Domain      string `json:"domain"`
	}

	// 提取JSON部分
	jsonContent := extractJSON(stepsParsing)
	if jsonContent == "" {
		return nil, errors.New("无法从LLM响应中提取JSON内容")
	}

	err = json.Unmarshal([]byte(jsonContent), &parsedSteps)
	if err != nil {
		return nil, fmt.Errorf("解析步骤JSON失败: %w", err)
	}

	// 转换为AgentStep数组
	steps := make([]AgentStep, 0, len(parsedSteps))
	for _, step := range parsedSteps {
		// 根据领域查找匹配的智能体
		agentID, agentName, err := findAgentByDomain(step.Domain)
		if err != nil {
			log.Printf("警告: 步骤 %d 无法找到匹配的智能体: %v", step.StepID, err)
			// 使用默认智能体
			agentID = 1
			agentName = "通用智能体"
		}

		steps = append(steps, AgentStep{
			StepID:      step.StepID,
			Description: step.Description,
			Query:       step.Query,
			AgentID:     agentID,
			AgentName:   agentName,
			Status:      "pending",
		})
	}

	return steps, nil
}

// executeSteps 执行所有步骤并整合结果
func executeSteps(result *MultiAgentParsing) (string, error) {
	// 记录每个步骤的结果
	stepResults := make([]string, 0, len(result.Steps))

	// 依次执行每个步骤
	for i := range result.Steps {
		step := &result.Steps[i]

		// 调用智能体处理步骤
		response, err := executeAgentStep(step)
		if err != nil {
			step.Status = "failed"
			step.Result = fmt.Sprintf("执行失败: %s", err.Error())
			return "", fmt.Errorf("步骤 %d 执行失败: %w", step.StepID, err)
		}

		// 记录结果
		step.Result = response
		step.Status = "completed"
		stepResults = append(stepResults, response)
	}

	// 生成最终结果摘要
	finalResult, err := generateFinalResult(result.OriginalQuery, result.Steps, stepResults)
	if err != nil {
		return "", fmt.Errorf("生成最终结果失败: %w", err)
	}

	return finalResult, nil
}

// executeAgentStep 执行单个智能体步骤
func executeAgentStep(step *AgentStep) (string, error) {
	// 根据智能体ID获取智能体配置
	// 简化版本，直接调用LLM处理查询
	// 在实际应用中，应该根据agent_id从数据库查询智能体配置，然后根据配置调用对应的智能体

	systemPrompt := fmt.Sprintf("你是一个专业的%s智能体，擅长解决相关领域的问题。", step.AgentName)
	userPrompt := step.Query

	// 调用LLM
	response, err := callLLM(systemPrompt, userPrompt)
	if err != nil {
		return "", fmt.Errorf("调用智能体失败: %w", err)
	}

	return response, nil
}

// generateFinalResult 整合所有步骤结果，生成最终结果
func generateFinalResult(query string, steps []AgentStep, stepResults []string) (string, error) {
	// 创建步骤结果摘要
	stepsOutput := ""
	for _, step := range steps {
		stepsOutput += fmt.Sprintf("步骤%d (%s): %s\n", step.StepID, step.Description, step.Result)
	}

	// 使用LLM整合结果
	systemPrompt := "你是一个结果整合专家，负责将多个步骤的结果整合成一个连贯的回答。"
	userPrompt := fmt.Sprintf(`原始问题: %s

各步骤执行结果:
%s

请根据以上步骤结果，生成一个完整、连贯的最终回答。回答应直接解决原始问题，不需要提及步骤细节。`, query, stepsOutput)

	// 调用LLM
	finalResult, err := callLLM(systemPrompt, userPrompt)
	if err != nil {
		return "", fmt.Errorf("整合结果失败: %w", err)
	}

	return finalResult, nil
}

// findAgentByDomain 根据领域查找匹配的智能体
// 实际应用中应当查询数据库，这里简化为模拟数据
func findAgentByDomain(domain string) (int, string, error) {
	// 将领域转为小写，用于不区分大小写匹配
	domainLower := strings.ToLower(domain)

	// 模拟的智能体列表
	agents := map[string]struct {
		ID   int
		Name string
	}{
		"自然语言处理": {ID: 1, Name: "NLP分析师"},
		"数据分析":   {ID: 2, Name: "数据分析师"},
		"推理":     {ID: 3, Name: "逻辑推理专家"},
		"知识查询":   {ID: 4, Name: "知识库查询专家"},
		"代码生成":   {ID: 5, Name: "编程助手"},
		"人工智能":   {ID: 6, Name: "AI专家"},
		"历史":     {ID: 7, Name: "历史学家"},
		"趋势预测":   {ID: 8, Name: "趋势分析专家"},
		"技术":     {ID: 9, Name: "技术分析师"},
		"比特币":    {ID: 10, Name: "加密货币专家"},
		"金融":     {ID: 11, Name: "金融分析师"},
		"区块链":    {ID: 12, Name: "区块链技术专家"},
		"未来趋势":   {ID: 13, Name: "未来学家"},
		"发展历史":   {ID: 14, Name: "历史研究员"},
		"金融系统":   {ID: 15, Name: "金融系统专家"},
		"工作原理":   {ID: 16, Name: "技术原理专家"},
		"影响分析":   {ID: 17, Name: "影响评估专家"},
	}

	// 查找匹配的智能体
	for key, agent := range agents {
		if strings.Contains(domainLower, strings.ToLower(key)) {
			return agent.ID, agent.Name, nil
		}
	}

	// 如果没有找到精确匹配，使用默认智能体
	return 1, "通用智能体", errors.New("未找到匹配领域的智能体")
}

// callLLM 封装LLM调用
func callLLM(systemPrompt, userPrompt string) (string, error) {
	// 创建聊天请求
	messages := []openai.ChatCompletionMessage{
		{
			Role:    "system",
			Content: systemPrompt,
		},
		{
			Role:    "user",
			Content: userPrompt,
		},
	}

	// 转换为einox.ChatMessage
	einoxMessages := make([]ChatMessage, len(messages))
	for i, msg := range messages {
		einoxMessages[i] = ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
			Name:    msg.Name,
		}
	}

	// 创建请求
	request := ChatRequest{
		Provider: "bedrock", // 使用bedrock作为默认提供商
		ChatCompletionRequest: openai.ChatCompletionRequest{
			Model:       "anthropic.claude-3-5-sonnet-20240620-v1:0", // 默认使用Claude-v2模型
			Messages:    messages,
			Temperature: 0.7,
			MaxTokens:   2000,
		},
	}

	// 创建一个buffer来保存流式输出
	var buffer bytes.Buffer

	// 调用CreateChatCompletion
	resp, err := CreateChatCompletion(request, &buffer)
	if err != nil {
		// 如果流式输出失败，但缓冲区有内容，则使用缓冲区内容
		if buffer.Len() > 0 {
			return buffer.String(), nil
		}
		return "", err
	}

	// 如果使用非流式输出，则从响应中获取内容
	if resp != nil && len(resp.Choices) > 0 {
		return resp.Choices[0].Message.Content, nil
	}

	// 如果响应为nil但缓冲区有内容，说明使用了流式输出
	if buffer.Len() > 0 {
		return buffer.String(), nil
	}

	return "", errors.New("LLM调用未返回内容")
}

// extractJSON 从文本中提取JSON
func extractJSON(text string) string {
	// 查找JSON数组开始和结束的位置
	start := strings.Index(text, "[")
	end := strings.LastIndex(text, "]")

	if start != -1 && end != -1 && end > start {
		return text[start : end+1]
	}

	// 也查找JSON对象格式
	start = strings.Index(text, "{")
	end = strings.LastIndex(text, "}")

	if start != -1 && end != -1 && end > start {
		return text[start : end+1]
	}

	return ""
}
