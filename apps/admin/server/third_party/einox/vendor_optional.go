package einox

import (
	"net/http"
	"time"

	"github.com/cloudwego/eino-ext/libs/acl/openai"
	"github.com/google/generative-ai-go/genai"
)

type VendorOptional struct {
	OpenAIConfig *OpenAIConfig `yaml:"openai_config,omitempty" json:"openai_config,omitempty"`
	AzureConfig  *AzureConfig  `yaml:"azure_config,omitempty" json:"azure_config,omitempty"`
	ClaudeConfig *ClaudeConfig `yaml:"claude_config,omitempty" json:"claude_config,omitempty"`
	//bedrock
	BedrockConfig  *BedrockConfig  `yaml:"bedrock_config,omitempty" json:"bedrock_config,omitempty"`
	DeepSeekConfig *DeepSeekConfig `yaml:"deepseek_config,omitempty" json:"deepseek_config,omitempty"`
	GeminiConfig   *GeminiConfig   `yaml:"gemini_config,omitempty" json:"gemini_config,omitempty"`
	QianFanConfig  *QianFanConfig  `yaml:"qianfan_config,omitempty" json:"qianfan_config,omitempty"`
	QwenConfig     *QwenConfig     `yaml:"qwen_config,omitempty" json:"qwen_config,omitempty"`
	OllamaConfig   *OllamaConfig   `yaml:"ollama_config,omitempty" json:"ollama_config,omitempty"`
	ArkConfig      *ArkConfig      `yaml:"ark_config,omitempty" json:"ark_config,omitempty"`
}

// OpenAIConfig 定义OpenAI特定的配置参数
type OpenAIConfig struct {
	// Timeout specifies the maximum duration to wait for API responses
	// If HTTPClient is set, Timeout will not be used.
	// Optional. Default: no timeout
	Timeout time.Duration `json:"timeout"`

	// HTTPClient specifies the client to send HTTP requests.
	// If HTTPClient is set, Timeout will not be used.
	// Optional. Default &http.Client{Timeout: Timeout}
	HTTPClient *http.Client `json:"http_client"`

	// PresencePenalty prevents repetition by penalizing tokens based on presence
	// Range: -2.0 to 2.0. Positive values increase likelihood of new topics
	// Optional. Default: 0
	PresencePenalty *float32 `json:"presence_penalty,omitempty"`

	// ResponseFormat specifies the format of the model's response
	// Optional. Use for structured outputs
	ResponseFormat *openai.ChatCompletionResponseFormat `json:"response_format,omitempty"`

	// Seed enables deterministic sampling for consistent outputs
	// Optional. Set for reproducible results
	Seed *int `json:"seed,omitempty"`

	// FrequencyPenalty prevents repetition by penalizing tokens based on frequency
	// Range: -2.0 to 2.0. Positive values decrease likelihood of repetition
	// Optional. Default: 0
	FrequencyPenalty *float32 `json:"frequency_penalty,omitempty"`

	// LogitBias modifies likelihood of specific tokens appearing in completion
	// Optional. Map token IDs to bias values from -100 to 100
	LogitBias map[string]int `json:"logit_bias,omitempty"`

	// User unique identifier representing end-user
	// Optional. Helps OpenAI monitor and detect abuse
	User *string `json:"user,omitempty"`
}

// AzureConfig 定义Azure OpenAI特定的配置参数
type AzureConfig struct {
	// Timeout specifies the maximum duration to wait for API responses
	// If HTTPClient is set, Timeout will not be used.
	// Optional. Default: no timeout
	Timeout time.Duration `json:"timeout"`

	// HTTPClient specifies the client to send HTTP requests.
	// If HTTPClient is set, Timeout will not be used.
	// Optional. Default &http.Client{Timeout: Timeout}
	HTTPClient *http.Client `json:"http_client"`

	// PresencePenalty prevents repetition by penalizing tokens based on presence
	// Range: -2.0 to 2.0. Positive values increase likelihood of new topics
	// Optional. Default: 0
	PresencePenalty *float32 `json:"presence_penalty,omitempty"`

	// ResponseFormat specifies the format of the model's response
	// Optional. Use for structured outputs
	ResponseFormat *openai.ChatCompletionResponseFormat `json:"response_format,omitempty"`

	// Seed enables deterministic sampling for consistent outputs
	// Optional. Set for reproducible results
	Seed *int `json:"seed,omitempty"`

	// FrequencyPenalty prevents repetition by penalizing tokens based on frequency
	// Range: -2.0 to 2.0. Positive values decrease likelihood of repetition
	// Optional. Default: 0
	FrequencyPenalty *float32 `json:"frequency_penalty,omitempty"`

	// LogitBias modifies likelihood of specific tokens appearing in completion
	// Optional. Map token IDs to bias values from -100 to 100
	LogitBias map[string]int `json:"logit_bias,omitempty"`

	// User unique identifier representing end-user
	// Optional. Helps OpenAI monitor and detect abuse
	User *string `json:"user,omitempty"`
}

