package ai

import api "github.com/flipped-aurora/gin-vue-admin/server/api/v1"

type RouterGroup struct {
	ChatRouter
	RSARouter
}

var (
	ChatApi = api.ApiGroupApp.AiApiGroup.ChatApi
	RSAApi  = api.ApiGroupApp.AiApiGroup.RSAApi
)
