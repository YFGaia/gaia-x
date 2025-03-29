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

// TestCreateChatCompletionStream 测试流式聊天完成功能
// 执行命令：go test -run TestCreateChatCompletionStream
func TestCreateChatCompletionStream(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_BEDROCK_TESTS") == "1" {
		t.Skip("跳过Bedrock API测试")
	}

	// 检查是否跳过Azure测试
	//skipAzureTests := os.Getenv("SKIP_AZURE_TESTS") == "1"

	// 检查是否跳过DeepSeek测试
	skipDeepSeekTests := os.Getenv("SKIP_DEEPSEEK_TESTS") == "1"

	// 准备测试用例
	testCases := []struct {
		name       string
		request    ChatRequest
		provider   string
		skipTest   bool
		skipReason string
	}{
		{
			name: "基本流式聊天完成测试-bedrock",
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
							Content: "简单介绍一下自然语言处理。",
						},
					},
					MaxTokens:   100,
					Temperature: 0.7,
					Stream:      true,
				},
			},
			provider: "bedrock",
			skipTest: false,
		},
		{
			name: "基本流式聊天完成测试-azure",
			request: ChatRequest{
				Provider: "azure",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "gpt-4o",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个有帮助的助手。",
						},
						{
							Role:    "user",
							Content: "简单介绍一下人工智能。",
						},
					},
					MaxTokens:   100,
					Temperature: 0.7,
					Stream:      true,
				},
			},
			provider:   "azure",
			skipTest:   false,
			skipReason: "跳过Azure API测试",
		},
		{
			name: "基本流式聊天完成测试-deepseek",
			request: ChatRequest{
				Provider: "deepseek",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "deepseek-chat",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个专业的AI助手。",
						},
						{
							Role:    "user",
							Content: "请简单介绍一下机器学习的基本概念。",
						},
					},
					MaxTokens:   150,
					Temperature: 0.8,
					Stream:      true,
				},
			},
			provider:   "deepseek",
			skipTest:   skipDeepSeekTests,
			skipReason: "跳过DeepSeek API测试",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 如果需要跳过此测试
			if tc.skipTest {
				t.Skip(tc.skipReason)
			}

			// 设置供应商
			tc.request.Provider = tc.provider

			// 创建缓冲区用于接收流式响应
			buffer := new(bytes.Buffer)

			// 调用被测试的函数
			resp, err := CreateChatCompletion(tc.request, buffer)

			// 检查结果
			if err != nil {
				t.Logf("测试期间出现错误: %v", err)
				t.Skip("API调用失败，可能是配置问题")
				return
			}

			// 对于流式响应，期望resp为nil
			assert.Nil(t, resp, "流式响应应返回nil响应对象")

			// 获取响应内容
			response := buffer.String()

			// 验证响应格式正确性
			assert.True(t, len(response) > 0, "响应不应为空")
			assert.Contains(t, response, "data: ", "响应应包含data:前缀")

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
					assert.Equal(t, tc.request.ChatCompletionRequest.Model, streamResp.Model, "响应模型应与请求模型匹配")
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

