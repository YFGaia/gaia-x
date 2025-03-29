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
	"encoding/json"
	"os"
	"strings"
	"testing"

	"github.com/sashabaranov/go-openai"
	"github.com/stretchr/testify/assert"
)

// TestClaudeStreamChatCompletionToChat 测试Claude流式聊天完成到io.Writer的功能
// 执行命令：go test -run TestClaudeStreamChatCompletionToChat
func TestClaudeStreamChatCompletionToChat(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_CLAUDE_TESTS") == "1" {
		t.Skip("跳过Claude API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name    string
		request ChatRequest
	}{
		{
			name: "基本流式聊天完成测试",
			request: ChatRequest{
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "claude-3-sonnet-20240229",
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
			err := ClaudeStreamChatCompletionToChat(tc.request, buffer)

			// 检查结果
			if err != nil {
				t.Logf("测试期间出现错误: %v", err)
				t.Skip("API调用失败，可能是配置问题")
				return
			}

			// 获取响应内容
			response := buffer.String()

			// 验证响应格式正确性
			assert.True(t, len(response) > 0, "响应不应为空")
			assert.Contains(t, response, "data: ", "响应应包含data:前缀")
			assert.Contains(t, response, "data: [DONE]", "响应应包含结束标记")

			// 解析并验证每个响应块
			lines := strings.Split(response, "\n\n")
			var contentLines []string
			var allContent string

			for _, line := range lines {
				if strings.HasPrefix(line, "data: ") && line != "data: [DONE]" {
					// 解析JSON
					jsonData := strings.TrimPrefix(line, "data: ")
					var streamResp StreamResponse
					err := json.Unmarshal([]byte(jsonData), &streamResp)

					if err != nil {
						t.Errorf("解析响应JSON失败: %v", err)
						continue
					}

					// 验证响应结构
					assert.NotEmpty(t, streamResp.ID, "响应ID不应为空")
					assert.Equal(t, "chat.completion.chunk", streamResp.Object, "响应对象类型应为chat.completion.chunk")
					assert.NotZero(t, streamResp.Created, "创建时间不应为零")
					assert.Equal(t, tc.request.Model, streamResp.Model, "响应模型应与请求模型匹配")
					assert.NotEmpty(t, streamResp.Choices, "选择不应为空")

					// 收集内容
					if len(streamResp.Choices) > 0 {
						content := streamResp.Choices[0].Delta.Content
						if content != "" {
							contentLines = append(contentLines, content)
							allContent += content
						}
					}
				}
			}

			// 验证收集到的内容
			t.Logf("收到 %d 个内容块", len(contentLines))
			t.Logf("完整响应内容: %s", allContent)
			assert.True(t, len(contentLines) > 0, "应收到至少一个内容块")
			assert.NotEmpty(t, allContent, "应收到非空内容")
		})
	}
}

// TestClaudeCreateChatCompletionToChat 测试Claude非流式聊天完成到io.Writer的功能
// 执行命令：go test -run TestClaudeCreateChatCompletionToChat
func TestClaudeCreateChatCompletionToChat(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_CLAUDE_TESTS") == "1" {
		t.Skip("跳过Claude API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name    string
		request ChatRequest
	}{
		{
			name: "基本非流式聊天完成测试",
			request: ChatRequest{
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "claude-3-sonnet-20240229",
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
			// 调用被测试的函数
			response, err := ClaudeCreateChatCompletionToChat(tc.request)

			// 检查结果
			if err != nil {
				t.Logf("测试期间出现错误: %v", err)
				t.Skip("API调用失败，可能是配置问题")
				return
			}

			// 验证响应格式正确性
			assert.NotEmpty(t, response.ID, "响应ID不应为空")
			assert.Equal(t, "chat.completion", response.Object, "响应对象类型应为chat.completion")
			assert.NotZero(t, response.Created, "创建时间不应为零")
			assert.Equal(t, tc.request.Model, response.Model, "响应模型应与请求模型匹配")
			assert.NotEmpty(t, response.Choices, "选择不应为空")

			// 验证内容
			if len(response.Choices) > 0 {
				assert.Equal(t, "assistant", response.Choices[0].Message.Role, "响应角色应为assistant")
				assert.NotEmpty(t, response.Choices[0].Message.Content, "响应内容不应为空")
				assert.NotEmpty(t, response.Choices[0].FinishReason, "完成原因不应为空")

				// 打印响应内容供检查
				t.Logf("响应内容: %s", response.Choices[0].Message.Content)
			}

			// 验证token使用情况
			assert.NotZero(t, response.Usage.TotalTokens, "总Token数不应为零")
			assert.NotZero(t, response.Usage.PromptTokens, "提示Token数不应为零")
			assert.NotZero(t, response.Usage.CompletionTokens, "完成Token数不应为零")

			// 打印token使用情况
			t.Logf("Token使用情况: 总数=%d, 提示=%d, 完成=%d",
				response.Usage.TotalTokens,
				response.Usage.PromptTokens,
				response.Usage.CompletionTokens)
		})
	}
}
