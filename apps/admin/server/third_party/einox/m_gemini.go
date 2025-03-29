package einox

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime/debug"
	"time"

	"github.com/cloudwego/eino-ext/components/model/gemini"
	"github.com/cloudwego/eino/schema"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	"gopkg.in/yaml.v2"
)

// GeminiCredential 定义Google Gemini服务的凭证配置结构
type GeminiCredential struct {
	Name                string                 `yaml:"name"`
	APIKey              string                 `yaml:"api_key"`               // Gemini API 密钥
	APIEndpoint         string                 `yaml:"api_endpoint"`          // API端点URL，可选
	Enabled             bool                   `yaml:"enabled"`               // 是否启用
	Weight              int                    `yaml:"weight"`                // 权重
	QPSLimit            int                    `yaml:"qps_limit"`             // QPS限制
	Description         string                 `yaml:"description"`           // 描述
	Models              []string               `yaml:"models"`                // 支持的模型列表
	Timeout             int                    `yaml:"timeout"`               // 超时时间
	Proxy               string                 `yaml:"proxy"`                 // 代理设置
	SafetySettings      map[string]interface{} `yaml:"safety_settings"`       // 安全设置
	GenerationConfig    map[string]interface{} `yaml:"generation_config"`     // 生成配置
	EnableCodeExecution bool                   `yaml:"enable_code_execution"` // 允许模型执行代码
}

// 配置文件结构定义
var geminiConfig struct {
	Environments map[string]struct {
		Credentials []GeminiCredential `yaml:"credentials"`
	} `yaml:"environments"`
}