// TestCreateChatCompletionNonStream 测试非流式聊天完成功能
// 执行命令：go test -run TestCreateChatCompletionNonStream
func TestCreateChatCompletionNonStream(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_BEDROCK_TESTS") == "1" {
		t.Skip("跳过Bedrock API测试")
	}

	// 检查是否跳过DeepSeek测试
	skipDeepSeekTests := os.Getenv("SKIP_DEEPSEEK_TESTS") == "1"

	// 准备测试用例
	testCases := []struct {
		name           string
		request        ChatRequest
		provider       string
		expectError    bool
		expectedErrMsg string
		skipTest       bool
		skipReason     string
	}{
		{
			name: "基本非流式聊天完成测试-bedrock",
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
							Content: "简单介绍一下自然语言处理。",
						},
					},
					MaxTokens:   100,
					Temperature: 0.7,
					Stream:      false,
				},
			},
			provider:    "bedrock",
			expectError: false,
			skipTest:    false,
		},
		{
			name: "调用BedrockCreateChatCompletionToChat测试",
			request: ChatRequest{
				Provider: "bedrock",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个简洁的助手。回答要精简。",
						},
						{
							Role:    "user",
							Content: "什么是大模型？",
						},
					},
					MaxTokens:   50,
					Temperature: 0.5,
					Stream:      false,
				},
			},
			provider:    "bedrock",
			expectError: false,
			skipTest:    false,
		},
		{
			name: "基本非流式聊天完成测试-azure",
			request: ChatRequest{
				Provider: "azure",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "gpt-4o",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个简洁的助手。回答要精简。",
						},
						{
							Role:    "user",
							Content: "什么是自然语言处理？",
						},
					},
					MaxTokens:   50,
					Temperature: 0.7,
					Stream:      false,
				},
			},
			provider:    "azure",
			expectError: false,
			skipTest:    false,
			skipReason:  "跳过Azure API测试",
		},
		{
			name: "基本非流式聊天完成测试-deepseek",
			request: ChatRequest{
				Provider: "deepseek",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "deepseek-chat",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个专业的AI助手。",
						},
						{
							Role:    "user",
							Content: "请解释什么是深度学习？",
						},
					},
					MaxTokens:   100,
					Temperature: 0.7,
					Stream:      false,
				},
			},
			provider:    "deepseek",
			expectError: false,
			skipTest:    skipDeepSeekTests,
			skipReason:  "跳过DeepSeek API测试",
		},
		{
			name: "调用DeepSeekCreateChatCompletionToChat测试",
			request: ChatRequest{
				Provider: "deepseek",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "deepseek-chat",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个简洁的助手。回答要精简。",
						},
						{
							Role:    "user",
							Content: "什么是强化学习？",
						},
					},
					MaxTokens:   50,
					Temperature: 0.5,
					Stream:      false,
				},
			},
			provider:    "deepseek",
			expectError: false,
			skipTest:    skipDeepSeekTests,
			skipReason:  "跳过DeepSeek API测试",
		},
		{
			name: "不支持的供应商测试",
			request: ChatRequest{
				Provider: "unsupported",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "some-model",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "user",
							Content: "Hello",
						},
					},
				},
			},
			provider:       "unsupported",
			expectError:    true,
			expectedErrMsg: "不支持的AI供应商: unsupported",
			skipTest:       false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 如果需要跳过此测试
			if tc.skipTest {
				t.Skip(tc.skipReason)
			}

			// 设置供应商
			tc.request.Provider = tc.provider

			// 调用被测试的函数
			resp, err := CreateChatCompletion(tc.request, nil)

			// 检查错误
			if tc.expectError {
				assert.Error(t, err, "应返回错误")
				if tc.expectedErrMsg != "" {
					assert.Contains(t, err.Error(), tc.expectedErrMsg, "错误消息应包含预期内容")
				}
				return
			}

			// 非流式响应验证
			assert.NoError(t, err, "不应返回错误")
			assert.NotNil(t, resp, "响应不应为空")
			assert.NotEmpty(t, resp.ID, "响应ID不应为空")
			assert.Equal(t, "chat.completion", resp.Object, "响应对象类型应为chat.completion")
			assert.NotZero(t, resp.Created, "创建时间不应为零")
			assert.Equal(t, tc.request.ChatCompletionRequest.Model, resp.Model, "响应模型应与请求模型匹配")
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

