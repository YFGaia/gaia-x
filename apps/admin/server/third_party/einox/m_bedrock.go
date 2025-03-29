/*
 * Copyright 2024 CloudWeGo Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
	"strings"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/sashabaranov/go-openai"

	"encoding/base64"

	"github.com/cloudwego/eino-ext/components/model/claude"
	"github.com/cloudwego/eino/schema"
	"gopkg.in/yaml.v2"
)

// BedrockCredential 定义Bedrock服务的凭证配置结构
type BedrockCredential struct {
	Name            string   `yaml:"name"`
	AccessKey       string   `yaml:"access_key"`        // Bedrock API 访问密钥
	SecretAccessKey string   `yaml:"secret_access_key"` // Bedrock API 密钥
	Region          string   `yaml:"region"`            // 区域
	SessionToken    string   `yaml:"session_token"`     // Bedrock API 会话令牌（可选）
	Enabled         bool     `yaml:"enabled"`           // 是否启用
	Weight          int      `yaml:"weight"`            // 权重
	QPSLimit        int      `yaml:"qps_limit"`         // QPS限制
	Description     string   `yaml:"description"`       // 描述
	Models          []string `yaml:"models"`            // 支持的模型列表
	Timeout         int      `yaml:"timeout"`           // 超时时间
	Proxy           string   `yaml:"proxy"`             // 代理设置
}

// 配置文件结构定义
var bedrockConfig struct {
	Environments map[string]struct {
		Credentials []BedrockCredential `yaml:"credentials"`
	} `yaml:"environments"`
}

// getBedrockConfig 获取Bedrock配置
func (c *Config) getBedrockConfig() (*claude.Config, error) {
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

	// 读取Bedrock配置文件
	yamlFile, err := os.ReadFile(filepath.Join(LLMConfigPath, "bedrock.yaml"))
	if err != nil {
		return nil, fmt.Errorf("读取Bedrock配置文件失败: %v", err)
	}

	err = yaml.Unmarshal(yamlFile, &bedrockConfig)
	if err != nil {
		return nil, fmt.Errorf("解析Bedrock配置文件失败: %v", err)
	}

	// 获取指定环境的配置
	envConfig, ok := bedrockConfig.Environments[env]
	if !ok {
		return nil, fmt.Errorf("未找到环境 %s 的配置", env)
	}

	// 存储启用的配置
	var enabledCredentials []BedrockCredential

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
	var selectedCred BedrockCredential
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

	// AccessKey解密
	selectedCred.AccessKey, err = decryptFunc(selectedCred.AccessKey)
	if err != nil {
		return nil, fmt.Errorf("解密AccessKey失败: %v", err)
	}

	// SecretAccessKey解密
	selectedCred.SecretAccessKey, err = decryptFunc(selectedCred.SecretAccessKey)
	if err != nil {
		return nil, fmt.Errorf("解密SecretAccessKey失败: %v", err)
	}

	// 创建Claude配置，指定使用Bedrock服务
	claudeConf := &claude.Config{
		ByBedrock:       true, // 必须设置为true
		AccessKey:       selectedCred.AccessKey,
		SecretAccessKey: selectedCred.SecretAccessKey,
		SessionToken:    selectedCred.SessionToken,
		Region:          selectedCred.Region,
		Model:           c.Model,
		MaxTokens:       c.MaxTokens,
		Temperature:     c.Temperature,
		TopP:            c.TopP,
		StopSequences:   c.Stop,
	}

	// 确保BedrockConfig存在
	if c.VendorOptional == nil {
		c.VendorOptional = &VendorOptional{}
	}
	if c.VendorOptional.BedrockConfig == nil {
		c.VendorOptional.BedrockConfig = &BedrockConfig{}
	}

	// 从BedrockConfig获取TopK参数
	if c.VendorOptional.BedrockConfig.TopK != nil {
		claudeConf.TopK = c.VendorOptional.BedrockConfig.TopK
	}

	// 如果设置了代理
	if selectedCred.Proxy != "" {
		// 创建HTTP客户端
		c.ProxyURL = selectedCred.Proxy
		// 创建HTTP客户端
		httpClient := &http.Client{
			Transport: &http.Transport{
				Proxy: func(req *http.Request) (*url.URL, error) {
					return url.Parse(selectedCred.Proxy)
				},
			},
		}

		// 设置超时（如果配置了超时时间）
		if selectedCred.Timeout > 0 {
			httpClient.Timeout = time.Duration(selectedCred.Timeout) * time.Second
		}

		// 在函数级别设置HTTP客户端
		http.DefaultClient = httpClient
	} else if selectedCred.Timeout > 0 {
		// 如果只设置了超时但没有代理
		// 创建HTTP客户端并仅应用超时设置
		httpClient := &http.Client{
			Timeout: time.Duration(selectedCred.Timeout) * time.Second,
		}

		// 在函数级别设置HTTP客户端
		http.DefaultClient = httpClient
	}

	return claudeConf, nil
}

// BedrockCreateChatCompletion 使用AWS Bedrock服务创建聊天完成
func BedrockCreateChatCompletionToChat(req ChatRequest) (*openai.ChatCompletionResponse, error) {
	// 准备请求参数
	model := req.Model
	if model == "" {
		// 如果没有指定模型，可以设置一个默认值或返回错误
		return nil, fmt.Errorf("未指定模型名称")
	}
	// 创建Bedrock配置
	temperature := float32(req.Temperature)
	topP := float32(req.TopP)

	conf := &Config{
		Vendor:      "bedrock",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &temperature,
		TopP:        &topP,
		Stop:        req.Stop,
	}

	// 获取Bedrock配置
	bedrockConf, err := conf.getBedrockConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Bedrock配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := claude.NewChatModel(ctx, bedrockConf)
	if err != nil {
		return nil, fmt.Errorf("创建聊天模型失败: %v", err)
	}

	// 转换消息格式，使用公共方法
	schemaMessages := convertChatRequestToSchemaMessages(req)

	// 处理工具调用
	if req.Tools != nil && len(req.Tools) > 0 {
		// 转换工具并过滤同名工具
		tools, err := convertToolInfos(req.Tools)
		if err != nil {
			return nil, fmt.Errorf("转换工具信息失败: %v", err)
		}

		// 绑定工具
		err = chatModel.BindTools(tools)
		if err != nil {
			return nil, fmt.Errorf("绑定工具调用失败: %v", err)
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
			FinishReason: openai.FinishReason(resp.ResponseMeta.FinishReason), // 默认值，实际应根据响应确定
		},
	}

	// 生成唯一ID
	uniqueID := fmt.Sprintf("bedrock-%d", time.Now().UnixNano())

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

// BedrockStreamChatCompletion 使用AWS Bedrock服务创建流式聊天完成
func BedrockStreamChatCompletion(req ChatRequest) (*schema.StreamReader[*openai.ChatCompletionStreamResponse], error) {
	// 创建Bedrock配置
	conf := &Config{
		Vendor:      "bedrock",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取Bedrock配置
	bedrockConf, err := conf.getBedrockConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Bedrock配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := claude.NewChatModel(ctx, bedrockConf)
	if err != nil {
		return nil, fmt.Errorf("创建聊天模型失败: %v", err)
	}

	// 转换消息格式，使用公共方法
	schemaMessages := convertChatRequestToSchemaMessages(req)

	if req.Tools != nil && len(req.Tools) > 0 {
		// 转换工具并过滤同名工具
		tools, err := convertToolInfos(req.Tools)
		if err != nil {
			return nil, fmt.Errorf("转换工具信息失败: %v", err)
		}

		// 绑定工具
		err = chatModel.BindTools(tools)
		if err != nil {
			return nil, fmt.Errorf("绑定工具调用失败: %v", err)
		}
	}

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
				fmt.Printf("Bedrock Stream处理发生异常: %v\n", panicErr)
			}
			streamReader.Close()
			resultWriter.Close()
		}()

		// 生成唯一ID
		uniqueID := fmt.Sprintf("bedrock-stream-%d", time.Now().UnixNano())
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
				_ = resultWriter.Send(nil, fmt.Errorf("从Bedrock接收流数据失败: %v", err))
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
							Role:      string(message.Role),
							Content:   message.Content,
							ToolCalls: convertToolCalls(message.ToolCalls),
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

// 添加convertToolCalls函数
func convertToolCalls(toolCalls []schema.ToolCall) []openai.ToolCall {
	converted := make([]openai.ToolCall, len(toolCalls))
	for i, tc := range toolCalls {
		converted[i] = openai.ToolCall{
			Index: tc.Index,
			ID:    tc.ID,
			Type:  openai.ToolType(tc.Type),
			Function: openai.FunctionCall{
				Name:      tc.Function.Name,
				Arguments: tc.Function.Arguments,
			},
		}
	}
	return converted
}

// BedrockStreamChatCompletionToChat 使用AWS Bedrock服务创建流式聊天完成并转换为聊天流格式
func BedrockStreamChatCompletionToChat(req ChatRequest, writer io.Writer) error {
	// 调用Bedrock流式聊天API
	streamReader, err := BedrockStreamChatCompletion(req)
	if err != nil {
		return fmt.Errorf("调用Bedrock流式聊天接口失败: %w", err)
	}
	// 注意：由于streamReader没有Close方法，我们不需要defer close

	// 处理流式响应
	for {
		response, err := streamReader.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("接收Bedrock流式响应失败: %w", err)
		}

		// 转换响应格式
		choices := make([]openai.ChatCompletionStreamChoice, 0, len(response.Choices))
		for _, choice := range response.Choices {
			choices = append(choices, openai.ChatCompletionStreamChoice{
				Index: choice.Index,
				Delta: openai.ChatCompletionStreamChoiceDelta{
					Role:      choice.Delta.Role,
					Content:   choice.Delta.Content,
					ToolCalls: choice.Delta.ToolCalls,
					Refusal:   choice.Delta.Refusal,
				},
				FinishReason: choice.FinishReason,
			})
		}

		streamResp := openai.ChatCompletionStreamResponse{
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

// getRequiredFields 从参数对象中提取required字段
func getRequiredFields(paramsObj map[string]interface{}) []string {
	if required, ok := paramsObj["required"].([]interface{}); ok {
		result := make([]string, 0, len(required))
		for _, r := range required {
			if s, ok := r.(string); ok {
				result = append(result, s)
			}
		}
		return result
	}
	return nil
}

// convertToolInfos 转换工具信息并过滤同名工具
func convertToolInfos(reqTools []openai.Tool) ([]*schema.ToolInfo, error) {
	tools := make([]*schema.ToolInfo, 0, len(reqTools))
	toolNameMap := make(map[string]bool) // 用于记录已存在的工具名称

	for _, tool := range reqTools {
		// 检查工具名称是否已存在，如果存在则跳过
		if _, exists := toolNameMap[tool.Function.Name]; exists {
			fmt.Printf("跳过重复的工具名称: %s\n", tool.Function.Name)
			continue
		}

		toolNameMap[tool.Function.Name] = true
		toolProperties := make(map[string]*openapi3.SchemaRef)

		// 获取并处理Parameters
		var paramsObj map[string]interface{}

		switch params := tool.Function.Parameters.(type) {
		case string:
			// 如果是字符串，尝试解析JSON
			if err := json.Unmarshal([]byte(params), &paramsObj); err != nil {
				return nil, fmt.Errorf("工具参数JSON解析失败: %v", err)
			}
		case map[string]interface{}:
			// 如果已经是map，直接使用
			paramsObj = params
		default:
			return nil, fmt.Errorf("工具参数格式不支持: %T", tool.Function.Parameters)
		}

		// 处理顶层属性
		propertiesMap, ok := paramsObj["properties"].(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("参数缺少properties字段或格式不正确: %+v", paramsObj)
		}

		// 处理参数属性
		for key, val := range propertiesMap {
			propMap, ok := val.(map[string]interface{})
			fmt.Printf("propMap:%+v\n", propMap)
			if !ok {
				return nil, fmt.Errorf("属性 %s 格式不正确", key)
			}

			openapi3schema := &openapi3.Schema{}

			// 处理type字段
			if typeVal, exists := propMap["type"]; exists {
				openapi3schema.Type = fmt.Sprintf("%v", typeVal)
			} else {
				openapi3schema.Type = "string" // 默认类型
			}

			// 处理title字段
			if titleVal, exists := propMap["title"]; exists {
				openapi3schema.Title = fmt.Sprintf("%v", titleVal)
			}

			// 处理description字段
			if descVal, exists := propMap["description"]; exists {
				openapi3schema.Description = fmt.Sprintf("%v", descVal)
			}

			// 处理default字段
			if defaultVal, exists := propMap["default"]; exists {
				openapi3schema.Default = defaultVal
			}

			toolProperties[key] = &openapi3.SchemaRef{
				Value: openapi3schema,
			}
		}

		tools = append(tools, &schema.ToolInfo{
			Name: tool.Function.Name,
			Desc: tool.Function.Description,
			ParamsOneOf: schema.NewParamsOneOfByOpenAPIV3(&openapi3.Schema{
				Type:       "object",
				Properties: toolProperties,
				Required:   getRequiredFields(paramsObj),
			}),
		})
	}

	return tools, nil
}

// convertImageURLToBase64 将图片URL转换为BASE64编码
func convertImageURLToBase64(imageURL string) (string, string, error) {
	// 创建HTTP请求
	client := http.DefaultClient
	resp, err := client.Get(imageURL)
	if err != nil {
		return "", "", fmt.Errorf("下载图片失败: %v", err)
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("下载图片失败，状态码: %d", resp.StatusCode)
	}

	// 获取MIME类型
	mimeType := resp.Header.Get("Content-Type")
	if mimeType == "" {
		// 如果响应头没有指定MIME类型，则根据URL推测
		mimeType = detectMIMEType(imageURL)
	}

	// 读取图片数据
	imageData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("读取图片数据失败: %v", err)
	}

	// 转换为BASE64
	base64Data := fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(imageData))

	return base64Data, mimeType, nil
}

// isURL 判断字符串是否是URL
func isURL(str string) bool {
	// 简单的URL判断逻辑
	return strings.HasPrefix(str, "http://") || strings.HasPrefix(str, "https://")
}
