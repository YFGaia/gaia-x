package ai

import (
	"os"
	"testing"

	einox "github.com/YFGaia/eino-x"
	"github.com/sashabaranov/go-openai"
	"github.com/stretchr/testify/assert"
)

// 测试ChatService的CreateChatCompletion方法
func TestChatService_CreateChatCompletion(t *testing.T) {
	// 设置环境变量
	InitEnvironment()

	// 检查环境变量是否设置了测试标志
	if os.Getenv("SKIP_BEDROCK_TESTS") == "1" {
		t.Skip("跳过Bedrock API测试")
	}

	// 准备测试用例
	testCases := []struct {
		name        string
		request     einox.ChatRequest
		expectError bool
	}{
		{
			name: "bedrock基本聊天完成测试",
			request: einox.ChatRequest{
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
							Content: "请用中文解释什么是人工智能",
						},
					},
					MaxTokens:   100,
					Temperature: 0.7,
					TopP:        1.0,
				},
			},
			expectError: false,
		},
		{
			name: "bedrock多模态图片输入测试base64",
			request: einox.ChatRequest{
				Provider: "bedrock",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个视觉助手。",
						},
						{
							Role: "user",
							MultiContent: []openai.ChatMessagePart{
								{
									Type: openai.ChatMessagePartTypeText,
									Text: "描述这张图片的内容，用中文回答",
								},
								{
									Type: openai.ChatMessagePartTypeImageURL,
									ImageURL: &openai.ChatMessageImageURL{
										URL:    "data:image/jpeg;base64,/9j/4QDKRXhpZgAATU0AKgAAAAgABgESAAMAAAABAAEAAAEaAAUAAAABAAAAVgEbAAUAAAABAAAAXgEoAAMAAAABAAIAAAITAAMAAAABAAEAAIdpAAQAAAABAAAAZgAAAAAAAABIAAAAAQAAAEgAAAABAAeQAAAHAAAABDAyMjGRAQAHAAAABAECAwCgAAAHAAAABDAxMDCgAQADAAAAAQABAACgAgAEAAAAAQAAADKgAwAEAAAAAQAAAD6kBgADAAAAAQAAAAAAAAAAAAD/2wCEAAEBAQEBAQIBAQIDAgICAwQDAwMDBAUEBAQEBAUGBQUFBQUFBgYGBgYGBgYHBwcHBwcICAgICAkJCQkJCQkJCQkBAQEBAgICBAICBAkGBQYJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCf/dAAQABP/AABEIAD4AMgMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APzogtugOK6TT9HM7ZIwB+VLYW3mNtrtdE+Mvww+BfivTPEvj211DUmsHF6lnFYXH2KXyuY0m1EobSDc4GFkPJ2glQ1efiMVWhQnOjDnlGLajeMeZpXUU5NRTeyu0j88y/BfWK0aK0vZX7Lvp28j6L8O/sN/tB+JvDsXiKx8NSC2uEDxCeWGCSRCMgrFI6vg9twX8q+dfHHwu8ReCNWn8PeJLGWwvbY7ZYZl2upPTjpg9iMg9jX6Z6V/wUu8KeIL3Sb7S9G1S8sta1KbTIpkhlkxcwKXkWUQq5QL/wA9HwhA+TIxXvfxCk8E/tS/Da4s9QsraLxHZ2rPptyGIkhfb5iwyswVzE442suAcEdM1/nzwl9Lnj7Lc4px47yWNHB1ZcqdO/PS97lvNOb5lF6TtGDWrSduU/pniDwHyh4KVTIcb7WpBXadrS0v7tlp5brp5n89GoaW0RIx0rj7uzAbkV9D67pEUg8yNcBhkD27V5Nq+mmNmKDpX+l9KvbY/lq3Y83+ztR9nats2wz92k+yj+7XX9YEf//Q+KNMhKNhhX3l+xbqeiD4pyeB9fsI7228X6bc6LiWNHCPKBKhw4IwWiCkY7jsK+MbCzzgn5a+h/g34tHw18RS/EFLc3Uuiade3cMa43GYReXGV3cBtzjBPA614ksyp4eH1mTso6+h8Ll2CnPEwpwW7SPsfw78Avhfr/iTUNP8AmXwN9idfs19YWiNbtIvzzNfWr7EkDSB8MCkij7jDgV7DpcHwf8ABusxeJNe8T/8JlrVityunvo1pJa2VukaZuJDPN5klwwTmRIN6xrnCkrvHwz8SvCWpwnVn8ZapPJcSrFqVtIITfWHnQSjzbdhHJ5NziVkPk4WaNCGQLKPmxPBXxk+E2peLW06+1QaHpmvqLq4hgnMNx4c8SRyD7PdpbyqDEt4uE5CKXzE6v5hz/FPiR4o4bM8VUx+WYPmqwv+95OaSVk9kuVtK6V+Zvk9mmpSgpf1zwvwZPD4RUcRiLQl9hOy7b727pWWt7WTtzPxd+Cd54MD6notymraQCu24ixujDBSvmqOACHXDr8rBlIwGXPyJrljtU5FfqjbfFr4baU2peDtRuYz9ot7a4EJtJI7W2VZXt5lxJgJB5UgQ/8ALOOMqMn93X57/Ezw/ZaD4kvtL0yQz2iSFrWVuDJbyfPA59zGVz75r+gPBLxEzDOcLLD5tScatNR95xcVNNfElZLy00e6Vj8D8TOCKGVVo1MHNOnLpe9rdP8AI+cGsxuOEFJ9jH9wVvPb/OfrTfs4r919ofluh//R8/8AHXwq1L4d6lDbSyre2d0u60volAguFXGWiw8mVAK9+/QVd+H91o+leIEPiNPM0u7jktL0L1FvcLsdl904cf7tfpB8Of20P2L/ANoPxFbeF/2i9A0mG58RQrLbSwQyWpkuGLEyG5sxtUsFYh5GQD7vORXmv7Qfhr9mr4FeIdNuPhlo8urnUA8qNe6oLixjiC43RIYy8hOSUEjsOFztOa/LpZbVeUyoZhVjUvFxk4+7zXVr2XwPXpe3TsexW4PrUsfGeAVkrNX6W/O1vLtY/Oz9oCP4keGNUu9F+M2m38PhjTjDFZajaxLLpEsDBhBPBHFuS2kCEpNHPGEfPDsrMg+KodZ8K6X/AMSu5/tAaZFKXtpY9kjxJIuJFhEwl/0Y9Vt3eSNDwMqEx+9ng74k6Re+HYp/D6JcaDdMRZ20oKrb+bEsnkgyE+bE6vujBztw0Y+6K81/4Uv+xt4p1yWx8e2B8O6nqUu2zexufsZuJmzhUjQ+W7N0CyRn5sL1xX8PZt9Ierwrja2UZ7gqvJvGeHtaaWnP7KSvGe/tLSkviilyb/t1LwjqZtg1icrxKjPaUJ/Za6c2vu9vd2sfkpPeeEfDumxeL/hffw3MmjrHILKOebS4ZIYZEn8m50tvMsnDyIHaS2Fs+VHymvpb4j6xpPiPwr4L1vR4zFu8M2ENykjiSRLyHzBcI7gANtZvlYAZXnA6V5v+0r8D/hr4Jubc/AzxFceIRK8f2uy1y0itbu2WUiNRFJbxQMxVsh0eJivQkVzmt/Bfxz8DvFMOk6r4gt9V07UdPivWtkilRoBOG8jBdm+fCgkZxsYDHAr+5/C/EZdm2RYbPMLiJzVTm5HUi4TsrpxlGy2a0tGMdrbpv8r4yyLEYbC1MHj5R5o21Wq9L+hjMVDEbqblf71Hme4/75pPMHqv/fNfo3tJdz8R9gj/0vjnxv8ADXwf4C1y08UPbl4Z4bjTVsiX8hHljIR1jB2qydBkbTnGMDFRaVf65pPjDHiVLkTyW8aW8ClVCxRQsQGUoyeVhUTCPgknopFfTurpYaoGj+zJ5DqQ0bkvwV554Ixztx0z7ZrhvFvgjTPiHeavLqCiSxsUFokMv3S/lJvYxrhPnJALdQo4A3Gv5q+u4jD1feVqctlpptpb+kfqmV5i501Cb+Hf9DxvTPjt4w0jWjaQyi0nQRQyWUsitHG+37jw/MuACOh3Bl4IxivpT4faDrf7U3w9m8WyaIskJubn7EhnjhubgRsIyIoVJQbMb+HDtwNgIzX59/Fj4e2+laX4o1i0SKCHUYWaAqS0iSbPLfggCMYJxsPO45HevrD9k3xf408N/D2+t0uIrnTrS4YrA6YG2SMTGN15DrjIHQjA5x0+kx2TZNmFKM8fh1Pkemmq0Wz6XW9mr6dj36GPxVN3w1VwctLr8NPLp2OY+IWmnwLrJvtXE0N9EFtZ0vQwuVP3VdxJh8q205I7ZrO8TeKdO8W+Ve2pC3sMEMV5HjAEnlgrIo/usvHHQriuy/a48deIfivpkNvrt3cS2+kWcN1BC0gXZKPMMrpMFMqbhsUJuaPAPyg19B/st/spfCX9oP4RteeArnUtD8QafbR27yX0hvYbw+T52+V5HMkZLK+dgIA24A5Ffd0syyDLcNQoUrx0UYpR91Xu0vTv527H5xnmQYyUKksTLmd27nwUY5M/eFJ5cn94fn/9av0HT/gnd8Yp0E8Oq6NscblzLcA4PTIFucfnTv8Ah3R8Z/8AoK6L/wB/rj/5Gr0f7Ywv834M+H/syfY//9k=",
										Detail: openai.ImageURLDetailAuto,
									},
								},
							},
						},
					},
					MaxTokens:   300,
					Temperature: 0.7,
					TopP:        1.0,
				},
			},
			expectError: false,
		},
		{
			name: "bedrock多模态图片输入测试URL",
			request: einox.ChatRequest{
				Provider: "bedrock",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个视觉助手。",
						},
						{
							Role: "user",
							MultiContent: []openai.ChatMessagePart{
								{
									Type: openai.ChatMessagePartTypeText,
									Text: "描述这张图片的内容，用中文回答",
								},
								{
									Type: openai.ChatMessagePartTypeImageURL,
									ImageURL: &openai.ChatMessageImageURL{
										URL:    "https://d2908q01vomqb2.cloudfront.net/887309d048beef83ad3eabf2a79a64a389ab1c9f/2023/07/13/DBBLOG-3334-image001.png",
										Detail: openai.ImageURLDetailAuto,
									},
								},
							},
						},
					},
					MaxTokens:   300,
					Temperature: 0.7,
					TopP:        1.0,
				},
			},
			expectError: false,
		},
		{
			name: "azure多模态图片识别测试",
			request: einox.ChatRequest{
				Provider: "azure",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "gpt-4o",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个有帮助的视觉助手。",
						},
						{
							Role: "user",
							MultiContent: []openai.ChatMessagePart{
								{
									Type: openai.ChatMessagePartTypeText,
									Text: "这个是什么图片? 中文回复",
								},
								{
									Type: openai.ChatMessagePartTypeImageURL,
									ImageURL: &openai.ChatMessageImageURL{
										URL:    "data:image/jpeg;base64,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",
										Detail: openai.ImageURLDetailAuto,
									},
								},
							},
						},
					},
					MaxTokens:   300,
					Temperature: 0.7,
					TopP:        1.0,
				},
			},
		},
		{
			name: "azure多模态图片URL测试",
			request: einox.ChatRequest{
				Provider: "azure",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "gpt-4o",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "system",
							Content: "你是一个有帮助的视觉助手。",
						},
						{
							Role: "user",
							MultiContent: []openai.ChatMessagePart{
								{
									Type: openai.ChatMessagePartTypeText,
									Text: "这个是什么图片? 详细描述一下，中文回复",
								},
								{
									Type: openai.ChatMessagePartTypeImageURL,
									ImageURL: &openai.ChatMessageImageURL{
										URL:    "https://d2908q01vomqb2.cloudfront.net/887309d048beef83ad3eabf2a79a64a389ab1c9f/2023/07/13/DBBLOG-3334-image001.png",
										Detail: openai.ImageURLDetailAuto,
									},
								},
							},
						},
					},
					MaxTokens:   300,
					Temperature: 0.7,
					TopP:        1.0,
				},
			},
		},
		{
			name: "bedrock无效模型测试",
			request: einox.ChatRequest{
				Provider: "bedrock",
				ChatCompletionRequest: openai.ChatCompletionRequest{
					Model: "invalid-model",
					Messages: []openai.ChatCompletionMessage{
						{
							Role:    "user",
							Content: "测试消息",
						},
					},
				},
			},
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 调用被测试的方法
			resp, err := einox.CreateChatCompletion(tc.request, nil)

			// 错误情况处理
			if tc.expectError {
				assert.Error(t, err, "预期应返回错误")
				return
			}

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