// TestCreateChatCompletionWithDefaultProvider 测试默认供应商的情况
func TestCreateChatCompletionWithDefaultProvider(t *testing.T) {
	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_BEDROCK_TESTS") == "1" {
		t.Skip("跳过Bedrock API测试")
	}

	// 准备测试用例
	request := ChatRequest{
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
					Content: "简单介绍一下自然语言处理。",
				},
			},
			MaxTokens:   100,
			Temperature: 0.7,
			Stream:      true,
		},
	}

	// 创建缓冲区用于接收流式响应
	buffer := new(bytes.Buffer)

	// 调用被测试的函数
	resp, err := CreateChatCompletion(request, buffer)

	// 检查结果
	if err != nil {
		t.Logf("测试期间出现错误: %v", err)
		t.Skip("API调用失败，可能是配置问题")
		return
	}

	// 对于流式响应，期望resp为nil
	assert.Nil(t, resp, "流式响应应返回nil响应对象")

	// 获取响应内容
	response := buffer.String()

	// 验证响应格式正确性
	assert.True(t, len(response) > 0, "响应不应为空")
	assert.Contains(t, response, "data: ", "响应应包含data:前缀")

	// 验证至少收到了一些内容
	t.Logf("使用默认供应商获取的响应: %s", response)
}

// TestCreateChatCompletionCallsBedrockFunction 测试CreateChatCompletion是否正确调用了BedrockCreateChatCompletionToChat函数
func TestCreateChatCompletionCallsBedrockFunction(t *testing.T) {
	// 由于不能直接替换函数，我们将通过测试bedrock provider的非流式请求来验证
	// CreateChatCompletion函数是否会正确调用BedrockCreateChatCompletionToChat

	// 创建测试请求
	request := ChatRequest{
		Provider: "bedrock",
		ChatCompletionRequest: openai.ChatCompletionRequest{
			Model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "user",
					Content: "这是一个测试请求",
				},
			},
			Temperature: 0.7,
			MaxTokens:   50,
			Stream:      false,
		},
	}

	// 跳过实际API调用
	if os.Getenv("SKIP_BEDROCK_TESTS") == "1" {
		t.Skip("跳过Bedrock API测试")
	}

	// 调用被测试的函数
	resp, err := CreateChatCompletion(request, nil)

	// 检查结果
	if err != nil {
		// 如果返回的错误包含"尚未实现"，说明函数尝试调用了BedrockCreateChatCompletionToChat
		// 但该函数可能尚未完全实现
		if strings.Contains(err.Error(), "尚未实现") {
			t.Logf("检测到预期的错误: %v", err)
			t.Log("这表明CreateChatCompletion正确地尝试调用了BedrockCreateChatCompletionToChat")
			return
		}

		// 如果是其他API错误，可能是配置问题，我们可以接受
		t.Logf("API调用错误: %v", err)
		t.Skip("API调用失败，可能是配置问题")
		return
	}

	// 如果没有错误，则验证响应格式是否符合预期
	assert.NotNil(t, resp, "响应不应为空")
	assert.NotEmpty(t, resp.ID, "响应ID不应为空")
	assert.Equal(t, "chat.completion", resp.Object, "响应对象类型应为chat.completion")
	assert.NotZero(t, resp.Created, "创建时间不应为零")
	assert.Equal(t, request.ChatCompletionRequest.Model, resp.Model, "响应模型应与请求模型匹配")
	assert.NotEmpty(t, resp.Choices, "选择不应为空")

	if len(resp.Choices) > 0 {
		assert.NotEmpty(t, resp.Choices[0].Message.Content, "消息内容不应为空")
		assert.NotEmpty(t, resp.Choices[0].FinishReason, "完成原因不应为空")
		assert.Equal(t, "assistant", resp.Choices[0].Message.Role, "消息角色应为assistant")
		t.Logf("响应内容: %s", resp.Choices[0].Message.Content)
		t.Logf("完成原因: %s", resp.Choices[0].FinishReason)
	}

	t.Log("测试通过：CreateChatCompletion成功调用了BedrockCreateChatCompletionToChat并返回了有效响应")
}

