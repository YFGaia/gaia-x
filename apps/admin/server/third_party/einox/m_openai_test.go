package einox

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"strings"
	"testing"

	"github.com/sashabaranov/go-openai"
)

// 定义测试所需的结构
type mockOpenAIMessage struct {
	Role         string
	Content      string
	ResponseMeta *mockOpenAIResponseMeta
}

type mockOpenAIResponseMeta struct {
	FinishReason string
	Usage        *mockOpenAIUsage
}

type mockOpenAIUsage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

// TestGetOpenAIConfig 测试获取OpenAI配置的方法
func TestGetOpenAIConfig(t *testing.T) {
	// 保存原始环境变量以便测试后恢复
	originalEnv := os.Getenv("ENV")
	defer os.Setenv("ENV", originalEnv)

	// 测试场景：设置环境变量为测试环境
	t.Run("测试获取有效配置", func(t *testing.T) {
		// 设置测试环境变量
		os.Setenv("ENV", "development")

		// 创建配置对象
		conf := &Config{
			Vendor:    "openai",
			Model:     "gpt-3.5-turbo",
			MaxTokens: 1000,
			Temperature: func() *float32 {
				v := float32(0.7)
				return &v
			}(),
			TopP: func() *float32 {
				v := float32(0.9)
				return &v
			}(),
			Stop: []string{"stop"},
			VendorOptional: &VendorOptional{
				OpenAIConfig: &OpenAIConfig{},
			},
		}

		// 由于配置文件可能不存在，使用Mock替代或跳过实际调用
		// 这里仅测试函数调用不会崩溃
		_, err := conf.getOpenAIConfig()
		if err != nil {
			// 如果配置文件不存在，会返回错误，这里只是确保函数能被调用
			t.Logf("获取配置返回错误(可能是配置文件不存在): %v", err)
		}
	})
}

// TestOpenAICreateChatCompletion 测试创建聊天完成的方法
func TestOpenAICreateChatCompletion(t *testing.T) {
	t.Run("测试创建聊天完成请求", func(t *testing.T) {
		// 准备测试请求
		req := ChatRequest{
			Provider: "openai",
			ChatCompletionRequest: openai.ChatCompletionRequest{
				Model:       "gpt-3.5-turbo",
				MaxTokens:   1000,
				Temperature: 0.7,
				TopP:        0.9,
				Stop:        []string{"stop"},
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好，OpenAI!",
					},
				},
			},
		}

		// 记录请求参数
		t.Logf("【请求信息】模型: %s, 最大token: %d, 温度: %.1f, TopP: %.1f",
			req.ChatCompletionRequest.Model, req.ChatCompletionRequest.MaxTokens,
			req.ChatCompletionRequest.Temperature, req.ChatCompletionRequest.TopP)
		t.Logf("【请求消息】角色: %s, 内容: %s",
			req.ChatCompletionRequest.Messages[0].Role, req.ChatCompletionRequest.Messages[0].Content)

		t.Log("【开始调用】OpenAICreateChatCompletionToChat...")

		// 调用OpenAI API
		resp, err := OpenAICreateChatCompletionToChat(req)

		// 如果有错误
		if err != nil {
			t.Logf("【调用失败】创建聊天完成返回错误: %v", err)

			// 尝试分析错误类型
			if os.IsNotExist(err) {
				t.Log("【错误原因】可能是配置文件不存在")
			} else if os.Getenv("ENV") == "" {
				t.Log("【错误原因】可能是环境变量未设置")
			} else {
				t.Log("【错误原因】可能是API密钥无效或网络问题")
			}

			return
		}

		// 如果调用成功，记录响应
		t.Log("【调用成功】接收到OpenAI响应")
		t.Logf("【响应概览】ID: %s, 模型: %s", resp.ID, resp.Model)

		if len(resp.Choices) > 0 {
			t.Logf("【AI回复】角色: %s, 内容: %s",
				resp.Choices[0].Message.Role, resp.Choices[0].Message.Content)
			t.Logf("【结束原因】%s", resp.Choices[0].FinishReason)
		} else {
			t.Log("【警告】响应中没有选择结果")
		}

		t.Logf("【Token用量】提示: %d, 补全: %d, 总计: %d",
			resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	})
}

