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

	"github.com/cloudwego/eino-ext/components/model/claude"
	"github.com/cloudwego/eino/schema"
	"gopkg.in/yaml.v2"
)

// ClaudeCredential 定义Claude服务的凭证配置结构
type ClaudeCredential struct {
	Name        string   `yaml:"name"`
	APIKey      string   `yaml:"api_key"`     // Claude API 密钥
	BaseURL     string   `yaml:"base_url"`    // 自定义API端点URL
	Enabled     bool     `yaml:"enabled"`     // 是否启用
	Weight      int      `yaml:"weight"`      // 权重
	QPSLimit    int      `yaml:"qps_limit"`   // QPS限制
	Description string   `yaml:"description"` // 描述
	Models      []string `yaml:"models"`      // 支持的模型列表
	Timeout     int      `yaml:"timeout"`     // 超时时间
	Proxy       string   `yaml:"proxy"`       // 代理设置
}

// 配置文件结构定义
var claudeConfig struct {
	Environments map[string]struct {
		Credentials []ClaudeCredential `yaml:"credentials"`
	} `yaml:"environments"`
}

// getClaudeConfig 获取Claude配置
func (c *Config) getClaudeConfig() (*claude.Config, error) {
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

	// 读取Claude配置文件
	yamlFile, err := os.ReadFile(filepath.Join(LLMConfigPath, "claude.yaml"))
	if err != nil {
		return nil, fmt.Errorf("读取Claude配置文件失败: %v", err)
	}

	err = yaml.Unmarshal(yamlFile, &claudeConfig)
	if err != nil {
		return nil, fmt.Errorf("解析Claude配置文件失败: %v", err)
	}

	// 获取指定环境的配置
	envConfig, ok := claudeConfig.Environments[env]
	if !ok {
		return nil, fmt.Errorf("未找到环境 %s 的配置", env)
	}

	// 存储启用的配置
	var enabledCredentials []ClaudeCredential

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
	var selectedCred ClaudeCredential
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

	// APIKey解密
	selectedCred.APIKey, err = decryptFunc(selectedCred.APIKey)
	if err != nil {
		return nil, fmt.Errorf("解密APIKey失败: %v", err)
	}

	// 创建Claude配置
	claudeConf := &claude.Config{
		APIKey:        selectedCred.APIKey,
		Model:         c.Model,
		MaxTokens:     c.MaxTokens,
		Temperature:   c.Temperature,
		TopP:          c.TopP,
		StopSequences: c.Stop,
	}

	// 如果设置了BaseURL
	if selectedCred.BaseURL != "" {
		claudeConf.BaseURL = &selectedCred.BaseURL
	}

	// 确保ClaudeConfig存在
	if c.VendorOptional == nil {
		c.VendorOptional = &VendorOptional{}
	}
	if c.VendorOptional.ClaudeConfig == nil {
		c.VendorOptional.ClaudeConfig = &ClaudeConfig{}
	}

	// 从ClaudeConfig获取TopK参数
	if c.VendorOptional.ClaudeConfig.TopK != nil {
		claudeConf.TopK = c.VendorOptional.ClaudeConfig.TopK
	}

	// 如果设置了代理
	if selectedCred.Proxy != "" {
		// 设置代理URL
		c.ProxyURL = selectedCred.Proxy
		// 创建HTTP客户端
		httpClient := &http.Client{
			Transport: &http.Transport{
				Proxy: func(req *http.Request) (*url.URL, error) {
					return url.Parse(selectedCred.Proxy)
				},
			},
		}

		// 在函数级别设置HTTP客户端
		http.DefaultClient = httpClient
	}

	return claudeConf, nil
}

// ClaudeCreateChatCompletion 使用Claude API服务创建聊天完成
func ClaudeCreateChatCompletion(req ChatRequest) (*openai.ChatCompletionResponse, error) {
	// 创建Claude配置
	conf := &Config{
		Vendor:      "claude",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取Claude配置
	claudeConf, err := conf.getClaudeConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Claude配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := claude.NewChatModel(ctx, claudeConf)
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

	// 生成唯一ID
	uniqueID := fmt.Sprintf("claude-%d", time.Now().UnixNano())

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

// ClaudeCreateChatCompletionToChat 使用Claude API服务创建聊天完成
func ClaudeCreateChatCompletionToChat(req ChatRequest) (*openai.ChatCompletionResponse, error) {
	// 调用Claude聊天API
	completionResp, err := ClaudeCreateChatCompletion(req)
	if err != nil {
		return nil, fmt.Errorf("调用Claude聊天接口失败: %w", err)
	}

	// 构造并返回响应
	return &openai.ChatCompletionResponse{
		ID:      completionResp.ID,
		Object:  completionResp.Object,
		Created: completionResp.Created,
		Model:   completionResp.Model,
		Choices: completionResp.Choices,
		Usage: openai.Usage{
			PromptTokens:     completionResp.Usage.PromptTokens,
			CompletionTokens: completionResp.Usage.CompletionTokens,
			TotalTokens:      completionResp.Usage.TotalTokens,
		},
	}, nil
}

// ClaudeStreamChatCompletion 使用Claude API服务创建流式聊天完成
func ClaudeStreamChatCompletion(req ChatRequest) (*schema.StreamReader[*ChatCompletionStreamResponse], error) {
	// 创建Claude配置
	conf := &Config{
		Vendor:      "claude",
		Model:       req.Model,
		MaxTokens:   req.MaxTokens,
		Temperature: &req.Temperature,
		TopP:        &req.TopP,
		Stop:        req.Stop,
	}

	// 获取Claude配置
	claudeConf, err := conf.getClaudeConfig()
	if err != nil {
		return nil, fmt.Errorf("获取Claude配置失败: %v", err)
	}

	// 创建上下文
	ctx := context.Background()

	// 创建聊天模型
	chatModel, err := claude.NewChatModel(ctx, claudeConf)
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
				fmt.Printf("Claude Stream处理发生异常: %v\n", panicErr)
			}
			streamReader.Close()
			resultWriter.Close()
		}()

		// 生成唯一ID
		uniqueID := fmt.Sprintf("claude-stream-%d", time.Now().UnixNano())
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
				_ = resultWriter.Send(nil, fmt.Errorf("从Claude接收流数据失败: %v", err))
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

// ClaudeStreamChatCompletionToChat 使用Claude API服务创建流式聊天完成
func ClaudeStreamChatCompletionToChat(req ChatRequest, writer io.Writer) error {
	// 调用Claude流式聊天API
	streamReader, err := ClaudeStreamChatCompletion(req)
	if err != nil {
		return fmt.Errorf("调用Claude流式聊天接口失败: %w", err)
	}
	// 注意：由于streamReader没有Close方法，我们不需要defer close

	// 处理流式响应
	for {
		response, err := streamReader.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("接收Claude流式响应失败: %w", err)
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
