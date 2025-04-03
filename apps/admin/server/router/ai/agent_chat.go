package ai

import (
	"github.com/gin-gonic/gin"
)

type AgentRouter struct{}

// InitAgentRouter 初始化智能体路由
func (s *AgentRouter) InitAgentRouter(PrivateGroup *gin.RouterGroup, PublicGroup *gin.RouterGroup) {
	// 公共路由
	agentPublicRouter := PublicGroup.Group("v1/ai/agent")
	{
		agentPublicRouter.GET("list", AgentApi.GetAvailableAgents)         // 获取可用智能体列表
		agentPublicRouter.POST("chat", AgentApi.CreateAgentChatCompletion) // 创建智能体聊天
	}
}
