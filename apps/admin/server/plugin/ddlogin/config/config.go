package config

type DDLogin struct {
	AgentID     string `mapstructure:"agentID" json:"agentID" yaml:"agentID"`             // 钉钉应用AgentID
	AppSecret   string `mapstructure:"appSecret" json:"appSecret" yaml:"appSecret"`       // 钉钉应用AppSecret
	AppKey      string `mapstructure:"appKey" json:"appKey" yaml:"appKey"`                // 钉钉应用AppKey
	AuthorityID uint   `mapstructure:"authorityID" json:"authorityID" yaml:"authorityID"` // 用户注册默认角色ID
}