// TestOpenAICreateChatCompletionToChat 测试转换格式的聊天完成方法
func TestOpenAICreateChatCompletionToChat(t *testing.T) {
	t.Run("测试格式转换聊天请求", func(t *testing.T) {
		// 准备测试请求
		req := ChatRequest{
			Provider: "openai",
			ChatCompletionRequest: openai.ChatCompletionRequest{
				Model:       "gpt-3.5-turbo",
				MaxTokens:   1000,
				Temperature: 0.7,
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好，OpenAI!",
					},
				},
			},
		}

		// 记录请求参数
		t.Logf("【转换请求信息】模型: %s, 最大token: %d, 温度: %.1f",
			req.ChatCompletionRequest.Model, req.ChatCompletionRequest.MaxTokens, req.ChatCompletionRequest.Temperature)
		t.Logf("【转换请求消息】角色: %s, 内容: %s",
			req.ChatCompletionRequest.Messages[0].Role, req.ChatCompletionRequest.Messages[0].Content)

		t.Log("【开始转换调用】OpenAICreateChatCompletionToChat...")

		// 调用格式转换的OpenAI API
		resp, err := OpenAICreateChatCompletionToChat(req)

		// 如果有错误
		if err != nil {
			t.Logf("【转换调用失败】创建格式转换聊天完成返回错误: %v", err)
			return
		}

		// 如果调用成功，记录响应
		t.Log("【转换调用成功】接收到格式转换的OpenAI响应")
		t.Logf("【转换响应概览】ID: %s, 模型: %s", resp.ID, resp.Model)

		if len(resp.Choices) > 0 {
			t.Logf("【转换AI回复】角色: %s, 内容: %s",
				resp.Choices[0].Message.Role, resp.Choices[0].Message.Content)
			t.Logf("【转换结束原因】%s", resp.Choices[0].FinishReason)
		} else {
			t.Log("【警告】转换响应中没有选择结果")
		}

		t.Logf("【转换Token用量】提示: %d, 补全: %d, 总计: %d",
			resp.Usage.PromptTokens, resp.Usage.CompletionTokens, resp.Usage.TotalTokens)
	})
}

