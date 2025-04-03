package ai

import (
	"encoding/json"
	"fmt"
	"io"

	einox "github.com/YFGaia/eino-x"
	"github.com/flipped-aurora/gin-vue-admin/server/global"
	modelAi "github.com/flipped-aurora/gin-vue-admin/server/model/ai"
	"github.com/sashabaranov/go-openai"
)

// AgentConfig 智能体配置结构
type AgentConfig struct {
	App struct {
		Name        string `yaml:"name" json:"name"`
		Description string `yaml:"description" json:"description"`
		Icon        string `yaml:"icon" json:"icon"`
		Mode        string `yaml:"mode" json:"mode"`
	} `yaml:"app" json:"app"`
	ModelConfig struct {
		Model struct {
			Name             string `yaml:"name" json:"name"`
			Provider         string `yaml:"provider" json:"provider"`
			Mode             string `yaml:"mode" json:"mode"`
			CompletionParams struct {
				Seed             int      `yaml:"seed" json:"seed"`
				Stop             []string `yaml:"stop" json:"stop"`
				TopP             float32  `yaml:"top_p" json:"top_p"`
				MaxTokens        int      `yaml:"max_tokens" json:"max_tokens"`
				Temperature      float32  `yaml:"temperature" json:"temperature"`
				PresencePenalty  float32  `yaml:"presence_penalty" json:"presence_penalty"`
				FrequencyPenalty float32  `yaml:"frequency_penalty" json:"frequency_penalty"`
			} `yaml:"completion_params" json:"completion_params"`
		} `yaml:"model" json:"model"`
		PrePrompt        string                 `yaml:"pre_prompt" json:"pre_prompt"`
		OpeningStatement string                 `yaml:"opening_statement" json:"opening_statement"`
		AgentMode        map[string]interface{} `yaml:"agent_mode" json:"agent_mode"`
	} `yaml:"model_config" json:"model_config"`
}

// AgentService 智能体服务
type AgentService struct{}

// GetAgentConfigById 从数据库加载智能体配置
func (s *AgentService) GetAgentConfigById(agentId uint) (*AgentConfig, error) {
	// 从数据库查询智能体数据
	var agentData modelAi.AgentData
	if err := global.GVA_DB.Where("id = ?", agentId).First(&agentData).Error; err != nil {
		return nil, fmt.Errorf("从数据库查询智能体失败: %v", err)
	}

	// 将JSON数据解析为AgentConfig结构
	var config AgentConfig
	if err := json.Unmarshal(agentData.Data, &config); err != nil {
		return nil, fmt.Errorf("解析智能体配置数据失败: %v", err)
	}

	return &config, nil
}

// BuildChatRequest 根据智能体配置和用户输入构建聊天请求
func (s *AgentService) BuildChatRequest(agentConfig *AgentConfig, userInput string, contextMessages []openai.ChatCompletionMessage) (einox.ChatRequest, error) {
	// 创建聊天请求对象
	var request einox.ChatRequest

	// 设置提供商
	provider := agentConfig.ModelConfig.Model.Provider
	//当等于azure_openai时转换为azure
	if provider == "azure_openai" {
		provider = "azure"
		// 修改原始配置中的provider，确保后续调用也使用正确的provider
		agentConfig.ModelConfig.Model.Provider = provider
	}
	if provider == "" {
		provider = global.GVA_CONFIG.AI.Provider
	}
	request.Provider = provider

	// 构建消息数组
	messages := []openai.ChatCompletionMessage{}

	// 如果有预设提示词，添加系统消息
	if agentConfig.ModelConfig.PrePrompt != "" {
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    "system",
			Content: agentConfig.ModelConfig.PrePrompt,
		})
	}

	// 添加上下文消息
	if len(contextMessages) > 0 {
		messages = append(messages, contextMessages...)
	}

	// 添加用户输入
	messages = append(messages, openai.ChatCompletionMessage{
		Role:    "user",
		Content: userInput,
	})

	// 设置模型参数，优先使用配置中的值，否则使用默认值
	completionParams := agentConfig.ModelConfig.Model.CompletionParams
	maxTokens := 2000
	var temperature float32 = 0.7
	var topP float32 = 1.0
	var presencePenalty, frequencyPenalty float32 = 0.0, 0.0

	// 如果配置中有相关参数，则使用配置中的值
	if completionParams.MaxTokens > 0 {
		maxTokens = completionParams.MaxTokens
	}
	if completionParams.Temperature > 0 {
		temperature = completionParams.Temperature
	}
	if completionParams.TopP > 0 {
		topP = completionParams.TopP
	}
	if completionParams.PresencePenalty != 0 {
		presencePenalty = completionParams.PresencePenalty
	}
	if completionParams.FrequencyPenalty != 0 {
		frequencyPenalty = completionParams.FrequencyPenalty
	}

	request.ChatCompletionRequest = openai.ChatCompletionRequest{
		Model:            agentConfig.ModelConfig.Model.Name,
		Messages:         messages,
		MaxTokens:        maxTokens,
		Temperature:      temperature,
		TopP:             topP,
		PresencePenalty:  presencePenalty,
		FrequencyPenalty: frequencyPenalty,
	}

	// 如果配置中有停止词，则添加停止词
	if len(completionParams.Stop) > 0 {
		request.ChatCompletionRequest.Stop = completionParams.Stop
	}

	return request, nil
}

// CreateAgentChatCompletion 使用智能体ID创建聊天完成
func (s *AgentService) CreateAgentChatCompletion(agentId uint, userInput string, contextMessages []openai.ChatCompletionMessage, stream bool, writer io.Writer) (*openai.ChatCompletionResponse, error) {
	// 初始化环境
	InitEnvironment()

	// 从数据库加载智能体配置
	agentConfig, err := s.GetAgentConfigById(agentId)
	if err != nil {
		return nil, err
	}

	// 构建聊天请求
	request, err := s.BuildChatRequest(agentConfig, userInput, contextMessages)
	if err != nil {
		return nil, err
	}

	// 设置流式响应
	request.Stream = stream

	// 调用聊天完成API
	return einox.CreateChatCompletion(request, writer)
}
