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

package llmadapter

import (
	"context"
	"fmt"
	"github.com/sashabaranov/go-openai"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gopkg.in/yaml.v2"
)

// TestAzureCreateChatCompletion 测试Azure OpenAI聊天完成功能
// 执行命令：go test -run TestAzureCreateChatCompletion
func TestAzureCreateChatCompletion(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_AZURE_TESTS") == "1" {
		t.Skip("跳过Azure API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name           string
		request        openai.ChatCompletionRequest
		expectedError  bool
		errorContains  string
		skipOnAPIError bool
	}{
		{
			name: "基本聊天完成测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "system",
						Content: "你是一个有帮助的助手。",
					},
					{
						Role:    "user",
						Content: "你好，请介绍一下自己。",
					},
				},
				MaxTokens:   100,
				Temperature: 0.7,
				TopP:        1.0,
			},
			skipOnAPIError: true,
		},
		{
			name: "使用不同模型的测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-4",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "system",
						Content: "你是一个专业的编程助手。",
					},
					{
						Role:    "user",
						Content: "解释什么是递归函数？",
					},
				},
				MaxTokens:   150,
				Temperature: 0.5,
				TopP:        0.9,
			},
			skipOnAPIError: true,
		},
		{
			name: "0温度测试(确定性输出)",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "计算2+2等于几？请只回答数字。",
					},
				},
				MaxTokens:   10,
				Temperature: 0.0,
				TopP:        1.0,
			},
			skipOnAPIError: true,
		},
		{
			name: "最大温度测试(最大随机性)",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "给我讲一个短故事。",
					},
				},
				MaxTokens:   200,
				Temperature: 2.0,
				TopP:        1.0,
			},
			skipOnAPIError: true,
		},
		{
			name: "最小TopP测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "什么是人工智能？",
					},
				},
				MaxTokens:   150,
				Temperature: 0.7,
				TopP:        0.1, // 非常确定性的输出
			},
			skipOnAPIError: true,
		},
		{
			name: "消息链测试(多轮对话)",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "system",
						Content: "你是一个友好的助手。",
					},
					{
						Role:    "user",
						Content: "你好！",
					},
					{
						Role:    "assistant",
						Content: "你好！有什么我可以帮助你的吗？",
					},
					{
						Role:    "user",
						Content: "今天天气怎么样？",
					},
				},
				MaxTokens:   50,
				Temperature: 0.7,
				TopP:        1.0,
			},
			skipOnAPIError: true,
		},
		{
			name: "停止序列测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "列出1到10的数字。",
					},
				},
				MaxTokens:   100,
				Temperature: 0.7,
				TopP:        1.0,
				Stop:        []string{"5", "，5", ", 5"}, // 在数到5时停止
			},
			skipOnAPIError: true,
		},
		{
			name: "极小令牌测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好",
					},
				},
				MaxTokens:   1, // 只生成一个token
				Temperature: 0.7,
				TopP:        1.0,
			},
			skipOnAPIError: true,
		},
		{
			name: "空消息列表测试",
			request: openai.ChatCompletionRequest{
				Model:       "gpt-3.5-turbo",
				Messages:    []openai.ChatCompletionMessage{},
				MaxTokens:   50,
				Temperature: 0.7,
				TopP:        1.0,
			},
			expectedError: true,
			errorContains: "消息",
		},
		{
			name: "无效模型名称测试",
			request: openai.ChatCompletionRequest{
				Model: "invalid-model-name",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好",
					},
				},
				MaxTokens:   50,
				Temperature: 0.7,
				TopP:        1.0,
			},
			expectedError: true,
			errorContains: "model",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 调用被测试的函数
			resp, err := AzureCreateChatCompletion(tc.request)

			// 检查错误情况
			if tc.expectedError {
				assert.Error(t, err, "应该返回错误")
				if tc.errorContains != "" {
					assert.Contains(t, err.Error(), tc.errorContains, "错误信息应包含预期内容")
				}
				return
			}

			// 如果有API错误但测试标记为跳过API错误，则跳过测试
			if err != nil && tc.skipOnAPIError {
				t.Logf("测试期间出现错误: %v", err)
				t.Skip("API调用失败，可能是配置问题")
				return
			}

			// 验证正常情况下的响应
			assert.NoError(t, err, "不应返回错误")
			assert.NotNil(t, resp, "响应不应为空")
			assert.NotEmpty(t, resp.ID, "响应ID不应为空")
			assert.Equal(t, "chat.completion", resp.Object, "响应对象类型应为chat.completion")
			assert.NotZero(t, resp.Created, "创建时间不应为零")
			assert.Equal(t, tc.request.Model, resp.Model, "响应模型应与请求模型匹配")
			assert.NotEmpty(t, resp.Choices, "选择不应为空")

			// 验证Usage字段
			assert.NotZero(t, resp.Usage.PromptTokens, "提示令牌数不应为零")
			assert.NotZero(t, resp.Usage.CompletionTokens, "完成令牌数不应为零")
			assert.Equal(t, resp.Usage.PromptTokens+resp.Usage.CompletionTokens, resp.Usage.TotalTokens, "总令牌数应等于提示令牌数加完成令牌数")

			// 验证Choices字段的具体内容
			if len(resp.Choices) > 0 {
				assert.NotEmpty(t, resp.Choices[0].Message.Content, "消息内容不应为空")
				assert.NotEmpty(t, resp.Choices[0].FinishReason, "完成原因不应为空")
				assert.Equal(t, "assistant", resp.Choices[0].Message.Role, "消息角色应为assistant")
				t.Logf("响应内容: %s", resp.Choices[0].Message.Content)
				t.Logf("完成原因: %s", resp.Choices[0].FinishReason)
			}
		})
	}
}

