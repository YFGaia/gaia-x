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
	"github.com/sashabaranov/go-openai"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	einoopenai "github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/schema"
	"gopkg.in/yaml.v2"
)

// 直接使用原始结构体类型
type OpenAICredential struct {
	Name           string   `yaml:"name"`
	ApiKey         string   `yaml:"api_key"`
	OrganizationID string   `yaml:"organization_id"`
	Enabled        bool     `yaml:"enabled"`
	Weight         int      `yaml:"weight"`
	QPSLimit       int      `yaml:"qps_limit"`
	Description    string   `yaml:"description"`
	Models         []string `yaml:"models"`
	BaseURL        string   `yaml:"base_url"`
	Timeout        int      `yaml:"timeout"`
	Proxy          string   `yaml:"proxy"`
}

// 修改配置文件结构定义
var openaiConfig struct {
	Environments map[string]struct {
		Credentials []OpenAICredential `yaml:"credentials"`
	} `yaml:"environments"`
}

// getOpenAIConfig 获取OpenAI配置
func (c *Config) getOpenAIConfig() (*einoopenai.ChatModelConfig, error) {
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

	// 读取配置文件
	yamlFile, err := os.ReadFile(filepath.Join(LLMConfigPath, "openai.yaml"))
	if err != nil {
		return nil, fmt.Errorf("读取OpenAI配置文件失败: %v", err)
	}

	err = yaml.Unmarshal(yamlFile, &openaiConfig)
	if err != nil {
		fmt.Printf("解析OpenAI配置文件失败: %v", err)
		//抛出异常
		return nil, err
	}

	// 获取指定环境的配置
	envConfig, ok := openaiConfig.Environments[env]
	if !ok {
		return nil, fmt.Errorf("未找到环境 %s 的配置", env)
	}

	// 存储启用的配置
	var enabledCredentials []OpenAICredential

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
	var selectedCred OpenAICredential
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

	// 确保OpenAI配置存在
	if c.VendorOptional == nil {
		c.VendorOptional = &VendorOptional{}
	}
	if c.VendorOptional.OpenAIConfig == nil {
		c.VendorOptional.OpenAIConfig = &OpenAIConfig{}
	}

	// 设置HTTP客户端
	if c.VendorOptional.OpenAIConfig.HTTPClient == nil {
		c.VendorOptional.OpenAIConfig.HTTPClient = &http.Client{}
	}

	// 如果有超时设置
	if selectedCred.Timeout > 0 {
		c.VendorOptional.OpenAIConfig.HTTPClient.Timeout = time.Duration(selectedCred.Timeout) * time.Second
	}

	// 设置代理(如果有)
	if selectedCred.Proxy != "" {
		// 设置代理URL
		c.ProxyURL = selectedCred.Proxy

		// 设置代理
		c.VendorOptional.OpenAIConfig.HTTPClient.Transport = &http.Transport{
			Proxy: func(req *http.Request) (*url.URL, error) {
				return url.Parse(selectedCred.Proxy)
			},
		}
	}

	// 解密API密钥
	_, decryptFunc1, err := InitRSAKeyManager()
	if err != nil {
		return nil, fmt.Errorf("初始化RSA密钥管理器失败: %v", err)
	}

	selectedCred.ApiKey, err = decryptFunc1(selectedCred.ApiKey)
	if err != nil {
		return nil, fmt.Errorf("解密失败: %v", err)
	}

	// 设置BaseURL(如果有)
	baseURL := "https://api.openai.com/v1"
	if selectedCred.BaseURL != "" {
		baseURL = selectedCred.BaseURL
	}

	// 创建OpenAI配置
	nConf := &einoopenai.ChatModelConfig{
		ByAzure:     false, // 普通OpenAI不使用Azure
		APIKey:      selectedCred.ApiKey,
		BaseURL:     baseURL,
		Model:       c.Model,
		MaxTokens:   &c.MaxTokens,
		Temperature: c.Temperature,
		TopP:        c.TopP,
		Stop:        c.Stop,
		// 补充额外参数
		HTTPClient:       c.VendorOptional.OpenAIConfig.HTTPClient,
		PresencePenalty:  c.VendorOptional.OpenAIConfig.PresencePenalty,
		FrequencyPenalty: c.VendorOptional.OpenAIConfig.FrequencyPenalty,
		LogitBias:        c.VendorOptional.OpenAIConfig.LogitBias,
		ResponseFormat:   c.VendorOptional.OpenAIConfig.ResponseFormat,
		Seed:             c.VendorOptional.OpenAIConfig.Seed,
		User:             c.VendorOptional.OpenAIConfig.User,
	}
	return nConf, nil
}