// ClaudeConfig 定义Anthropic Claude特定的配置参数
type ClaudeConfig struct {
	// BaseURL is the custom API endpoint URL
	// Use this to specify a different API endpoint, e.g., for proxies or enterprise setups
	// Optional. Example: "https://custom-claude-api.example.com"
	BaseURL *string `yaml:"base_url" json:"base_url"`
	// APIKey is your Anthropic API key
	// Obtain from: https://console.anthropic.com/account/keys
	// Required
	APIKey string `yaml:"api_key" json:"api_key"`

	// TopK controls diversity by limiting the top K tokens to sample from
	// Optional. Example: int32(40)
	TopK *int32
}

// AWS BedrockConfig 定义Bedrock特定的配置参数
type BedrockConfig struct {
	ByBedrock bool `yaml:"by_bedrock" json:"by_bedrock" binding:"required"` // 必须使用Bedrock = true

	AccessKey       string `yaml:"access_key" json:"access_key"`               // Bedrock API 访问密钥
	SecretAccessKey string `yaml:"secret_access_key" json:"secret_access_key"` // Bedrock API 密钥
	Region          string `yaml:"region" json:"region"`                       // 区域

	// APIKey is your Anthropic API key
	// Obtain from: https://console.anthropic.com/account/keys
	// Required
	SessionToken string `yaml:"session_token" json:"session_token"` // Bedrock API 会话令牌（可选）
	// TopK controls diversity by limiting the top K tokens to sample from
	// Optional. Example: int32(40)
	TopK *int32
}

// GeminiConfig 定义Google Gemini特定的配置参数
type GeminiConfig struct {
	// Client is the Gemini API client instance
	// Required for making API calls to Gemini
	Client              *genai.Client
	APIEndpoint         string                 `yaml:"api_endpoint" json:"api_endpoint"`                   // API端点URL
	SafetySettings      map[string]interface{} `yaml:"safety_settings" json:"safety_settings"`             // 安全设置
	GenerationConfig    map[string]interface{} `yaml:"generation_config" json:"generation_config"`         // 生成配置
	TopK                *int32                 `yaml:"top_k" json:"top_k"`                                 // 控制多样性的TopK值
	EnableCodeExecution bool                   `yaml:"enable_code_execution" json:"enable_code_execution"` // 允许模型执行代码
	ResponseSchema      map[string]interface{} `yaml:"response_schema" json:"response_schema"`             // JSON响应的结构
}

// QianFanConfig 定义百度千帆特定的配置参数
type QianFanConfig struct {
	Endpoint   string `yaml:"endpoint" json:"endpoint"`       // 服务地址
	RetryCount int    `yaml:"retry_count" json:"retry_count"` // 重试次数
	Timeout    int    `yaml:"timeout" json:"timeout"`         // 超时时间
}

// QwenConfig 定义阿里通义千问特定的配置参数
type QwenConfig struct {
	Domain   string `yaml:"domain" json:"domain"`       // 域名
	AppID    string `yaml:"app_id" json:"app_id"`       // 应用ID
	AgentKey string `yaml:"agent_key" json:"agent_key"` // 访问密钥
}

// DeepSeekConfig 定义DeepSeek特定的配置参数
type DeepSeekConfig struct {
	BaseURL string `yaml:"base_url" json:"base_url"` // API基础URL
	Proxy   string `yaml:"proxy" json:"proxy"`       // 代理设置

	// APIKey是您的DeepSeek认证密钥
	// 必需参数
	APIKey string `yaml:"api_key" json:"api_key"`

	// Timeout指定等待API响应的最大持续时间
	// 可选。默认值：5分钟
	Timeout time.Duration `yaml:"timeout" json:"timeout,omitempty"`

	// PresencePenalty防止重复，通过基于存在性对tokens进行惩罚
	// 范围: [-2.0, 2.0]。正值增加新主题出现的可能性
	// 可选。默认值: 0
	PresencePenalty float32 `yaml:"presence_penalty" json:"presence_penalty,omitempty"`

	// ResponseFormatType指定模型响应的格式
	// 可选。用于结构化输出
	ResponseFormatType string `yaml:"response_format_type" json:"response_format_type,omitempty"`

	// FrequencyPenalty防止重复，通过基于频率对tokens进行惩罚
	// 范围: [-2.0, 2.0]。正值减少重复出现的可能性
	// 可选。默认值: 0
	FrequencyPenalty float32 `yaml:"frequency_penalty" json:"frequency_penalty,omitempty"`
}

// OllamaConfig 定义Ollama特定的配置参数
type OllamaConfig struct {
	Host   string `yaml:"host" json:"host"`     // 服务器地址
	Format string `yaml:"format" json:"format"` // 响应格式
}

// ArkConfig 定义火山引擎特定的配置参数
type ArkConfig struct {
	Region  string `yaml:"region" json:"region"`   // 区域
	Timeout int    `yaml:"timeout" json:"timeout"` // 超时设置
}

// MyVendorConfig 示例厂商配置
type MyVendorConfig struct {
	CustomField1 string `json:"custom_field1"`
	CustomField2 int    `json:"custom_field2"`
}
