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
	"time"

	"github.com/sashabaranov/go-openai"

	einoopenai "github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/schema"
	"gopkg.in/yaml.v2"
)

// 直接使用原始结构体类型
type AzureCredential struct {
	Name         string   `yaml:"name"`
	ApiKey       string   `yaml:"api_key"`
	Endpoint     string   `yaml:"endpoint"`
	DeploymentId string   `yaml:"deployment_id"`
	ApiVersion   string   `yaml:"api_version"`
	Enabled      bool     `yaml:"enabled"`
	Weight       int      `yaml:"weight"`
	QPSLimit     int      `yaml:"qps_limit"`
	Description  string   `yaml:"description"`
	Models       []string `yaml:"models"`
	Timeout      int      `yaml:"timeout"`
	Proxy        string   `yaml:"proxy"`
}

// 修改配置文件结构定义
var azureConfig struct {
	Environments map[string]struct {
		Credentials []AzureCredential `yaml:"credentials"`
	} `yaml:"environments"`
}

// getAzureConfig 获取Azure配置
func (c *Config) getAzureConfig() (*einoopenai.ChatModelConfig, error) {
	// 使用统一定义的环境变量
	env := ENV
	if env == "" {
		env = "development"
	}

	//读取环境变量
	err := LoadLLMConfigPathFromEnv()
	if err != nil {
		return nil, fmt.Errorf("读取LLM配置路径失败: %v", err)
	}

	// 读取Azure配置文件
	yamlFile, err := os.ReadFile(filepath.Join(LLMConfigPath, "azure.yaml"))
	if err != nil {
		return nil, fmt.Errorf("读取Azure配置文件失败: %v", err)
	}

	err = yaml.Unmarshal(yamlFile, &azureConfig)
	if err != nil {
		fmt.Printf("解析Azure配置文件失败: %v", err)
		//抛出异常
		return nil, err
	}

	// 获取指定环境的配置
	envConfig, ok := azureConfig.Environments[env]
	if !ok {
		return nil, fmt.Errorf("未找到环境 %s 的配置", env)
	}

	// 存储启用的配置
	var enabledCredentials []AzureCredential

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
	var selectedCred AzureCredential
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

	// 确保微软Azure配置存在
	if c.VendorOptional == nil {
		c.VendorOptional = &VendorOptional{}
	}
	if c.VendorOptional.AzureConfig == nil {
		c.VendorOptional.AzureConfig = &AzureConfig{}
	}

	//判断c.VendorOptional.AzureConfig.HTTPClient 可完善优化
	if c.VendorOptional.AzureConfig.HTTPClient == nil {
		c.VendorOptional.AzureConfig.HTTPClient = &http.Client{}
	}

	//判断代理设置不为空设置代理 可完善优化
	if selectedCred.Proxy != "" {
		c.VendorOptional.AzureConfig.HTTPClient.Transport = &http.Transport{
			Proxy: func(req *http.Request) (*url.URL, error) {
				return url.Parse(selectedCred.Proxy)
			},
		}
	}

	//selectedCred.Timeout大于0时设置请求超时时间
	if selectedCred.Timeout > 0 {
		c.VendorOptional.AzureConfig.HTTPClient.Timeout = time.Duration(selectedCred.Timeout) * time.Second
	}

	//selectedCred.ApiKey 解密
	// 第一次初始化，应该生成新的密钥文件
	_, decryptFunc1, err := InitRSAKeyManager()
	if err != nil {
		return nil, fmt.Errorf("初始化RSA密钥管理器失败: %v", err)
	}
	selectedCred.ApiKey, err = decryptFunc1(selectedCred.ApiKey)
	if err != nil {
		return nil, fmt.Errorf("解密失败: %v", err)
	}

	nConf := &einoopenai.ChatModelConfig{
		ByAzure:     true,
		APIKey:      selectedCred.ApiKey,
		BaseURL:     selectedCred.Endpoint,
		APIVersion:  selectedCred.ApiVersion,
		Model:       c.Model,
		MaxTokens:   &c.MaxTokens,
		Temperature: c.Temperature,
		TopP:        c.TopP,
		Stop:        c.Stop,
		// 补充额外参数
		HTTPClient:       c.VendorOptional.AzureConfig.HTTPClient,
		PresencePenalty:  c.VendorOptional.AzureConfig.PresencePenalty,
		FrequencyPenalty: c.VendorOptional.AzureConfig.FrequencyPenalty,
		LogitBias:        c.VendorOptional.AzureConfig.LogitBias,
		ResponseFormat:   c.VendorOptional.AzureConfig.ResponseFormat,
		Seed:             c.VendorOptional.AzureConfig.Seed,
		User:             c.VendorOptional.AzureConfig.User,
	}
	return nConf, nil
}