// getGeminiConfig 获取Gemini配置
func (c *Config) getGeminiConfig() (*gemini.Config, error) {
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

	// 读取Gemini配置文件
	yamlFile, err := os.ReadFile(filepath.Join(LLMConfigPath, "gemini.yaml"))
	if err != nil {
		return nil, fmt.Errorf("读取Gemini配置文件失败: %v", err)
	}

	err = yaml.Unmarshal(yamlFile, &geminiConfig)
	if err != nil {
		fmt.Printf("解析Gemini配置文件失败: %v", err)
		// 抛出异常
		return nil, err
	}

	// 获取指定环境的配置
	envConfig, ok := geminiConfig.Environments[env]
	if !ok {
		return nil, fmt.Errorf("未找到环境 %s 的配置", env)
	}

	// 存储启用的配置
	var enabledCredentials []GeminiCredential

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
	var selectedCred GeminiCredential
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

	// 解密凭证
	_, decryptFunc, err := InitRSAKeyManager()
	if err != nil {
		return nil, fmt.Errorf("初始化RSA密钥管理器失败: %v", err)
	}

	// API密钥解密
	selectedCred.APIKey, err = decryptFunc(selectedCred.APIKey)
	if err != nil {
		return nil, fmt.Errorf("解密API密钥失败: %v", err)
	}

	// 创建Gemini客户端选项
	options := []option.ClientOption{
		option.WithAPIKey(selectedCred.APIKey),
	}

	// 如果设置了自定义APIEndpoint
	if selectedCred.APIEndpoint != "" {
		options = append(options, option.WithEndpoint(selectedCred.APIEndpoint))
	}

	// 如果设置了代理
	if selectedCred.Proxy != "" {
		// 创建HTTP客户端
		httpClient := &http.Client{
			Transport: &http.Transport{
				Proxy: func(req *http.Request) (*url.URL, error) {
					return url.Parse(selectedCred.Proxy)
				},
			},
		}
		options = append(options, option.WithHTTPClient(httpClient))
	}

	// 创建Gemini客户端
	client, err := genai.NewClient(context.Background(), options...)
	if err != nil {
		return nil, fmt.Errorf("创建Gemini客户端失败: %v", err)
	}

	// 添加客户端检查和超时设置
	if selectedCred.Timeout > 0 {
		// 如果配置了超时时间，创建带超时的上下文
		timeoutCtx, cancel := context.WithTimeout(context.Background(), time.Duration(selectedCred.Timeout)*time.Second)
		defer cancel()

		// 重新创建客户端，带超时上下文
		client, err = genai.NewClient(timeoutCtx, options...)
		if err != nil {
			return nil, fmt.Errorf("创建带超时的Gemini客户端失败: %v", err)
		}
	}

	// 验证支持的模型
	if len(selectedCred.Models) > 0 {
		modelSupported := false
		for _, supportedModel := range selectedCred.Models {
			if supportedModel == c.Model {
				modelSupported = true
				break
			}
		}

		if !modelSupported {
			fmt.Printf("警告: 请求的模型 %s 不在配置支持的模型列表中: %v\n", c.Model, selectedCred.Models)
		}
	}

	// 转换SafetySettings
	var safetySettings []*genai.SafetySetting
	if selectedCred.SafetySettings != nil {
		for category, threshold := range selectedCred.SafetySettings {
			// 将字符串类型的安全类别转换为genai.HarmCategory
			var harmCategory genai.HarmCategory
			switch category {
			case "harassment":
				harmCategory = genai.HarmCategoryHarassment
			case "hate_speech":
				harmCategory = genai.HarmCategoryHateSpeech
			case "sexually_explicit":
				harmCategory = genai.HarmCategorySexuallyExplicit
			case "dangerous_content":
				harmCategory = genai.HarmCategoryDangerousContent
			default:
				continue
			}

			// 将阈值字符串转换为genai.HarmBlockThreshold
			var harmThreshold genai.HarmBlockThreshold
			thresholdStr, ok := threshold.(string)
			if ok {
				switch thresholdStr {
				case "none":
					harmThreshold = genai.HarmBlockNone
				case "low":
					harmThreshold = genai.HarmBlockLowAndAbove
				case "medium":
					harmThreshold = genai.HarmBlockMediumAndAbove
				case "high":
					harmThreshold = genai.HarmBlockOnlyHigh
				default:
					harmThreshold = genai.HarmBlockMediumAndAbove
				}
			} else {
				harmThreshold = genai.HarmBlockMediumAndAbove
			}

			safetySettings = append(safetySettings, &genai.SafetySetting{
				Category:  harmCategory,
				Threshold: harmThreshold,
			})
		}
	}

	// 创建gemini.Config实例，确保与最新的结构定义匹配
	geminiConf := &gemini.Config{
		Client:      client,
		Model:       c.Model,
		Temperature: c.Temperature,
		TopP:        c.TopP,
	}

	// 设置MaxTokens参数(如果有)
	if c.MaxTokens > 0 {
		maxTokens := c.MaxTokens
		geminiConf.MaxTokens = &maxTokens
	}

	// 设置SafetySettings (经过转换的[]*genai.SafetySetting)
	geminiConf.SafetySettings = safetySettings

	// 设置VendorOptional中的额外参数(如果有)
	if c.VendorOptional != nil && c.VendorOptional.GeminiConfig != nil {
		// 设置TopK参数
		if c.VendorOptional.GeminiConfig.TopK != nil {
			geminiConf.TopK = c.VendorOptional.GeminiConfig.TopK
		}

		// 设置是否启用代码执行
		geminiConf.EnableCodeExecution = c.VendorOptional.GeminiConfig.EnableCodeExecution || selectedCred.EnableCodeExecution

		// 设置ResponseSchema(如果有)
		if c.VendorOptional.GeminiConfig.ResponseSchema != nil {
			// 将map[string]interface{}转换为openapi3.Schema
			schemaJSON, err := json.Marshal(c.VendorOptional.GeminiConfig.ResponseSchema)
			if err != nil {
				return nil, fmt.Errorf("序列化ResponseSchema失败: %v", err)
			}

			var schema openapi3.Schema
			if err := json.Unmarshal(schemaJSON, &schema); err != nil {
				return nil, fmt.Errorf("解析ResponseSchema失败: %v", err)
			}

			geminiConf.ResponseSchema = &schema
		}

		// 处理GenerationConfig中的其他配置项
		if selectedCred.GenerationConfig != nil {
			// 这里可以根据需要从GenerationConfig中提取其他配置项
			// 比如，后续可能会支持更多的生成选项
			fmt.Printf("提示: Gemini凭证中包含GenerationConfig，但当前版本暂未完全支持\n")
		}
	} else {
		// 如果没有设置VendorOptional，确保初始化
		if c.VendorOptional == nil {
			c.VendorOptional = &VendorOptional{}
		}
		if c.VendorOptional.GeminiConfig == nil {
			c.VendorOptional.GeminiConfig = &GeminiConfig{}
		}
		// 仅使用凭证的EnableCodeExecution
		geminiConf.EnableCodeExecution = selectedCred.EnableCodeExecution
	}

	return geminiConf, nil
}