// TestAzureStreamChatCompletion 测试Azure OpenAI流式聊天完成功能
func TestAzureStreamChatCompletion(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_AZURE_TESTS") == "1" {
		t.Skip("跳过Azure API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name    string
		request openai.ChatCompletionRequest
	}{
		{
			name: "基本流式聊天完成测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "system",
						Content: "你是一个有帮助的助手。",
					},
					{
						Role:    "user",
						Content: "你好，请用5个字简短地介绍一下自己。",
					},
				},
				MaxTokens:   20,
				Temperature: 0.7,
				TopP:        1.0,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 调用被测试的函数
			streamReader, err := AzureStreamChatCompletion(tc.request)

			// 检查结果
			if err != nil {
				t.Logf("测试期间出现错误: %v", err)
				t.Skip("API调用失败，可能是配置问题")
				return
			}

			// 设置超时上下文
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			// 验证流式响应
			assert.NotNil(t, streamReader, "流读取器不应为空")

			// 收集所有流式响应
			var allContent string
			var lastID string
			var responseCount int

			for {
				select {
				case <-ctx.Done():
					t.Fatalf("接收流响应超时")
					return
				default:
					// 从流中接收响应
					resp, err := streamReader.Recv()
					if err != nil {
						// 流结束是正常的
						t.Logf("流结束: %v", err)
						break
					}

					// 累计响应数
					responseCount++

					// 验证响应
					assert.NotNil(t, resp, "流响应不应为空")
					assert.NotEmpty(t, resp.ID, "响应ID不应为空")
					assert.Equal(t, "chat.completion.chunk", resp.Object, "响应对象类型应为chat.completion.chunk")
					assert.NotZero(t, resp.Created, "创建时间不应为零")
					assert.Equal(t, tc.request.Model, resp.Model, "响应模型应与请求模型匹配")
					assert.NotEmpty(t, resp.Choices, "选择不应为空")

					// 保存ID以便验证所有响应的ID一致
					if lastID == "" {
						lastID = resp.ID
					} else {
						assert.Equal(t, lastID, resp.ID, "所有响应的ID应相同")
					}

					// 累积内容
					if len(resp.Choices) > 0 {
						allContent += resp.Choices[0].Delta.Content
					}

					// 检查是否是最后一个响应
					if len(resp.Choices) > 0 && resp.Choices[0].FinishReason != "" {
						t.Logf("流响应完成，原因: %s", resp.Choices[0].FinishReason)
						goto StreamEnd // 跳出嵌套循环
					}
				}
			}

		StreamEnd:
			// 验证收到的完整内容
			t.Logf("收到%d个流式响应", responseCount)
			t.Logf("完整响应内容: %s", allContent)
			assert.NotEmpty(t, allContent, "应收到非空内容")
		})
	}
}

