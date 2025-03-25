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

// Package einox provides a unified adapter interface for Large Language Models (LLMs)
// 软件包einox提供了大型语言模型（LLMS）的统一适配器接口
package einox

import (
	"errors"
	"io"
	"os"

	"github.com/sashabaranov/go-openai"
)

// 配置文件路径常量
var (
	// LLMConfigPath 是LLM配置文件的根路径
	LLMConfigPath string
)

// 环境变量定义
var (
	ENV string
)

// LoadLLMConfigPathFromEnv 从环境变量中读取LLM配置路径
// 如果环境变量未设置，则返回错误
func LoadLLMConfigPathFromEnv() error {
	// 尝试从环境变量LLM_CONFIG_PATH读取配置路径
	configPath := os.Getenv("LLM_CONFIG_PATH")
	if configPath == "" {
		return errors.New("环境变量LLM_CONFIG_PATH未设置，无法初始化LLM配置目录")
	}

	// 确保配置目录存在
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// 如果目录不存在，创建它
		err = os.MkdirAll(configPath, 0755)
		if err != nil {
			return errors.New("无法创建LLM配置目录: " + err.Error())
		}
	}

	// 设置全局变量
	LLMConfigPath = configPath
	return nil
}

// 初始化配置路径
func init() {
	// 从GIN_MODE读取环境变量
	// 注意：此处不使用gin.Mode()是因为einox是独立模块，
	// 不希望引入对gin框架的直接依赖，以保持模块的通用性
	ENV = os.Getenv("GIN_MODE")
	//GIN_MODE 可能有的值: debug, release, test
	//通过GIN_MODE的值转换为: development, production, test
	if ENV == "debug" {
		ENV = "development"
	} else if ENV == "release" {
		ENV = "production"
	} else if ENV == "test" {
		ENV = "test"
	} else if ENV == "" {
		//如果GIN_MODE为空，则设置为development
		ENV = "development"
		//进行强制报错
		//panic("无法获取GIN_MODE环境变量，无法正确初始化LLM配置目录")
	}
}

// SetENV 允许用户手动设置环境变量
// 这对于集成到使用其他框架的项目中很有用
// 例如，可以在初始化时调用：einox.SetENV(gin.Mode())
func SetENV(env string) {
	if env != "" {
		ENV = env
	}
}

// Config 定义了LLM适配器的基础配置结构
type Config struct {
	// Vendor 指定LLM服务提供商
	// 可选值: "openai", "anthropic", "bedrock", "azure" 等
	Vendor string `yaml:"vendor" json:"vendor" binding:"required"` // 必填,指定LLM服务提供商

	// Model specifies the ID of the model to use
	// Required
	Model string `yaml:"model" json:"model" binding:"required"` // 模型名称,必填

	// MaxTokens specifies the maximum number of tokens to generate
	// Optional. Default: 16384
	MaxTokens int `yaml:"max_tokens" json:"max_tokens"` // 最大生成token数

	// Temperature is the sampling temperature to use
	// Optional. Default: 1
	Temperature *float32 `yaml:"temperature" json:"temperature"` // 温度参数(0-1)

	// TopP is the cumulative probability mass of tokens to keep in the sample
	// Optional. Default: 1
	TopP *float32 `yaml:"top_p" json:"top_p"` // 核采样参数(0-1)

	// Stop sequences where the API will stop generating further tokens
	// Optional. Example: []string{"\n", "User:"}
	Stop []string `json:"stop,omitempty"`

	//代理URl
	ProxyURL string `yaml:"proxy_url" json:"proxy_url"`

	// 厂商可选配置参数
	VendorOptional *VendorOptional `yaml:"vendor_optional,omitempty" json:"vendor_optional,omitempty"`
}

// CreateChatCompletion 创建聊天完成
// 统一的聊天接口，根据req.Stream参数决定是否使用流式响应
// 如果writer为nil，则返回普通响应；如果writer不为nil，则写入流式响应
//
// 参数:
//   - req: ChatRequest类型，包含完成请求的所有参数，如模型、消息历史、温度等
//   - req.Provider 指定使用的LLM供应商，例如 "bedrock"、"azure" 等
//   - req.Stream 指定是否使用流式响应
//   - writer: io.Writer类型，用于接收流式响应的输出
//     当req.Stream=true且writer不为nil时使用流式响应
//
// 返回值:
//   - *ChatResponse: 非流式响应的返回结果，包含AI生成的完整回复
//   - error: 操作过程中遇到的任何错误
//
// 错误:
//   - 当提供的供应商不受支持时返回错误
//   - 当供应商的特定操作失败时返回相应错误
//
// 注意事项:
//   - 流式响应模式下 *ChatResponse 将返回 nil
//   - 当前支持 "bedrock" 供应商的流式响应，其他供应商正在开发中
//   - 如未指定供应商，默认使用 "bedrock"
func CreateChatCompletion(req ChatRequest, writer io.Writer) (*openai.ChatCompletionResponse, error) {
	// 获取供应商
	provider := req.Provider
	if provider == "" {
		// 如果没有提供供应商，可以从配置中获取默认供应商
		// TODO: 从配置中获取默认供应商
		provider = "bedrock" // 暂时默认使用bedrock
	}

	// 如果是流式响应且writer不为nil
	if req.Stream && writer != nil {
		var err error
		switch provider {
		case "bedrock":
			err = BedrockStreamChatCompletionToChat(req, writer)
		case "azure":
			err = AzureStreamChatCompletionToChat(req, writer)
		case "deepseek":
			err = DeepSeekStreamChatCompletionToChat(req, writer)
		case "openai":
			//TODO 未实际测试通过 缺少KEY
			err = OpenAIStreamChatCompletionToChat(req, writer)
		case "claude":
			//TODO 未实际测试通过 缺少KEY
			err = ClaudeStreamChatCompletionToChat(req, writer)
			// TODO: 在此处添加其他供应商的流式调用实现
		default:
			err = errors.New("不支持的AI供应商: " + provider)
		}
		return nil, err
	}

	// 非流式响应
	switch provider {
	case "bedrock":
		return BedrockCreateChatCompletionToChat(req)
	case "azure":
		return AzureCreateChatCompletionToChat(req)
	case "deepseek":
		return DeepSeekCreateChatCompletionToChat(req)
	case "openai":
		//TODO 未实际测试通过 缺少KEY
		return OpenAICreateChatCompletionToChat(req)
	case "claude":
		//TODO 未实际测试通过 缺少KEY
		return ClaudeCreateChatCompletionToChat(req)
		// TODO: 在此处添加其他供应商的非流式调用实现
	default:
		return nil, errors.New("不支持的AI供应商: " + provider)
	}
}
