package einox

import "github.com/sashabaranov/go-openai"

// ChatCompletionRequest 聊天完成请求
type ChatCompletionRequest struct {
	Model       string         `json:"model" binding:"required"`    // 模型名称
	Messages    []ChatMessage  `json:"messages" binding:"required"` // 消息列表
	Temperature float32        `json:"temperature"`                 // 温度
	TopP        float32        `json:"top_p"`                       // Top P
	N           int            `json:"n"`                           // 生成数量
	Stream      bool           `json:"stream"`                      // 是否流式输出
	Stop        []string       `json:"stop"`                        // 停止标记
	MaxTokens   int            `json:"max_tokens"`                  // 最大令牌数
	PresenceP   float32        `json:"presence_penalty"`            // 存在惩罚
	FrequencyP  float32        `json:"frequency_penalty"`           // 频率惩罚
	LogitBias   map[string]int `json:"logit_bias"`                  // 逻辑偏差
	User        string         `json:"user"`                        // 用户标识
}

// ChatMessage 聊天消息
type ChatMessage struct {
	Role    string `json:"role" binding:"required"`    // 角色
	Content string `json:"content" binding:"required"` // 内容
	Name    string `json:"name,omitempty"`             // 名称
}

// ChatCompletionResponse 聊天完成响应
type ChatCompletionResponse struct {
	ID      string                 `json:"id"`      // ID
	Object  string                 `json:"object"`  // 对象类型
	Created int64                  `json:"created"` // 创建时间
	Model   string                 `json:"model"`   // 模型名称
	Choices []ChatCompletionChoice `json:"choices"` // 选择列表
	Usage   ChatCompletionUsage    `json:"usage"`   // 使用情况
}

// ChatCompletionChoice 聊天完成选择
type ChatCompletionChoice struct {
	Index        int         `json:"index"`         // 索引
	Message      ChatMessage `json:"message"`       // 消息
	FinishReason string      `json:"finish_reason"` // 完成原因
}

// ChatCompletionUsage 聊天完成使用情况
type ChatCompletionUsage struct {
	PromptTokens     int `json:"prompt_tokens"`     // 提示令牌数
	CompletionTokens int `json:"completion_tokens"` // 完成令牌数
	TotalTokens      int `json:"total_tokens"`      // 总令牌数
}

// ChatCompletionStreamResponse 聊天完成流式响应
type ChatCompletionStreamResponse struct {
	ID      string                       `json:"id"`      // ID
	Object  string                       `json:"object"`  // 对象类型
	Created int64                        `json:"created"` // 创建时间
	Model   string                       `json:"model"`   // 模型名称
	Choices []ChatCompletionStreamChoice `json:"choices"` // 选择列表
}

// ChatCompletionStreamChoice 聊天完成流式选择
type ChatCompletionStreamChoice struct {
	Index        int                       `json:"index"`         // 索引
	Delta        ChatCompletionStreamDelta `json:"delta"`         // 增量
	FinishReason string                    `json:"finish_reason"` // 完成原因
}

// ChatCompletionStreamDelta 聊天完成流式增量
type ChatCompletionStreamDelta struct {
	Role             string `json:"role,omitempty"`              // 角色
	Content          string `json:"content,omitempty"`           // 内容
	ReasoningContent string `json:"reasoning_content,omitempty"` // 推理内容，用于DeepSeek模型
}

// ChatRequest 聊天请求
type ChatRequest struct {
	Provider string `json:"provider,omitempty"` // 供应商：openai, azure等
	openai.ChatCompletionRequest
	//额外参数
	Extra map[string]any `json:"extra,omitempty"` // 额外参数
}

// ChatResponse 聊天响应
type ChatResponse struct {
	ID      string     `json:"id"`      // 响应ID
	Object  string     `json:"object"`  // 对象类型
	Created int64      `json:"created"` // 创建时间
	Model   string     `json:"model"`   // 模型名称
	Choices []Choice   `json:"choices"` // 选择列表
	Usage   TokenUsage `json:"usage"`   // 使用情况
}

// Choice 选择
type Choice struct {
	Index        int         `json:"index"`         // 索引
	Message      ChatMessage `json:"message"`       // 消息
	FinishReason string      `json:"finish_reason"` // 结束原因
}

// TokenUsage Token使用情况
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`     // 提示token数
	CompletionTokens int `json:"completion_tokens"` // 完成token数
	TotalTokens      int `json:"total_tokens"`      // 总token数
}

// StreamResponse 流式响应
type StreamResponse struct {
	ID      string         `json:"id"`      // 响应ID
	Object  string         `json:"object"`  // 对象类型
	Created int64          `json:"created"` // 创建时间
	Model   string         `json:"model"`   // 模型名称
	Choices []StreamChoice `json:"choices"` // 选择列表
}

// StreamChoice 流式选择
type StreamChoice struct {
	Index        int               `json:"index"`         // 索引
	Delta        StreamChoiceDelta `json:"delta"`         // 增量
	FinishReason string            `json:"finish_reason"` // 结束原因
}

// StreamChoiceDelta 流式选择增量
type StreamChoiceDelta struct {
	Role    string `json:"role,omitempty"`    // 角色
	Content string `json:"content,omitempty"` // 内容
}

// ErrorResponse 错误响应
type ErrorResponse struct {
	Error struct {
		Message string `json:"message"` // 错误消息
		Type    string `json:"type"`    // 错误类型
		Code    string `json:"code"`    // 错误代码
	} `json:"error"`
}