// GeminiCreateChatCompletion 使用Google Gemini服务创建聊天完成
func GeminiCreateChatCompletion(req ChatCompletionRequest) (*ChatCompletionResponse, error) {
	// 创建Gemini配置
	conf := &Config{
		Vendor:      "gemini",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取Gemini配置
	geminiConf, err := conf.getGeminiConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Gemini配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 转换消息格式
	schemaMessages := make([]*schema.Message, len(req.Messages))
	for i, msg := range req.Messages {
		role := schema.RoleType(msg.Role)
		schemaMessages[i] = &schema.Message{
			Role:    role,
			Content: msg.Content,
		}
	}

	// 创建生成模型
	model := geminiConf.Client.GenerativeModel(req.Model)

	// 设置参数
	if req.MaxTokens > 0 {
		model.SetMaxOutputTokens(int32(req.MaxTokens))
	}
	if req.Temperature > 0 {
		model.SetTemperature(req.Temperature)
	}
	if req.TopP > 0 {
		model.SetTopP(req.TopP)
	}
	if geminiConf.TopK != nil {
		model.SetTopK(*geminiConf.TopK)
	}

	// 设置安全级别
	if len(geminiConf.SafetySettings) > 0 {
		model.SafetySettings = geminiConf.SafetySettings
	}

	// 如果配置了ResponseSchema，设置结构化输出格式
	if geminiConf.ResponseSchema != nil {
		// 请求JSON格式响应
		model.ResponseMIMEType = "application/json"

		// 创建Schema实例 - 使用vertexai/genai包的TypeObject常量
		// 根据搜索结果，TypeObject = 6
		schema := &genai.Schema{
			Type:        6, // TypeObject = 6
			Description: geminiConf.ResponseSchema.Description,
			Properties:  make(map[string]*genai.Schema),
		}

		// 如果有需要，还可以进一步转换properties
		// 注意：这里只是一个简化的转换示例

		// 设置ResponseSchema
		model.ResponseSchema = schema
	}

	// 设置是否启用代码执行
	if geminiConf.EnableCodeExecution {
		// 注意：启用代码执行可能存在安全风险，应谨慎使用
		fmt.Printf("警告：已为模型 %s 启用代码执行功能\n", req.Model)
	}

	// 转换消息为Gemini格式
	chat := model.StartChat()
	for i := 0; i < len(schemaMessages)-1; i++ {
		msg := schemaMessages[i]
		parts := []genai.Part{genai.Text(msg.Content)}
		content := &genai.Content{
			Role:  toGeminiRole(msg.Role),
			Parts: parts,
		}
		chat.History = append(chat.History, content)
	}

	// 发送最后一条消息
	lastMsg := schemaMessages[len(schemaMessages)-1]
	resp, err := chat.SendMessage(ctx, genai.Text(lastMsg.Content))
	if err != nil {
		return nil, fmt.Errorf("发送消息失败: %v", err)
	}

	// 解析响应
	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("Gemini返回的响应是空的")
	}

	content := ""
	for _, part := range resp.Candidates[0].Content.Parts {
		if text, ok := part.(genai.Text); ok {
			content += string(text)
		}
	}

	// 构造ChatCompletionChoice
	choices := []ChatCompletionChoice{
		{
			Index: 0,
			Message: ChatMessage{
				Role:    "assistant",
				Content: content,
			},
			FinishReason: "stop", // 默认值
		},
	}

	// 生成唯一ID
	uniqueID := fmt.Sprintf("gemini-%d", time.Now().UnixNano())

	// 获取Token使用情况
	usage := ChatCompletionUsage{}
	if resp.UsageMetadata != nil {
		usage = ChatCompletionUsage{
			PromptTokens:     int(resp.UsageMetadata.PromptTokenCount),
			CompletionTokens: int(resp.UsageMetadata.CandidatesTokenCount),
			TotalTokens:      int(resp.UsageMetadata.TotalTokenCount),
		}
	}

	// 构造并返回响应
	return &ChatCompletionResponse{
		ID:      uniqueID,
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Model:   req.Model,
		Choices: choices,
		Usage:   usage,
	}, nil
}