// OpenAICreateChatCompletion 使用OpenAI创建聊天完成
func OpenAICreateChatCompletion(req ChatCompletionRequest) (*openai.ChatCompletionResponse, error) {
	// 创建OpenAI配置
	conf := &Config{
		Vendor:      "openai",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取OpenAI配置
	openaiConf, err := conf.getOpenAIConfig()
	if err != nil {
		return nil, fmt.Errorf("获取OpenAI配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := einoopenai.NewChatModel(ctx, openaiConf)
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
			FinishReason: "stop", // 默认值，实际应根据响应确定
		},
	}

	// 如果有完成原因，使用它
	if resp.ResponseMeta != nil && resp.ResponseMeta.FinishReason != "" {
		choices[0].FinishReason = openai.FinishReason(resp.ResponseMeta.FinishReason)
	}

	// 生成唯一ID
	uniqueID := fmt.Sprintf("openai-%d", time.Now().UnixNano())

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

// OpenAICreateChatCompletionToChat 使用OpenAI服务创建聊天完成接口
func OpenAICreateChatCompletionToChat(req ChatRequest) (*openai.ChatCompletionResponse, error) {
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

	// 创建OpenAI请求
	openaiReq := ChatCompletionRequest{
		Model:       model,
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}

	// 调用OpenAI服务
	resp, err := OpenAICreateChatCompletion(openaiReq)
	if err != nil {
		return nil, fmt.Errorf("调用OpenAI聊天接口失败: %w", err)
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

// OpenAIStreamChatCompletion 使用OpenAI服务创建流式聊天完成
func OpenAIStreamChatCompletion(req ChatRequest) (*schema.StreamReader[*ChatCompletionStreamResponse], error) {
	// 创建OpenAI配置
	conf := &Config{
		Vendor:      "openai",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取OpenAI配置
	openaiConf, err := conf.getOpenAIConfig()
	if err != nil {
		return nil, fmt.Errorf("获取OpenAI配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := einoopenai.NewChatModel(ctx, openaiConf)
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
				fmt.Printf("OpenAI Stream处理发生异常: %v\n", panicErr)
			}
			streamReader.Close()
			resultWriter.Close()
		}()

		// 生成唯一ID
		uniqueID := fmt.Sprintf("openai-stream-%d", time.Now().UnixNano())
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
				_ = resultWriter.Send(nil, fmt.Errorf("从OpenAI接收流数据失败: %v", err))
				return
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
							Role:    string(message.Role),
							Content: message.Content,
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

// OpenAIStreamChatCompletionToChat 使用OpenAI服务创建流式聊天完成并转换为聊天流格式
func OpenAIStreamChatCompletionToChat(req ChatRequest, writer io.Writer) error {

	// 调用OpenAI流式聊天API
	streamReader, err := OpenAIStreamChatCompletion(req)
	if err != nil {
		return fmt.Errorf("调用OpenAI流式聊天接口失败: %w", err)
	}
	// 注意：由于streamReader没有Close方法，我们不需要defer close

	// 处理流式响应
	for {
		response, err := streamReader.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("接收OpenAI流式响应失败: %w", err)
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
