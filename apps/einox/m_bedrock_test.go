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
	"bytes"
	"context"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/sashabaranov/go-openai"
	"github.com/stretchr/testify/assert"
)

// TestBedrockCreateChatCompletion 测试Bedrock聊天完成功能
// 执行命令：go test -run TestBedrockCreateChatCompletion
func TestBedrockCreateChatCompletion(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_BEDROCK_TESTS") == "1" {
		t.Skip("跳过Bedrock API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name    string
		request ChatRequest
	}{
		{
			name: "基本聊天完成测试",
			request: ChatRequest{
				Provider: "bedrock",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个有帮助的助手。",
						},
						{
							Role:    "user",
							Content: "你好，请用中文简单地介绍一下自己。",
						},
					},
					MaxTokens:   100,
					Temperature: 0.7,
					TopP:        1.0,
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 调用被测试的函数
			resp, err := BedrockCreateChatCompletionToChat(tc.request)

			// 检查结果
			if err != nil {
				t.Logf("测试期间出现错误: %v", err)
				t.Skip("API调用失败，可能是配置问题")
				return
			}

			// 验证响应
			assert.NotNil(t, resp, "响应不应为空")
			assert.NotEmpty(t, resp.ID, "响应ID不应为空")
			assert.Equal(t, "chat.completion", resp.Object, "响应对象类型应为chat.completion")
			assert.NotZero(t, resp.Created, "创建时间不应为零")
			assert.Equal(t, tc.request.Model, resp.Model, "响应模型应与请求模型匹配")
			assert.NotEmpty(t, resp.Choices, "选择不应为空")

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

// TestBedrockStreamChatCompletion 测试Bedrock流式聊天完成功能
func TestBedrockStreamChatCompletion(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_BEDROCK_TESTS") == "1" {
		t.Skip("跳过Bedrock API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name    string
		request ChatRequest
	}{
		{
			name: "基本流式聊天完成测试",
			request: ChatRequest{
				Provider: "bedrock",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个有帮助的助手。",
						},
						{
							Role:    "user",
							Content: "什么是语言?",
						},
					},
					MaxTokens:   20,
					Temperature: 0.7,
					TopP:        1.0,
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 调用被测试的函数
			streamReader, err := BedrockStreamChatCompletion(tc.request)

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

			// 简化的循环结构，更清晰地处理流接收
			for {
				select {
				case <-ctx.Done():
					t.Fatalf("接收流响应超时")
					return
				default:
					// 从流中接收响应
					resp, err := streamReader.Recv()
					if err == io.EOF {
						// 正常流结束
						t.Logf("流正常结束")
						goto StreamEnd
					}
					if err != nil {
						t.Logf("接收流时出错: %v", err)
						goto StreamEnd
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

// TestBedrockStreamChatCompletionToChat 测试Bedrock流式聊天完成到io.Writer的功能
// 执行命令：go test -run TestBedrockStreamChatCompletionToChat
func TestBedrockStreamChatCompletionToChat(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_BEDROCK_TESTS") == "1" {
		t.Skip("跳过Bedrock API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name    string
		request ChatRequest
	}{
		{
			name: "基本流式聊天完成测试",
			request: ChatRequest{
				Provider: "bedrock",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20240620-v1:0", // 根据实际可用的Bedrock模型调整
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个有帮助的助手。",
						},
						{
							Role:    "user",
							Content: "简单介绍一下自然语言处理。",
						},
					},
					MaxTokens:   100,
					Temperature: 0.7,
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 创建缓冲区用于接收流式响应
			buffer := new(bytes.Buffer)

			// 调用被测试的函数
			err := BedrockStreamChatCompletionToChat(tc.request, buffer)

			// 检查结果
			if err != nil {
				t.Logf("测试期间出现错误: %v", err)
				t.Skip("API调用失败，可能是配置问题")
				return
			}

			// 获取响应内容
			response := buffer.String()

			// 验证响应不为空
			assert.True(t, len(response) > 0, "响应不应为空")
			t.Logf("响应内容: %s", response)
		})
	}
}

// 测试配置文件相关错误情况
func TestBedrockConfigurationErrors(t *testing.T) {
	// 测试异常情况：未找到配置文件
	t.Run("配置文件不存在时的错误处理", func(t *testing.T) {
		// 原文件路径和临时文件路径
		configPath := filepath.Join(LLMConfigPath, "bedrock.yaml")
		tempPath := filepath.Join(LLMConfigPath, "bedrock.yaml.temp")

		// 检查配置文件是否存在
		if _, err := os.Stat(configPath); err == nil {
			// 重命名配置文件
			err := os.Rename(configPath, tempPath)
			if err != nil {
				t.Fatalf("无法重命名配置文件: %v", err)
			}
			defer os.Rename(tempPath, configPath) // 测试完成后恢复

			// 创建请求
			req := ChatCompletionRequest{
				Model: "anthropic.claude-3-opus-20240229",
				Messages: []ChatMessage{
					{
						Role:    "user",
						Content: "你好",
					},
				},
				MaxTokens:   50,
				Temperature: 0.7,
				TopP:        1.0,
			}

			// 调用函数
			_, err = BedrockCreateChatCompletion(req)

			// 验证错误
			assert.Error(t, err, "应该返回错误")
			assert.Contains(t, err.Error(), "配置文件", "错误信息应包含配置文件相关内容")
		} else {
			t.Skip("配置文件不存在，跳过此测试")
		}
	})
}