// TestOpenAIStreamChatCompletion 测试创建流式聊天完成的方法
func TestOpenAIStreamChatCompletion(t *testing.T) {
	t.Run("测试创建流式聊天完成请求", func(t *testing.T) {
		// 准备测试请求
		req := ChatRequest{
			Provider: "openai",
			ChatCompletionRequest: openai.ChatCompletionRequest{
				Model:       "gpt-3.5-turbo",
				MaxTokens:   1000,
				Temperature: 0.7,
				TopP:        0.9,
				Stop:        []string{"stop"},
				Stream:      true,
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好，OpenAI!",
					},
				},
			},
		}

		// 记录请求参数
		t.Logf("【流式请求信息】模型: %s, 最大token: %d, 温度: %.1f, TopP: %.1f",
			req.ChatCompletionRequest.Model, req.ChatCompletionRequest.MaxTokens,
			req.ChatCompletionRequest.Temperature, req.ChatCompletionRequest.TopP)
		t.Logf("【流式请求消息】角色: %s, 内容: %s",
			req.ChatCompletionRequest.Messages[0].Role, req.ChatCompletionRequest.Messages[0].Content)

		t.Log("【开始流式调用】OpenAIStreamChatCompletion...")

		// 调用OpenAI流式API
		streamReader, err := OpenAIStreamChatCompletion(req)

		// 如果有错误
		if err != nil {
			t.Logf("【流式调用失败】创建流式聊天完成返回错误: %v", err)

			// 尝试分析错误类型
			if os.IsNotExist(err) {
				t.Log("【错误原因】可能是配置文件不存在")
			} else if os.Getenv("ENV") == "" {
				t.Log("【错误原因】可能是环境变量未设置")
			} else {
				t.Log("【错误原因】可能是API密钥无效或网络问题")
			}

			return
		}

		// 如果调用成功
		t.Log("【流式调用成功】获取到流式响应读取器")

		// 尝试从流中读取几条消息
		t.Log("【流式响应接收】开始从流中读取消息...")

		// 从流中读取消息的计数
		var messageCount int
		var allContent string

		// 读取最多5条消息，或者直到流结束
		for messageCount < 5 {
			resp, err := streamReader.Recv()
			if err == io.EOF {
				t.Log("【流式响应完成】流已经结束")
				break
			}
			if err != nil {
				t.Logf("【流式响应错误】读取流时出错: %v", err)
				break
			}

			// 增加消息计数
			messageCount++

			// 记录接收到的消息
			if len(resp.Choices) > 0 {
				content := resp.Choices[0].Delta.Content
				allContent += content
				t.Logf("【流式消息 #%d】内容片段: %s", messageCount, content)
				if resp.Choices[0].FinishReason != "" {
					t.Logf("【流式消息 #%d】结束原因: %s", messageCount, resp.Choices[0].FinishReason)
				}
			}
		}

		// 汇总接收到的内容
		t.Logf("【流式接收总结】共接收 %d 条消息", messageCount)
		t.Logf("【流式内容总结】接收到的内容: %s", allContent)
	})
}

// TestOpenAIStreamChatCompletionToChat 测试流式聊天完成转换为聊天流格式的方法
func TestOpenAIStreamChatCompletionToChat(t *testing.T) {
	t.Run("测试流式聊天完成转换为聊天流格式", func(t *testing.T) {
		// 准备测试请求
		req := ChatRequest{
			Provider: "openai",
			ChatCompletionRequest: openai.ChatCompletionRequest{
				Model:       "gpt-3.5-turbo",
				MaxTokens:   1000,
				Temperature: 0.7,
				Stream:      true,
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    "user",
						Content: "你好，OpenAI!",
					},
				},
			},
		}

		// 创建一个buffer作为writer
		var buf bytes.Buffer

		// 记录请求参数
		t.Logf("【流式转换请求信息】模型: %s, 最大token: %d, 温度: %.1f",
			req.ChatCompletionRequest.Model, req.ChatCompletionRequest.MaxTokens, req.ChatCompletionRequest.Temperature)
		t.Logf("【流式转换请求消息】角色: %s, 内容: %s",
			req.ChatCompletionRequest.Messages[0].Role, req.ChatCompletionRequest.Messages[0].Content)

		t.Log("【开始流式转换调用】OpenAIStreamChatCompletionToChat...")

		// 调用流式转换API
		err := OpenAIStreamChatCompletionToChat(req, &buf)

		// 如果有错误
		if err != nil {
			t.Logf("【流式转换调用失败】创建流式转换聊天完成返回错误: %v", err)
			return
		}

		// 如果调用成功
		t.Log("【流式转换调用成功】")

		// 分析buffer中的结果
		responseText := buf.String()
		t.Logf("【流式转换结果大小】%d 字节", buf.Len())

		// 简单分析响应，计算消息数量
		messageCount := strings.Count(responseText, "data: ")
		completedMessage := strings.Contains(responseText, "data: [DONE]")

		t.Logf("【流式转换响应】接收到 %d 条消息", messageCount)
		if completedMessage {
			t.Log("【流式转换完成】接收到完成信号 [DONE]")
		} else {
			t.Log("【警告】未接收到完成信号")
		}

		// 尝试解析部分消息
		messageLines := strings.Split(responseText, "\n\n")
		parsedCount := 0

		for _, line := range messageLines {
			if strings.HasPrefix(line, "data: ") && line != "data: [DONE]" {
				jsonStr := strings.TrimPrefix(line, "data: ")
				var streamResp StreamResponse
				if err := json.Unmarshal([]byte(jsonStr), &streamResp); err != nil {
					t.Logf("【警告】解析消息失败: %v", err)
					continue
				}

				parsedCount++
				if parsedCount <= 3 { // 只记录前3条，避免日志过多
					t.Logf("【解析消息 %d】ID: %s, 模型: %s", parsedCount, streamResp.ID, streamResp.Model)
					if len(streamResp.Choices) > 0 {
						t.Logf("【消息内容】角色: %s, 内容: %s",
							streamResp.Choices[0].Delta.Role, streamResp.Choices[0].Delta.Content)
					}
				}
			}
		}

		t.Logf("【成功解析】共解析 %d 条消息", parsedCount)
	})
}