// 添加单独测试配置文件相关错误情况的测试
func TestAzureConfigurationErrors(t *testing.T) {
	// 创建临时测试目录
	tmpDir, err := os.MkdirTemp("", "azure_test")
	if err != nil {
		t.Fatalf("无法创建临时目录: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// 保存当前工作目录
	currentDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("无法获取当前工作目录: %v", err)
	}
	defer func() {
		// 恢复工作目录
		if err := os.Chdir(currentDir); err != nil {
			t.Logf("无法恢复工作目录: %v", err)
		}
	}()

	// 测试异常情况1: 未找到配置文件
	t.Run("配置文件不存在", func(t *testing.T) {
		// 创建测试目录结构
		configDir := filepath.Join(tmpDir, "config1", "llm")
		if err := os.MkdirAll(configDir, 0755); err != nil {
			t.Fatalf("无法创建配置目录: %v", err)
		}

		// 更改工作目录
		if err := os.Chdir(filepath.Join(tmpDir, "config1")); err != nil {
			t.Fatalf("无法更改工作目录: %v", err)
		}

		// 测试请求
		req := openai.ChatCompletionRequest{
			Model: "gpt-3.5-turbo",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "user",
					Content: "你好",
				},
			},
			MaxTokens:   50,
			Temperature: 0.7,
			TopP:        1.0,
		}

		// 调用被测试的函数
		_, err := AzureCreateChatCompletion(req)

		// 验证
		assert.Error(t, err, "应该返回错误")
		assert.Contains(t, err.Error(), "配置文件", "错误信息应包含配置文件相关内容")
	})

	// 创建临时测试环境2: 无效的YAML配置
	t.Run("无效的YAML配置", func(t *testing.T) {
		// 创建测试目录结构
		configDir := filepath.Join(tmpDir, "config2", "llm")
		if err := os.MkdirAll(configDir, 0755); err != nil {
			t.Fatalf("无法创建配置目录: %v", err)
		}

		// 创建无效的配置文件
		configContent := `
environments:
  development: 
    credentials:
      - this is invalid yaml
        name: test
`
		if err := os.WriteFile(filepath.Join(configDir, "azure.yaml"), []byte(configContent), 0644); err != nil {
			t.Fatalf("无法创建测试配置文件: %v", err)
		}

		// 更改工作目录
		if err := os.Chdir(filepath.Join(tmpDir, "config2")); err != nil {
			t.Fatalf("无法更改工作目录: %v", err)
		}

		// 测试请求
		req := openai.ChatCompletionRequest{
			Model: "gpt-3.5-turbo",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "user",
					Content: "你好",
				},
			},
			MaxTokens:   50,
			Temperature: 0.7,
			TopP:        1.0,
		}

		// 调用被测试的函数
		_, err := AzureCreateChatCompletion(req)

		// 验证
		assert.Error(t, err, "应该返回错误")
		assert.Contains(t, err.Error(), "解析", "错误信息应包含解析相关内容")
	})

	// 创建临时测试环境3: 无效的环境配置
	t.Run("无效的环境配置", func(t *testing.T) {
		// 创建测试目录结构
		configDir := filepath.Join(tmpDir, "config3", "llm")
		if err := os.MkdirAll(configDir, 0755); err != nil {
			t.Fatalf("无法创建配置目录: %v", err)
		}

		// 创建有效配置但无匹配环境
		configContent := `
environments:
  production:
    credentials:
      - name: test
        api_key: test-key
        endpoint: https://test.com
        deployment_id: test-deployment
        api_version: 2023-05-15
        enabled: true
        weight: 1
        models:
          - gpt-3.5-turbo
`
		if err := os.WriteFile(filepath.Join(configDir, "azure.yaml"), []byte(configContent), 0644); err != nil {
			t.Fatalf("无法创建测试配置文件: %v", err)
		}

		// 更改工作目录
		if err := os.Chdir(filepath.Join(tmpDir, "config3")); err != nil {
			t.Fatalf("无法更改工作目录: %v", err)
		}

		// 设置环境变量为不存在的环境
		os.Setenv("ENV", "development")
		defer os.Unsetenv("ENV")

		// 测试请求
		req := openai.ChatCompletionRequest{
			Model: "gpt-3.5-turbo",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "user",
					Content: "你好",
				},
			},
			MaxTokens:   50,
			Temperature: 0.7,
			TopP:        1.0,
		}

		// 调用被测试的函数
		_, err := AzureCreateChatCompletion(req)

		// 验证
		assert.Error(t, err, "应该返回错误")
		assert.Contains(t, err.Error(), "未找到环境", "错误信息应包含环境相关内容")
	})

	// 创建临时测试环境4: 无启用的凭据
	t.Run("无启用的凭据", func(t *testing.T) {
		// 创建测试目录结构
		configDir := filepath.Join(tmpDir, "config4", "llm")
		if err := os.MkdirAll(configDir, 0755); err != nil {
			t.Fatalf("无法创建配置目录: %v", err)
		}

		// 创建有效配置但所有凭据都未启用
		configContent := `
environments:
  development:
    credentials:
      - name: test
        api_key: test-key
        endpoint: https://test.com
        deployment_id: test-deployment
        api_version: 2023-05-15
        enabled: false
        weight: 1
        models:
          - gpt-3.5-turbo
`
		if err := os.WriteFile(filepath.Join(configDir, "azure.yaml"), []byte(configContent), 0644); err != nil {
			t.Fatalf("无法创建测试配置文件: %v", err)
		}

		// 更改工作目录
		if err := os.Chdir(filepath.Join(tmpDir, "config4")); err != nil {
			t.Fatalf("无法更改工作目录: %v", err)
		}

		// 测试请求
		req := openai.ChatCompletionRequest{
			Model: "gpt-3.5-turbo",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "user",
					Content: "你好",
				},
			},
			MaxTokens:   50,
			Temperature: 0.7,
			TopP:        1.0,
		}

		// 调用被测试的函数
		_, err := AzureCreateChatCompletion(req)

		// 验证
		assert.Error(t, err, "应该返回错误")
		assert.Contains(t, err.Error(), "没有启用的配置", "错误信息应包含启用配置相关内容")
	})
}

