package ai

import (
	"net/http"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	modelAi "github.com/flipped-aurora/gin-vue-admin/server/model/ai"
	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	ServiceAi "github.com/flipped-aurora/gin-vue-admin/server/service/ai"
	"github.com/gin-gonic/gin"
	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// AgentApi 智能体接口
type AgentApi struct{}

// 创建智能体服务实例
var agentService = new(ServiceAi.AgentService)

// AgentChatRequest 智能体聊天请求参数
type AgentChatRequest struct {
	AgentId         uint                           `json:"agentId" binding:"required"`   // 智能体ID
	UserInput       string                         `json:"userInput" binding:"required"` // 用户输入
	ContextMessages []openai.ChatCompletionMessage `json:"contextMessages"`              // 上下文消息
	Stream          bool                           `json:"stream"`                       // 是否使用流式响应
}

// CreateAgentChatCompletion 创建智能体聊天完成
// @Tags AI
// @Summary 创建智能体聊天完成
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json,text/event-stream
// @Param data body ai.AgentChatRequest true "智能体聊天请求参数，stream=true时为流式响应"
// @Success 200 {object} response.Response{data=openai.ChatCompletionResponse} "非流式聊天响应"
// @Success 200 {object} string "流式聊天响应"
// @Router /v1/ai/agent/chat [post]
func (api *AgentApi) CreateAgentChatCompletion(c *gin.Context) {
	var req AgentChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数解析失败: "+err.Error(), c)
		return
	}

	// 如果是流式响应
	if req.Stream {
		// 设置流式响应头
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("Transfer-Encoding", "chunked")

		// 刷新缓冲区，确保头信息被发送
		c.Writer.Flush()

		// 调用服务
		_, err := agentService.CreateAgentChatCompletion(req.AgentId, req.UserInput, req.ContextMessages, true, c.Writer)
		if err != nil {
			global.GVA_LOG.Error("创建流式智能体聊天完成失败", zap.Error(err))
			// 由于已经开始流式响应，无法使用标准响应格式
			// 这里直接写入错误信息
			c.Writer.Write([]byte("错误: " + err.Error()))
			return
		}

		// 流式响应已经完成
		c.Status(http.StatusOK)
		return
	}

	// 非流式响应
	resp, err := agentService.CreateAgentChatCompletion(req.AgentId, req.UserInput, req.ContextMessages, false, nil)
	if err != nil {
		global.GVA_LOG.Error("创建智能体聊天完成失败", zap.Error(err))
		response.FailWithMessage("创建智能体聊天完成失败: "+err.Error(), c)
		return
	}

	response.OkWithData(resp, c)
}

// GetAvailableAgents 获取可用智能体列表
// @Tags AI
// @Summary 获取可用智能体列表
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json
// @Success 200 {object} response.Response{data=[]modelAi.AgentDataResponse} "可用智能体列表"
// @Router /v1/ai/agent/list [get]
func (api *AgentApi) GetAvailableAgents(c *gin.Context) {
	// 从数据库获取所有可用智能体
	var agents []modelAi.AgentData
	if err := global.GVA_DB.Find(&agents).Error; err != nil {
		global.GVA_LOG.Error("获取智能体列表失败", zap.Error(err))
		response.FailWithMessage("获取智能体列表失败: "+err.Error(), c)
		return
	}

	// 转换为响应格式
	var result []modelAi.AgentDataResponse
	for _, agent := range agents {
		result = append(result, modelAi.AgentDataResponse{
			ID:        agent.ID,
			Name:      agent.Name,
			Data:      agent.Data,
			CreatedAt: agent.CreatedAt,
			UpdatedAt: agent.UpdatedAt,
		})
	}

	response.OkWithData(result, c)
}