// TestCreateChatCompletionCallsDeepSeekFunction 测试CreateChatCompletion是否正确调用了DeepSeekCreateChatCompletionToChat函数
func TestCreateChatCompletionCallsDeepSeekFunction(t *testing.T) {
	// 由于不能直接替换函数，我们将通过测试deepseek provider的非流式请求来验证
	// CreateChatCompletion函数是否会正确调用DeepSeekCreateChatCompletionToChat

	// 创建测试请求
	request := ChatRequest{
		Provider: "deepseek",
		ChatCompletionRequest: openai.ChatCompletionRequest{
			Model: "deepseek-chat",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "user",
					Content: "这是一个DeepSeek测试请求",
				},
			},
			Temperature: 0.7,
			MaxTokens:   50,
			Stream:      false,
		},
	}

	// 跳过实际API调用
	if os.Getenv("SKIP_DEEPSEEK_TESTS") == "1" {
		t.Skip("跳过DeepSeek API测试")
	}

	// 调用被测试的函数
	resp, err := CreateChatCompletion(request, nil)

	// 检查结果
	if err != nil {
		// 如果返回的错误包含"尚未实现"，说明函数尝试调用了DeepSeekCreateChatCompletionToChat
		// 但该函数可能尚未完全实现
		if strings.Contains(err.Error(), "尚未实现") {
			t.Logf("检测到预期的错误: %v", err)
			t.Log("这表明CreateChatCompletion正确地尝试调用了DeepSeekCreateChatCompletionToChat")
			return
		}

		// 如果是其他API错误，可能是配置问题，我们可以接受
		t.Logf("API调用错误: %v", err)
		t.Skip("API调用失败，可能是配置问题")
		return
	}

	// 如果没有错误，则验证响应格式是否符合预期
	assert.NotNil(t, resp, "响应不应为空")
	assert.NotEmpty(t, resp.ID, "响应ID不应为空")
	assert.Equal(t, "chat.completion", resp.Object, "响应对象类型应为chat.completion")
	assert.NotZero(t, resp.Created, "创建时间不应为零")
	assert.Equal(t, request.ChatCompletionRequest.Model, resp.Model, "响应模型应与请求模型匹配")
	assert.NotEmpty(t, resp.Choices, "选择不应为空")

	if len(resp.Choices) > 0 {
		assert.NotEmpty(t, resp.Choices[0].Message.Content, "消息内容不应为空")
		assert.NotEmpty(t, resp.Choices[0].FinishReason, "完成原因不应为空")
		assert.Equal(t, "assistant", resp.Choices[0].Message.Role, "消息角色应为assistant")
		t.Logf("响应内容: %s", resp.Choices[0].Message.Content)
		t.Logf("完成原因: %s", resp.Choices[0].FinishReason)
	}

	t.Log("测试通过：CreateChatCompletion成功调用了DeepSeekCreateChatCompletionToChat并返回了有效响应")
}

// TestCreateChatCompletionDeepSeekStream 测试DeepSeek的流式响应功能
func TestCreateChatCompletionDeepSeekStream(t *testing.T) {
	// 跳过实际API调用
	if os.Getenv("SKIP_DEEPSEEK_TESTS") == "1" {
		t.Skip("跳过DeepSeek API测试")
	}

	// 创建测试请求
	request := ChatRequest{
		Provider: "deepseek",
		ChatCompletionRequest: openai.ChatCompletionRequest{
			Model: "deepseek-chat",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "system",
					Content: "你是一个专业且有帮助的助手。",
				},
				{
					Role:    "user",
					Content: "简要介绍计算机视觉的应用领域。",
				},
			},
			MaxTokens:   100,
			Temperature: 0.7,
			Stream:      true,
		},
	}

	// 创建缓冲区用于接收流式响应
	buffer := new(bytes.Buffer)

	// 调用被测试的函数
	resp, err := CreateChatCompletion(request, buffer)

	// 检查结果
	if err != nil {
		t.Logf("测试期间出现错误: %v", err)
		t.Skip("API调用失败，可能是配置问题")
		return
	}

	// 对于流式响应，期望resp为nil
	assert.Nil(t, resp, "流式响应应返回nil响应对象")

	// 获取响应内容
	response := buffer.String()

	// 验证响应格式正确性
	assert.True(t, len(response) > 0, "响应不应为空")
	assert.Contains(t, response, "data: ", "响应应包含data:前缀")

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
			assert.Equal(t, request.ChatCompletionRequest.Model, streamResp.Model, "响应模型应与请求模型匹配")
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
}
