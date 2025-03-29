package einox

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/sashabaranov/go-openai"
	"io"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"github.com/cloudwego/eino-ext/components/model/deepseek"
	"github.com/cloudwego/eino/schema"
	"gopkg.in/yaml.v2"
)

// DeepSeekCredential 定义了DeepSeek模型的凭证配置
type DeepSeekCredential struct {
	Name        string   `yaml:"name"`
	APIKey      string   `yaml:"api_key"`
	BaseURL     string   `yaml:"base_url"`
	Enabled     bool     `yaml:"enabled"`
	Weight      int      `yaml:"weight"`
	QPSLimit    int      `yaml:"qps_limit"`
	Description string   `yaml:"description"`
	Models      []string `yaml:"models"`
	Timeout     int      `yaml:"timeout"`
	Proxy       string   `yaml:"proxy"`
}

// 定义配置文件结构
var deepseekConfig struct {
	Environments map[string]struct {
		Credentials []DeepSeekCredential `yaml:"credentials"`
	} `yaml:"environments"`
}

// getDeepSeekConfig 获取DeepSeek配置
func (c *Config) getDeepSeekConfig() (*deepseek.ChatModelConfig, error) {
	// 使用统一定义的环境变量
	env := ENV
	if env == "" {
		env = "development"
	}
	//读取环境变量
	err := LoadLLMConfigPathFromEnv()
	if err != nil {
		return nil, fmt.Errorf("读取环境变量失败: %v", err)
	}

	// 读取DeepSeek配置文件
	yamlFile, err := os.ReadFile(filepath.Join(LLMConfigPath, "deepseek.yaml"))
	if err != nil {
		return nil, fmt.Errorf("读取DeepSeek配置文件失败: %v", err)
	}

	err = yaml.Unmarshal(yamlFile, &deepseekConfig)
	if err != nil {
		return nil, fmt.Errorf("解析DeepSeek配置文件失败: %v", err)
	}

	// 获取指定环境的配置
	envConfig, ok := deepseekConfig.Environments[env]
	if !ok {
		return nil, fmt.Errorf("未找到环境 %s 的配置", env)
	}

	// 存储启用的配置
	var enabledCredentials []DeepSeekCredential

	// 遍历该环境下的所有凭证配置
	for _, cred := range envConfig.Credentials {
		// 只添加启用的配置
		if cred.Enabled {
			enabledCredentials = append(enabledCredentials, cred)
		}
	}

	// 如果没有启用的配置,返回错误
	if len(enabledCredentials) == 0 {
		return nil, fmt.Errorf("环境 %s 中没有启用的配置", env)
	}

	// 根据权重选择配置
	var selectedCred DeepSeekCredential
	if len(enabledCredentials) > 1 {
		// 计算总权重
		totalWeight := 0
		for _, cred := range enabledCredentials {
			totalWeight += cred.Weight
		}

		// 生成一个随机数,范围是[0, totalWeight)
		randomNum := rand.Intn(totalWeight)

		// 根据权重选择配置
		currentWeight := 0
		for _, cred := range enabledCredentials {
			currentWeight += cred.Weight
			if randomNum < currentWeight {
				selectedCred = cred
				break
			}
		}
	} else {
		// 如果只有一个配置,直接使用
		selectedCred = enabledCredentials[0]
	}

	// 确保DeepSeek配置存在
	if c.VendorOptional == nil {
		c.VendorOptional = &VendorOptional{}
	}
	if c.VendorOptional.DeepSeekConfig == nil {
		c.VendorOptional.DeepSeekConfig = &DeepSeekConfig{}
	}

	// 处理API密钥解密
	_, decryptFunc, err := InitRSAKeyManager()
	if err != nil {
		return nil, fmt.Errorf("初始化RSA密钥管理器失败: %v", err)
	}

	apiKey, err := decryptFunc(selectedCred.APIKey)
	if err != nil {
		return nil, fmt.Errorf("解密API密钥失败: %v", err)
	}

	// 设置超时
	var timeout time.Duration
	if selectedCred.Timeout > 0 {
		timeout = time.Duration(selectedCred.Timeout) * time.Second
	}

	// 创建DeepSeek聊天模型配置
	deepseekConf := &deepseek.ChatModelConfig{
		APIKey:           apiKey,
		Model:            c.Model,
		Timeout:          timeout,
		MaxTokens:        c.MaxTokens,
		Temperature:      dereferenceFloat32OrDefault(c.Temperature, 1.0),
		TopP:             dereferenceFloat32OrDefault(c.TopP, 1.0),
		Stop:             c.Stop,
		PresencePenalty:  c.VendorOptional.DeepSeekConfig.PresencePenalty,
		FrequencyPenalty: c.VendorOptional.DeepSeekConfig.FrequencyPenalty,
	}

	// 如果有自定义BaseURL，则设置
	if selectedCred.BaseURL != "" {
		deepseekConf.BaseURL = selectedCred.BaseURL
	}

	// 如果有Response格式设置，则配置
	if c.VendorOptional.DeepSeekConfig.ResponseFormatType != "" {
		deepseekConf.ResponseFormatType = deepseek.ResponseFormatType(
			c.VendorOptional.DeepSeekConfig.ResponseFormatType)
	}

	return deepseekConf, nil
}