// 测试更多边界情况
func TestAzureCreateChatCompletionEdgeCases(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_AZURE_TESTS") == "1" {
		t.Skip("跳过Azure API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name           string
		request        openai.ChatCompletionRequest
		expectedError  bool
		errorContains  string
		skipOnAPIError bool
	}{
		{
			name: "空模型名称测试",
			request: openai.ChatCompletionRequest{
				Model: "",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好",
					},
				},
				MaxTokens:   50,
				Temperature: 0.7,
				TopP:        1.0,
			},
			expectedError: true,
			errorContains: "model",
		},
		{
			name: "极大温度测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好",
					},
				},
				MaxTokens:   50,
				Temperature: 10.0, // 远超正常范围
				TopP:        1.0,
			},
			skipOnAPIError: true, // API可能接受这个值但会自动限制
		},
		{
			name: "极小TopP测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好",
					},
				},
				MaxTokens:   50,
				Temperature: 0.7,
				TopP:        0.0000001, // 近似为0
			},
			skipOnAPIError: true,
		},
		{
			name: "负数MaxTokens测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好",
					},
				},
				MaxTokens:   -10, // 负数标记
				Temperature: 0.7,
				TopP:        1.0,
			},
			expectedError: true,
			errorContains: "token",
		},
		{
			name: "非常长的文本测试",
			request: openai.ChatCompletionRequest{
				Model: "gpt-3.5-turbo",
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: strings.Repeat("这是一个非常长的文本测试。", 100), // 重复100次的长文本
					},
				},
				MaxTokens:   50,
				Temperature: 0.7,
				TopP:        1.0,
			},
			skipOnAPIError: true,
		},
		{
			name: "超多消息测试",
			request: openai.ChatCompletionRequest{
				Model:       "gpt-3.5-turbo",
				Messages:    generateLongMessageChain(50), // 生成50条消息的链
				MaxTokens:   50,
				Temperature: 0.7,
				TopP:        1.0,
			},
			skipOnAPIError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 调用被测试的函数
			resp, err := AzureCreateChatCompletion(tc.request)

			// 检查错误情况
			if tc.expectedError {
				assert.Error(t, err, "应该返回错误")
				if tc.errorContains != "" {
					assert.Contains(t, err.Error(), tc.errorContains, "错误信息应包含预期内容")
				}
				return
			}

			// 如果有API错误但测试标记为跳过API错误，则跳过测试
			if err != nil && tc.skipOnAPIError {
				t.Logf("测试期间出现错误: %v", err)
				t.Skip("API调用失败，可能是配置问题")
				return
			}

			// 验证正常情况下的响应
			assert.NoError(t, err, "不应返回错误")
			assert.NotNil(t, resp, "响应不应为空")
			assert.NotEmpty(t, resp.ID, "响应ID不应为空")
			assert.Equal(t, "chat.completion", resp.Object, "响应对象类型应为chat.completion")
			assert.NotZero(t, resp.Created, "创建时间不应为零")
			assert.Equal(t, tc.request.Model, resp.Model, "响应模型应与请求模型匹配")
			assert.NotEmpty(t, resp.Choices, "选择不应为空")

			if len(resp.Choices) > 0 {
				assert.NotEmpty(t, resp.Choices[0].Message.Content, "消息内容不应为空")
				t.Logf("响应内容: %s", resp.Choices[0].Message.Content)
			}
		})
	}
}

