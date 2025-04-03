package ai

import "github.com/flipped-aurora/gin-vue-admin/server/service"

type ApiGroup struct {
	ChatApi
	RSAApi
	AgentDataApi
	AgentApi
}

var (
	chatService      = service.ServiceGroupApp.AiServiceGroup.ChatService
	agentDataService = service.ServiceGroupApp.AiServiceGroup.AgentDataService
)