// dereferenceFloat32OrDefault 返回指针值或默认值
func dereferenceFloat32OrDefault(ptr *float32, defaultValue float32) float32 {
	if ptr == nil {
		return defaultValue
	}
	return *ptr
}

// DeepSeekCreateChatCompletion 使用DeepSeek服务创建聊天完成
func DeepSeekCreateChatCompletion(req ChatCompletionRequest) (*openai.ChatCompletionResponse, error) {
	// 创建DeepSeek配置
	conf := &Config{
		Vendor:      "deepseek",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取DeepSeek配置
	deepseekConf, err := conf.getDeepSeekConfig()
	if err != nil {
		return nil, fmt.Errorf("获取DeepSeek配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := deepseek.NewChatModel(ctx, deepseekConf)
	if err != nil {
		return nil, fmt.Errorf("创建聊天模型失败: %v", err)
	}

	// 转换消息格式
	schemaMessages := make([]*schema.Message, len(req.Messages))
	for i, msg := range req.Messages {
		role := schema.RoleType(msg.Role)
		schemaMessages[i] = &schema.Message{
			Role:    role,
			Content: msg.Content,
		}
	}

	// 调用Generate方法获取响应
	resp, err := chatModel.Generate(ctx, schemaMessages)
	if err != nil {
		return nil, fmt.Errorf("调用Generate方法失败: %v", err)
	}

	// 构造ChatCompletionChoice
	choices := []openai.ChatCompletionChoice{
		{
			Index: 0,
			Message: openai.ChatCompletionMessage{
				Role:    string(resp.Role),
				Content: resp.Content,
			},
			FinishReason: openai.FinishReason(resp.ResponseMeta.FinishReason),
		},
	}

	// 生成唯一ID
	uniqueID := fmt.Sprintf("deepseek-%d", time.Now().UnixNano())

	// 获取Token使用情况
	var usage openai.Usage
	if resp.ResponseMeta != nil && resp.ResponseMeta.Usage != nil {
		usage = openai.Usage{
			PromptTokens:     resp.ResponseMeta.Usage.PromptTokens,
			CompletionTokens: resp.ResponseMeta.Usage.CompletionTokens,
			TotalTokens:      resp.ResponseMeta.Usage.TotalTokens,
		}
	}

	// 构造并返回响应
	return &openai.ChatCompletionResponse{
		ID:      uniqueID,
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Model:   req.Model,
		Choices: choices,
		Usage:   usage,
	}, nil
}

// DeepSeekCreateChatCompletionToChat 使用DeepSeek服务创建聊天完成并转换到Chat接口格式
func DeepSeekCreateChatCompletionToChat(req ChatRequest) (*openai.ChatCompletionResponse, error) {
	// 准备请求参数
	model := req.Model
	if model == "" {
		// 如果没有指定模型，返回错误
		return nil, fmt.Errorf("未指定模型名称")
	}

	temperature := float32(req.Temperature)
	maxTokens := req.MaxTokens

	// 转换消息格式
	messages := make([]ChatMessage, 0, len(req.Messages))
	for _, msg := range req.Messages {
		messages = append(messages, ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// 创建DeepSeek请求
	deepseekReq := ChatCompletionRequest{
		Model:       model,
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}

	// 调用DeepSeek服务
	resp, err := DeepSeekCreateChatCompletion(deepseekReq)
	if err != nil {
		return nil, fmt.Errorf("调用DeepSeek聊天接口失败: %w", err)
	}

	return &openai.ChatCompletionResponse{
		ID:      resp.ID,
		Object:  resp.Object,
		Created: resp.Created,
		Model:   resp.Model,
		Choices: resp.Choices,
		Usage: openai.Usage{
			PromptTokens:     resp.Usage.PromptTokens,
			CompletionTokens: resp.Usage.CompletionTokens,
			TotalTokens:      resp.Usage.TotalTokens,
		},
	}, nil
}

// DeepSeekStreamChatCompletion 使用DeepSeek服务创建流式聊天完成
func DeepSeekStreamChatCompletion(req ChatCompletionRequest) (*schema.StreamReader[*ChatCompletionStreamResponse], error) {
	// 创建DeepSeek配置
	conf := &Config{
		Vendor:      "deepseek",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取DeepSeek配置
	deepseekConf, err := conf.getDeepSeekConfig()
	if err != nil {
		return nil, fmt.Errorf("获取DeepSeek配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := deepseek.NewChatModel(ctx, deepseekConf)
	if err != nil {
		return nil, fmt.Errorf("创建聊天模型失败: %v", err)
	}

	// 转换消息格式
	schemaMessages := make([]*schema.Message, len(req.Messages))
	for i, msg := range req.Messages {
		role := schema.RoleType(msg.Role)
		schemaMessages[i] = &schema.Message{
			Role:    role,
			Content: msg.Content,
		}
	}

	// 调用Stream方法获取流式响应
	streamReader, err := chatModel.Stream(ctx, schemaMessages)
	if err != nil {
		return nil, fmt.Errorf("调用Stream方法失败: %v", err)
	}

	// 创建结果通道
	resultReader, resultWriter := schema.Pipe[*ChatCompletionStreamResponse](10)

	// 启动goroutine处理流式数据
	go func() {
		defer func() {
			if panicErr := recover(); panicErr != nil {
				fmt.Printf("DeepSeek Stream处理发生异常: %v\n", panicErr)
			}
			streamReader.Close()
			resultWriter.Close()
		}()

		// 生成唯一ID
		uniqueID := fmt.Sprintf("deepseek-stream-%d", time.Now().UnixNano())
		created := time.Now().Unix()

		for {
			// 从流中接收消息
			message, err := streamReader.Recv()
			if errors.Is(err, io.EOF) {
				// 流结束
				break
			}
			if err != nil {
				// 处理错误
				_ = resultWriter.Send(nil, fmt.Errorf("从DeepSeek接收流数据失败: %v", err))
				return
			}

			// 获取推理内容
			reasoningContent := ""
			if reason, ok := deepseek.GetReasoningContent(message); ok {
				reasoningContent = reason
			}

			// 构造流式响应
			streamResp := &ChatCompletionStreamResponse{
				ID:      uniqueID,
				Object:  "chat.completion.chunk",
				Created: created,
				Model:   req.Model,
				Choices: []ChatCompletionStreamChoice{
					{
						Index: 0,
						Delta: ChatCompletionStreamDelta{
							Role:             string(message.Role),
							Content:          message.Content,
							ReasoningContent: reasoningContent,
						},
						FinishReason: "",
					},
				},
			}

			// 如果是最后一条消息，设置完成原因
			if message.ResponseMeta != nil && message.ResponseMeta.FinishReason != "" {
				streamResp.Choices[0].FinishReason = message.ResponseMeta.FinishReason
			}

			// 发送流式响应
			closed := resultWriter.Send(streamResp, nil)
			if closed {
				return
			}
		}
	}()

	return resultReader, nil
}

// DeepSeekStreamChatCompletionToChat 使用DeepSeek服务创建流式聊天完成并转换为聊天流格式
func DeepSeekStreamChatCompletionToChat(req ChatRequest, writer io.Writer) error {
	// 创建ChatCompletionRequest
	chatReq := ChatCompletionRequest{
		Model:       req.Model,
		Temperature: float32(req.Temperature),
		MaxTokens:   req.MaxTokens,
		Stream:      true,
	}

	// 转换消息格式
	chatReq.Messages = make([]ChatMessage, len(req.Messages))
	for i, msg := range req.Messages {
		chatReq.Messages[i] = ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	// 调用DeepSeek流式聊天API
	streamReader, err := DeepSeekStreamChatCompletion(chatReq)
	if err != nil {
		return fmt.Errorf("调用DeepSeek流式聊天接口失败: %w", err)
	}

	// 处理流式响应
	for {
		response, err := streamReader.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("接收DeepSeek流式响应失败: %w", err)
		}

		// 转换响应格式
		choices := make([]StreamChoice, 0, len(response.Choices))
		for _, choice := range response.Choices {
			choices = append(choices, StreamChoice{
				Index: choice.Index,
				Delta: StreamChoiceDelta{
					Role:    choice.Delta.Role,
					Content: choice.Delta.Content,
				},
				FinishReason: choice.FinishReason,
			})
		}

		streamResp := StreamResponse{
			ID:      response.ID,
			Object:  response.Object,
			Created: response.Created,
			Model:   response.Model,
			Choices: choices,
		}

		// 将响应写入writer
		data, err := json.Marshal(streamResp)
		if err != nil {
			return fmt.Errorf("序列化流式响应失败: %w", err)
		}

		// 添加data:前缀
		if _, err := writer.Write([]byte("data: ")); err != nil {
			return fmt.Errorf("写入流式响应前缀失败: %w", err)
		}

		if _, err := writer.Write(data); err != nil {
			return fmt.Errorf("写入流式响应失败: %w", err)
		}

		if _, err := writer.Write([]byte("\n\n")); err != nil {
			return fmt.Errorf("写入流式响应分隔符失败: %w", err)
		}
	}

	// 添加结束标记
	if _, err := writer.Write([]byte("data: [DONE]\n\n")); err != nil {
		return fmt.Errorf("写入流式响应结束标记失败: %w", err)
	}

	return nil
}