// GeminiCreateChatCompletionToChat 使用Google Gemini服务创建聊天完成接口
func GeminiCreateChatCompletionToChat(req ChatRequest) (*ChatResponse, error) {
	// 准备请求参数
	model := req.Model
	if model == "" {
		// 如果没有指定模型，可以设置一个默认值或返回错误
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

	// 创建Gemini请求
	geminiReq := ChatCompletionRequest{
		Model:       model,
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}

	// 调用Gemini服务
	resp, err := GeminiCreateChatCompletion(geminiReq)
	if err != nil {
		return nil, fmt.Errorf("调用Gemini聊天接口失败: %w", err)
	}

	// 转换响应格式
	choices := make([]Choice, 0, len(resp.Choices))
	for _, choice := range resp.Choices {
		choices = append(choices, Choice{
			Index: choice.Index,
			Message: ChatMessage{
				Role:    choice.Message.Role,
				Content: choice.Message.Content,
			},
			FinishReason: choice.FinishReason,
		})
	}

	return &ChatResponse{
		ID:      resp.ID,
		Object:  resp.Object,
		Created: resp.Created,
		Model:   resp.Model,
		Choices: choices,
		Usage: TokenUsage{
			PromptTokens:     resp.Usage.PromptTokens,
			CompletionTokens: resp.Usage.CompletionTokens,
			TotalTokens:      resp.Usage.TotalTokens,
		},
	}, nil
}

// GeminiStreamChatCompletion 使用Google Gemini服务创建流式聊天完成
func GeminiStreamChatCompletion(req ChatRequest) (*schema.StreamReader[*ChatCompletionStreamResponse], error) {
	// 创建Gemini配置
	conf := &Config{
		Vendor:      "gemini",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取Gemini配置
	geminiConf, err := conf.getGeminiConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Gemini配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 转换消息格式
	schemaMessages := make([]*schema.Message, len(req.Messages))
	for i, msg := range req.Messages {
		role := schema.RoleType(msg.Role)
		schemaMessages[i] = &schema.Message{
			Role:    role,
			Content: msg.Content,
		}
	}

	// 创建生成模型
	model := geminiConf.Client.GenerativeModel(req.Model)

	// 设置参数
	if req.MaxTokens > 0 {
		model.SetMaxOutputTokens(int32(req.MaxTokens))
	}
	if req.Temperature > 0 {
		model.SetTemperature(req.Temperature)
	}
	if req.TopP > 0 {
		model.SetTopP(req.TopP)
	}
	if geminiConf.TopK != nil {
		model.SetTopK(*geminiConf.TopK)
	}

	// 设置安全级别
	if len(geminiConf.SafetySettings) > 0 {
		model.SafetySettings = geminiConf.SafetySettings
	}

	// 如果配置了ResponseSchema，设置结构化输出格式
	if geminiConf.ResponseSchema != nil {
		// 请求JSON格式响应
		model.ResponseMIMEType = "application/json"

		// 创建Schema实例 - 使用vertexai/genai包的TypeObject常量
		// 根据搜索结果，TypeObject = 6
		schema := &genai.Schema{
			Type:        6, // TypeObject = 6
			Description: geminiConf.ResponseSchema.Description,
			Properties:  make(map[string]*genai.Schema),
		}

		// 如果有需要，还可以进一步转换properties
		// 注意：这里只是一个简化的转换示例

		// 设置ResponseSchema
		model.ResponseSchema = schema
	}

	// 设置是否启用代码执行
	if geminiConf.EnableCodeExecution {
		// 注意：启用代码执行可能存在安全风险，应谨慎使用
		fmt.Printf("警告：已为模型 %s 启用代码执行功能\n", req.Model)
	}

	// 转换消息为Gemini格式
	chat := model.StartChat()
	for i := 0; i < len(schemaMessages)-1; i++ {
		msg := schemaMessages[i]
		parts := []genai.Part{genai.Text(msg.Content)}
		content := &genai.Content{
			Role:  toGeminiRole(msg.Role),
			Parts: parts,
		}
		chat.History = append(chat.History, content)
	}

	// 发送最后一条消息（流式）
	lastMsg := schemaMessages[len(schemaMessages)-1]
	streamIter := chat.SendMessageStream(ctx, genai.Text(lastMsg.Content))

	// 创建结果通道
	resultReader, resultWriter := schema.Pipe[*ChatCompletionStreamResponse](10)

	// 启动goroutine处理流式数据
	go func() {
		defer func() {
			if panicErr := recover(); panicErr != nil {
				// 捕获panic并打印详细信息
				stack := debug.Stack()
				fmt.Printf("Gemini Stream处理发生异常: %v\n堆栈: %s\n", panicErr, string(stack))
				// 发送错误信息给resultWriter
				_ = resultWriter.Send(nil, fmt.Errorf("Gemini Stream处理发生异常: %v", panicErr))
			}
			// 只关闭resultWriter
			resultWriter.Close()
		}()

		// 生成唯一ID
		uniqueID := fmt.Sprintf("gemini-stream-%d", time.Now().UnixNano())
		created := time.Now().Unix()

		for {
			resp, err := streamIter.Next()
			if errors.Is(err, io.EOF) {
				// 流结束
				break
			}
			if err != nil {
				// 处理错误
				_ = resultWriter.Send(nil, fmt.Errorf("从Gemini接收流数据失败: %v", err))
				return
			}

			if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
				continue
			}

			content := ""
			for _, part := range resp.Candidates[0].Content.Parts {
				if text, ok := part.(genai.Text); ok {
					content += string(text)
				}
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
							Role:    "assistant",
							Content: content,
						},
						FinishReason: "",
					},
				},
			}

			// 如果是最后一条消息，设置完成原因
			if resp.Candidates[0].FinishReason != genai.FinishReasonUnspecified {
				streamResp.Choices[0].FinishReason = resp.Candidates[0].FinishReason.String()
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

// GeminiStreamChatCompletionToChat 使用Google Gemini服务创建流式聊天完成并转换为聊天流格式
func GeminiStreamChatCompletionToChat(req ChatRequest, writer io.Writer) error {
	// 调用Gemini流式聊天API
	streamReader, err := GeminiStreamChatCompletion(req)
	if err != nil {
		return fmt.Errorf("调用Gemini流式聊天接口失败: %w", err)
	}
	// 注意：由于streamReader没有Close方法，我们不需要defer close

	// 处理流式响应
	for {
		response, err := streamReader.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("接收Gemini流式响应失败: %w", err)
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

// 用于将schema.RoleType转换为Gemini的角色类型
func toGeminiRole(role schema.RoleType) string {
	switch role {
	case schema.Assistant:
		return "model"
	default:
		return "user"
	}
}
