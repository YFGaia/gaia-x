package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	einox "github.com/gaia-x/eino-x"
	"github.com/sashabaranov/go-openai"
)

// 基于TestCreateChatCompletionStream的简化示例
func main() {
	//设置环境变量目录RSA和配置文件目录
	//os.Setenv("LLM_CONFIG_PATH", "你的项目路径/data/einox/config")
	//os.Setenv("EINOX_RSA_KEYS_DIR", "你的项目路径/data/einox/rsa_keys")

	//
	fmt.Println("Gaia-X LLM 服务示例")
	fmt.Println("===================")

	// 创建请求
	request := einox.ChatRequest{
		Provider: "bedrock", // 可选: "azure", "bedrock", "deepseek"
		ChatCompletionRequest: openai.ChatCompletionRequest{
			Model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "system",
					Content: "你是一个有帮助的助手。请简洁地回答问题。",
				},
				{
					Role:    "user",
					Content: "简单介绍一下自然语言处理。",
				},
			},
			MaxTokens:   100,
			Temperature: 0.7,
			Stream:      true, // 流式响应
		},
	}

	// 创建缓冲区用于接收流式响应
	buffer := new(bytes.Buffer)

	fmt.Println("正在发送请求...")

	// 调用 API
	resp, err := einox.CreateChatCompletion(request, buffer)
	if err != nil {
		fmt.Printf("API 调用失败: %v\n", err)
		os.Exit(1)
	}

	// 对于流式响应，解析并显示内容
	if request.ChatCompletionRequest.Stream {
		fmt.Println("\n收到的流式响应:")
		response := buffer.String()

		// 解析并显示每个响应块
		lines := strings.Split(response, "\n\n")
		var allContent string

		for _, line := range lines {
			if strings.HasPrefix(line, "data: ") && line != "data: [DONE]" {
				// 解析JSON
				jsonData := strings.TrimPrefix(line, "data: ")
				var streamResp einox.StreamResponse
				err := json.Unmarshal([]byte(jsonData), &streamResp)

				if err != nil {
					fmt.Printf("解析响应JSON失败: %v\n", err)
					continue
				}

				// 收集内容
				if len(streamResp.Choices) > 0 {
					content := streamResp.Choices[0].Delta.Content
					if content != "" {
						fmt.Print(content)
						allContent += content
					}
				}
			}
		}

		fmt.Println("\n\n完整响应内容:")
		fmt.Println(allContent)
	} else {
		// 对于非流式响应，输出返回的消息
		fmt.Println("收到的响应:")
		fmt.Println(resp.Choices[0].Message.Content)
	}

	// 非流式请求示例
	fmt.Println("\n\n非流式请求示例:")

	// 创建非流式请求
	nonStreamRequest := einox.ChatRequest{
		Provider: "bedrock",
		ChatCompletionRequest: openai.ChatCompletionRequest{
			Model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    "system",
					Content: "你是一个有帮助的助手。请用一句话回答问题。",
				},
				{
					Role:    "user",
					Content: "什么是机器学习？",
				},
			},
			MaxTokens:   50,
			Temperature: 0.5,
			Stream:      false, // 非流式响应
		},
	}

	// 调用 API（非流式）
	nonStreamResp, err := einox.CreateChatCompletion(nonStreamRequest, nil)
	if err != nil {
		fmt.Printf("非流式 API 调用失败: %v\n", err)
	} else {
		fmt.Println("收到的非流式响应:")
		fmt.Println(nonStreamResp.Choices[0].Message.Content)
	}
}
