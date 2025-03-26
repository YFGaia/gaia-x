package ai

import (
	"bytes"
	"io"
	"testing"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	einox "github.com/gaia-x/eino-x"
	"github.com/sashabaranov/go-openai"
	"github.com/stretchr/testify/assert"
)

// 测试ChatService的CreateChatCompletion方法
func TestChatService_CreateChatCompletion(t *testing.T) {
	// 初始化服务实例
	chatService := &ChatService{}

	// 初始化环境变量
	InitEnvironment()

	// 测试用例
	tests := []struct {
		name           string
		req            einox.ChatRequest
		writer         io.Writer
		wantErr        bool
		expectedErrMsg string
		isStream       bool
	}{
		{
			name: "流式响应测试",
			req: einox.ChatRequest{
				Provider: "bedrock", // 使用bedrock作为供应商
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
					Messages: []openai.ChatCompletionMessage{
						{Role: "user", Content: "你好"},
					},
					Stream: true,
				},
			},
			writer:   &bytes.Buffer{},
			wantErr:  false,
			isStream: true,
		},
		{
			name: "流式响应测试-图片URL输入",
			req: einox.ChatRequest{
				Provider: "bedrock", // 使用bedrock作为供应商
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
					Messages: []openai.ChatCompletionMessage{
						{
							Role: "user",
							MultiContent: []openai.ChatMessagePart{
								{
									Type: openai.ChatMessagePartTypeText,
									Text: "这张图片是什么内容?",
								},
								{
									Type: openai.ChatMessagePartTypeImageURL,
									ImageURL: &openai.ChatMessageImageURL{
										URL:    "https://example.com/image.jpg", // 替换为实际的图片URL
										Detail: openai.ImageURLDetailAuto,
									},
								},
							},
						},
					},
					Stream: true,
				},
			},
			writer:   &bytes.Buffer{},
			wantErr:  false,
			isStream: true,
		},
		{
			name: "流式响应测试-Base64图片输入",
			req: einox.ChatRequest{
				Provider: "bedrock", // 使用bedrock作为供应商
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
					Messages: []openai.ChatCompletionMessage{
						{
							Role: "user",
							MultiContent: []openai.ChatMessagePart{
								{
									Type: openai.ChatMessagePartTypeText,
									Text: "描述一下这张图片",
								},
								{
									Type: openai.ChatMessagePartTypeImageURL,
									ImageURL: &openai.ChatMessageImageURL{
										URL:    "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...", // 替换为实际的base64图片数据
										Detail: openai.ImageURLDetailHigh,
									},
								},
							},
						},
					},
					Stream: true,
				},
			},
			writer:   &bytes.Buffer{},
			wantErr:  false,
			isStream: true,
		},
		// {
		// 	name: "非流式响应测试",
		// 	req: einox.ChatRequest{
		// 		Provider: "bedrock", // 使用bedrock作为供应商
		// 		ChatCompletionRequest: openai.ChatCompletionRequest{
		// 			Model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
		// 			Messages: []openai.ChatCompletionMessage{
		// 				{Role: "user", Content: "你好"},
		// 			},
		// 			Stream: false,
		// 		},
		// 	},
		// 	writer:         nil,
		// 	wantErr:        true,
		// 	expectedErrMsg: "暂不支持非流式响应",
		// 	isStream:       false,
		// },
		// {
		// 	name: "测试默认供应商配置",
		// 	req: einox.ChatRequest{
		// 		ChatCompletionRequest: openai.ChatCompletionRequest{
		// 			Model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
		// 			Messages: []openai.ChatCompletionMessage{
		// 				{Role: "user", Content: "你好"},
		// 			},
		// 			Stream: true, // 使用流式响应
		// 		},
		// 	},
		// 	writer:   &bytes.Buffer{},
		// 	wantErr:  false,
		// 	isStream: true,
		// },
	}

	// 设置全局配置，用于测试默认供应商
	global.GVA_CONFIG.AI.Provider = "bedrock"

	// 执行测试
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 注意：这是一个集成测试而非单元测试
			// 实际结果将取决于einox.CreateChatCompletion的实现
			resp, err := chatService.CreateChatCompletion(tt.req, tt.writer)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.expectedErrMsg != "" {
					assert.Equal(t, tt.expectedErrMsg, err.Error())
				}
			} else if tt.isStream {
				// 流式响应应该返回nil响应
				assert.Nil(t, resp)
				// 注意：在实际测试中，可能还需要检查writer是否有数据写入
				// 但这依赖于外部服务，可能需要额外的模拟
			}

			// 记录测试结果
			t.Logf("测试结果: err=%v, response=%v", err, resp)
		})
	}
}