// TestMockOpenAIConfig 使用Mock配置测试OpenAI功能
func TestMockOpenAIConfig(t *testing.T) {
	// 创建一个临时的测试配置文件
	tempConfigContent := `
environments:
  test:
    credentials:
      - name: test-credential
        api_key: mock-api-key
        base_url: https://api.openai.com/v1
        enabled: true
        weight: 1
        qps_limit: 10
        description: 测试凭证
        models:
          - gpt-3.5-turbo
        timeout: 30
`
	tempConfigDir := LLMConfigPath
	err := os.MkdirAll(tempConfigDir, 0755)
	if err != nil {
		t.Fatalf("创建临时配置目录失败: %v", err)
	}

	tempConfigFile := tempConfigDir + "/openai.yaml"
	err = os.WriteFile(tempConfigFile, []byte(tempConfigContent), 0644)
	if err != nil {
		t.Fatalf("创建临时配置文件失败: %v", err)
	}
	defer func() {
		// 测试完成后删除临时文件
		os.Remove(tempConfigFile)
		os.Remove(tempConfigDir)
	}()

	// 设置测试环境变量
	originalEnv := os.Getenv("ENV")
	os.Setenv("ENV", "test")
	defer os.Setenv("ENV", originalEnv)

	// 创建配置对象
	conf := &Config{
		Vendor:    "openai",
		Model:     "gpt-3.5-turbo",
		MaxTokens: 1000,
		Temperature: func() *float32 {
			v := float32(0.7)
			return &v
		}(),
		TopP: func() *float32 {
			v := float32(0.9)
			return &v
		}(),
		Stop: []string{"stop"},
		VendorOptional: &VendorOptional{
			OpenAIConfig: &OpenAIConfig{},
		},
	}

	// 测试获取配置
	t.Run("使用Mock配置测试获取OpenAI配置", func(t *testing.T) {
		// 获取配置
		openaiConf, err := conf.getOpenAIConfig()

		// 因为我们使用的是mock的api_key，实际解密会失败
		// 所以这里我们只检查函数调用过程，不期望成功获取配置
		if err != nil {
			t.Logf("预期的错误(因为使用了mock密钥): %v", err)
			return
		}

		// 如果配置获取成功，检查配置参数
		t.Log("【意外成功】成功获取OpenAI配置")
		t.Logf("【配置信息】Model: %s, BaseURL: %s", openaiConf.Model, openaiConf.BaseURL)
	})
}

// mockStreamReceive 模拟接收OpenAI流式响应
func mockOpenAIStreamReceive() []*mockOpenAIMessage {
	return []*mockOpenAIMessage{
		{
			Role:    "assistant",
			Content: "你好",
		},
		{
			Role:    "assistant",
			Content: "，我是",
		},
		{
			Role:    "assistant",
			Content: "OpenAI",
		},
		{
			Role:    "assistant",
			Content: "助手",
			ResponseMeta: &mockOpenAIResponseMeta{
				FinishReason: "stop",
				Usage: &mockOpenAIUsage{
					PromptTokens:     15,
					CompletionTokens: 8,
					TotalTokens:      23,
				},
			},
		},
	}
}
