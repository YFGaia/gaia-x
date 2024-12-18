package config

// AIConfig 是AI服务的配置
type AIConfig struct {
	Provider string                 `mapstructure:"provider" json:"provider" yaml:"provider"` // AI供应商，如openai, azure, anthropic等
	OpenAI   OpenAIConf             `mapstructure:"openai" json:"openai" yaml:"openai"`       // OpenAI配置
	Azure    AzureConf              `mapstructure:"azure" json:"azure" yaml:"azure"`          // Azure OpenAI配置
	DeepSeek DeepSeekConf           `mapstructure:"deepseek" json:"deepseek" yaml:"deepseek"` // DeepSeek配置
	Extra    map[string]interface{} `mapstructure:"extra" json:"extra" yaml:"extra"`
}

// OpenAIConf OpenAI配置
type OpenAIConf struct {
	APIKey         string            `mapstructure:"api-key" json:"api-key" yaml:"api-key"`                         // OpenAI API密钥
	BaseURL        string            `mapstructure:"base-url" json:"base-url" yaml:"base-url"`                      // API基础URL，默认为https://api.openai.com/v1
	Organization   string            `mapstructure:"organization" json:"organization" yaml:"organization"`          // 组织ID
	Model          string            `mapstructure:"model" json:"model" yaml:"model"`                               // 默认模型，如gpt-3.5-turbo
	Temperature    float64           `mapstructure:"temperature" json:"temperature" yaml:"temperature"`             // 温度参数，控制随机性
	MaxTokens      int               `mapstructure:"max-tokens" json:"max-tokens" yaml:"max-tokens"`                // 最大生成的token数
	Timeout        int               `mapstructure:"timeout" json:"timeout" yaml:"timeout"`                         // 超时时间（秒）
	ProxyURL       string            `mapstructure:"proxy-url" json:"proxy-url" yaml:"proxy-url"`                   // 代理URL
	DefaultHeaders map[string]string `mapstructure:"default-headers" json:"default-headers" yaml:"default-headers"` // 默认请求头
}

// AzureConf Azure OpenAI配置
type AzureConf struct {
	APIKey         string  `mapstructure:"api-key" json:"api-key" yaml:"api-key"`                         // Azure API密钥
	Endpoint       string  `mapstructure:"endpoint" json:"endpoint" yaml:"endpoint"`                      // Azure端点URL
	DeploymentName string  `mapstructure:"deployment-name" json:"deployment-name" yaml:"deployment-name"` // 部署名称
	APIVersion     string  `mapstructure:"api-version" json:"api-version" yaml:"api-version"`             // API版本
	Model          string  `mapstructure:"model" json:"model" yaml:"model"`                               // 默认模型
	Temperature    float64 `mapstructure:"temperature" json:"temperature" yaml:"temperature"`             // 温度参数
	MaxTokens      int     `mapstructure:"max-tokens" json:"max-tokens" yaml:"max-tokens"`                // 最大生成的token数
	Timeout        int     `mapstructure:"timeout" json:"timeout" yaml:"timeout"`                         // 超时时间（秒）
	ProxyURL       string  `mapstructure:"proxy-url" json:"proxy-url" yaml:"proxy-url"`                   // 代理URL
}

// DeepSeekConf DeepSeek配置
type DeepSeekConf struct {
	APIKey         string            `mapstructure:"api-key" json:"api-key" yaml:"api-key"`                         // DeepSeek API密钥
	BaseURL        string            `mapstructure:"base-url" json:"base-url" yaml:"base-url"`                      // API基础URL
	Model          string            `mapstructure:"model" json:"model" yaml:"model"`                               // 默认模型
	Temperature    float64           `mapstructure:"temperature" json:"temperature" yaml:"temperature"`             // 温度参数，控制随机性
	MaxTokens      int               `mapstructure:"max-tokens" json:"max-tokens" yaml:"max-tokens"`                // 最大生成的token数
	Timeout        int               `mapstructure:"timeout" json:"timeout" yaml:"timeout"`                         // 超时时间（秒）
	ProxyURL       string            `mapstructure:"proxy-url" json:"proxy-url" yaml:"proxy-url"`                   // 代理URL
	DefaultHeaders map[string]string `mapstructure:"default-headers" json:"default-headers" yaml:"default-headers"` // 默认请求头
}