// 生成长消息链的辅助函数
func generateLongMessageChain(count int) []openai.ChatCompletionMessage {
	messages := make([]openai.ChatCompletionMessage, 0, count)

	// 添加系统消息
	messages = append(messages, openai.ChatCompletionMessage{
		Role:    "system",
		Content: "你是一个有帮助的助手。",
	})

	// 添加交替的用户和助手消息
	for i := 0; i < count-1; i++ {
		if i%2 == 0 {
			messages = append(messages, openai.ChatCompletionMessage{
				Role:    "user",
				Content: fmt.Sprintf("这是用户的第%d条消息", i/2+1),
			})
		} else {
			messages = append(messages, openai.ChatCompletionMessage{
				Role:    "assistant",
				Content: fmt.Sprintf("这是助手的第%d条回复", i/2+1),
			})
		}
	}

	return messages
}

// 添加单独测试Azure配置加载功能的测试
func TestAzureConfig(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_AZURE_TESTS") == "1" {
		t.Skip("跳过Azure API测试")
	}

	// 测试基本配置创建和参数设置
	t.Run("配置参数设置", func(t *testing.T) {
		// 创建配置
		conf := &Config{
			Vendor:      "azure",
			Model:       "gpt-3.5-turbo",
			MaxTokens:   100,
			Temperature: new(float32),
			TopP:        new(float32),
			Stop:        []string{"停止词"},
		}
		*conf.Temperature = 0.7
		*conf.TopP = 1.0

		// 验证基本配置
		assert.Equal(t, "azure", conf.Vendor, "供应商应为azure")
		assert.Equal(t, "gpt-3.5-turbo", conf.Model, "模型应为gpt-3.5-turbo")
		assert.Equal(t, 100, conf.MaxTokens, "最大标记数应为100")
		assert.Equal(t, float32(0.7), *conf.Temperature, "温度应为0.7")
		assert.Equal(t, float32(1.0), *conf.TopP, "TopP应为1.0")
		assert.Equal(t, []string{"停止词"}, conf.Stop, "停止词应正确设置")

		// 测试VendorOptional为nil的情况
		if conf.VendorOptional == nil {
			// 正常情况，预期为nil
			assert.Nil(t, conf.VendorOptional, "初始VendorOptional应为nil")
		}

		// 创建VendorOptional
		conf.VendorOptional = &VendorOptional{
			AzureConfig: &AzureConfig{},
		}

		// 验证VendorOptional
		assert.NotNil(t, conf.VendorOptional, "设置后VendorOptional不应为nil")
		assert.NotNil(t, conf.VendorOptional.AzureConfig, "AzureConfig不应为nil")
	})

	// 直接测试Azure配置文件是否可读取（如果存在）
	t.Run("尝试读取现有配置文件", func(t *testing.T) {
		// 检查配置文件是否存在
		_, err := os.Stat(filepath.Join(LLMConfigPath, "azure.yaml"))
		if os.IsNotExist(err) {
			t.Skip("Azure配置文件不存在，跳过此测试")
			return
		}

		// 读取配置文件内容
		yamlFile, err := os.ReadFile(filepath.Join(LLMConfigPath, "azure.yaml"))
		if err != nil {
			t.Skip("无法读取Azure配置文件，跳过此测试")
			return
		}

		// 解析配置
		var config struct {
			Environments map[string]struct {
				Credentials []AzureCredential `yaml:"credentials"`
			} `yaml:"environments"`
		}

		err = yaml.Unmarshal(yamlFile, &config)
		if err != nil {
			t.Errorf("解析Azure配置文件失败: %v", err)
			return
		}

		// 验证配置结构
		assert.NotNil(t, config.Environments, "环境配置不应为nil")

		// 获取环境变量,默认为development
		env := os.Getenv("ENV")
		if env == "" {
			env = "development"
		}

		// 如果存在测试环境，验证其结构
		if envConfig, ok := config.Environments[env]; ok {
			t.Logf("找到环境 %s 的配置", env)
			// 检查凭证列表
			if len(envConfig.Credentials) > 0 {
				t.Logf("环境 %s 共有 %d 个凭证配置", env, len(envConfig.Credentials))

				// 检查第一个凭证的基本字段
				cred := envConfig.Credentials[0]
				assert.NotEmpty(t, cred.Name, "凭证名称不应为空")
				if cred.Enabled {
					t.Logf("凭证 %s 已启用", cred.Name)
				} else {
					t.Logf("凭证 %s 未启用", cred.Name)
				}
			} else {
				t.Logf("环境 %s 没有凭证配置", env)
			}
		} else {
			t.Logf("未找到环境 %s 的配置", env)
		}
	})
}
