package ai

import (
	"github.com/gaia-x/server/service/llmadapter"
	"net/http"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ChatApi struct{}

// CreateChatCompletion 创建聊天完成
// @Tags AI
// @Summary 创建聊天完成
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json,text/event-stream
// @Param data body ai.ChatRequest true "聊天请求参数，stream=true时为流式响应"
// @Success 200 {object} response.Response{data=ai.ChatResponse} "非流式聊天响应"
// @Success 200 {object} ai.StreamResponse "流式聊天响应"
// @Router /v1/chat/completion [post]
func (api *ChatApi) CreateChatCompletion(c *gin.Context) {
	var req llmadapter.ChatRequest
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
		_, err := chatService.CreateChatCompletion(req, c.Writer)
		if err != nil {
			global.GVA_LOG.Error("创建流式聊天完成失败", zap.Error(err))
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
	resp, err := chatService.CreateChatCompletion(req, nil)
	if err != nil {
		global.GVA_LOG.Error("创建聊天完成失败", zap.Error(err))
		response.FailWithMessage("创建聊天完成失败: "+err.Error(), c)
		return
	}

	response.OkWithData(resp, c)
}