// AzureCreateChatCompletion 使用Azure OpenAI服务创建聊天完成
func AzureCreateChatCompletion(req ChatRequest) (*openai.ChatCompletionResponse, error) {
	// 创建Azure OpenAI配置
	conf := &Config{
		Vendor:      "azure",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取Azure配置
	azureConf, err := conf.getAzureConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Azure配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := einoopenai.NewChatModel(ctx, azureConf)
	if err != nil {
		return nil, fmt.Errorf("创建聊天模型失败: %v", err)
	}

	// 转换消息格式，使用通用方法
	schemaMessages := convertChatRequestToSchemaMessages(req)

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
			FinishReason: "stop", // 默认值，实际应根据响应确定
		},
	}

	// 生成唯一ID
	uniqueID := fmt.Sprintf("azure-%d", time.Now().UnixNano())

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

// AzureCreateChatCompletionToChat 使用Azure OpenAI服务创建聊天完成接口
func AzureCreateChatCompletionToChat(req ChatRequest) (*openai.ChatCompletionResponse, error) {
	// 准备请求参数
	model := req.Model
	if model == "" {
		// 如果没有指定模型，可以设置一个默认值或返回错误
		return nil, fmt.Errorf("未指定模型名称")
	}

	// 调用Azure服务
	resp, err := AzureCreateChatCompletion(req)
	if err != nil {
		return nil, fmt.Errorf("调用Azure聊天接口失败: %w", err)
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

// AzureStreamChatCompletion 使用Azure OpenAI服务创建流式聊天完成
func AzureStreamChatCompletion(req ChatRequest) (*schema.StreamReader[*openai.ChatCompletionStreamResponse], error) {
	// 创建Azure OpenAI配置
	conf := &Config{
		Vendor:      "azure",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取Azure配置
	azureConf, err := conf.getAzureConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Azure配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := einoopenai.NewChatModel(ctx, azureConf)
	if err != nil {
		return nil, fmt.Errorf("创建聊天模型失败: %v", err)
	}

	// 转换消息格式，使用通用方法
	schemaMessages := convertChatRequestToSchemaMessages(req)

	// 调用Stream方法获取流式响应
	streamReader, err := chatModel.Stream(ctx, schemaMessages)
	if err != nil {
		return nil, fmt.Errorf("调用Stream方法失败: %v", err)
	}

	// 创建结果通道
	resultReader, resultWriter := schema.Pipe[*openai.ChatCompletionStreamResponse](10)

	// 启动goroutine处理流式数据
	go func() {
		defer func() {
			if panicErr := recover(); panicErr != nil {
				fmt.Printf("Azure Stream处理发生异常: %v\n", panicErr)
			}
			streamReader.Close()
			resultWriter.Close()
		}()

		// 生成唯一ID
		uniqueID := fmt.Sprintf("azure-stream-%d", time.Now().UnixNano())
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
				_ = resultWriter.Send(nil, fmt.Errorf("从Azure接收流数据失败: %v", err))
				return
			}

			// 构造流式响应
			streamResp := &openai.ChatCompletionStreamResponse{
				ID:      uniqueID,
				Object:  "chat.completion.chunk",
				Created: created,
				Model:   req.Model,
				Choices: []openai.ChatCompletionStreamChoice{
					{
						Index: 0,
						Delta: openai.ChatCompletionStreamChoiceDelta{
							Role:    string(message.Role),
							Content: message.Content,
						},
						FinishReason: "",
					},
				},
			}

			// 如果是最后一条消息，设置完成原因
			if message.ResponseMeta != nil && message.ResponseMeta.FinishReason != "" {
				streamResp.Choices[0].FinishReason = openai.FinishReason(message.ResponseMeta.FinishReason)
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

// AzureStreamChatCompletionToChat 使用Azure OpenAI服务创建流式聊天完成并转换为聊天流格式
func AzureStreamChatCompletionToChat(req ChatRequest, writer io.Writer) error {
	// 调用Azure流式聊天API
	streamReader, err := AzureStreamChatCompletion(req)
	if err != nil {
		return fmt.Errorf("调用Azure流式聊天接口失败: %w", err)
	}
	// 注意：由于streamReader没有Close方法，我们不需要defer close

	// 处理流式响应
	for {
		response, err := streamReader.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("接收Azure流式响应失败: %w", err)
		}

		streamResp := openai.ChatCompletionStreamResponse{
			ID:      response.ID,
			Object:  response.Object,
			Created: response.Created,
			Model:   response.Model,
			Choices: response.Choices,
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
