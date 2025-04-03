package ai

import (
	"github.com/gin-gonic/gin"
)

type AgentDataRouter struct{}

// InitAgentDataRouter 初始化智能体数据路由
func (s *AgentDataRouter) InitAgentDataRouter(privateGroup *gin.RouterGroup, publicGroup *gin.RouterGroup) {
	agentDataRouter := privateGroup.Group("v1/ai")
	{
		agentDataRouter.POST("upload", AgentDataApi.UploadFile)          // 上传智能体数据
		agentDataRouter.POST("upload_json", AgentDataApi.UploadJSONData) // 上传JSON格式的智能体数据
	}
}
