package ai

import (
	"github.com/gin-gonic/gin"
)

type ChatRouter struct{}

func (r *RouterGroup) InitChatRouter(privateGroup, publicGroup *gin.RouterGroup) {
	v1Router := publicGroup.Group("v1")
	{
		v1Router.POST("/chat/completion", ChatApi.CreateChatCompletion) // 创建聊天完成（支持流式和非流式）
	}
}
