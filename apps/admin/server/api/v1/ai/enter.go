package ai

import "github.com/flipped-aurora/gin-vue-admin/server/service"

type ApiGroup struct {
	ChatApi
	RSAApi
}

var chatService = service.ServiceGroupApp.AiServiceGroup.ChatService
