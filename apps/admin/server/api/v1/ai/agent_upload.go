package ai

import (
	"encoding/json"
	"io/ioutil"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	aiModel "github.com/flipped-aurora/gin-vue-admin/server/model/ai"
	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	aiService "github.com/flipped-aurora/gin-vue-admin/server/service/ai"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type AgentDataApi struct{}

// UploadFile 上传智能体数据文件
// @Tags AI
// @Summary 上传智能体数据文件
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json
// @Param file formData file true "智能体数据文件"
// @Param name formData string true "智能体名称"
// @Success 200 {object} response.Response{data=ai.AgentDataResponse} "上传响应"
// @Router /v1/ai/upload [post]
func (api *AgentDataApi) UploadFile(c *gin.Context) {
	// 创建服务实例
	agentDataService := new(aiService.AgentDataService)

	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		global.GVA_LOG.Error("获取上传文件失败", zap.Error(err))
		response.FailWithMessage("获取上传文件失败: "+err.Error(), c)
		return
	}

	global.GVA_LOG.Info("成功获取上传文件", zap.String("filename", file.Filename), zap.Int64("size", file.Size))

	// 打开文件
	f, err := file.Open()
	if err != nil {
		global.GVA_LOG.Error("打开上传文件失败", zap.Error(err))
		response.FailWithMessage("打开上传文件失败: "+err.Error(), c)
		return
	}
	defer f.Close()

	// 读取文件内容
	content, err := ioutil.ReadAll(f)
	if err != nil {
		global.GVA_LOG.Error("读取上传文件内容失败", zap.Error(err))
		response.FailWithMessage("读取上传文件内容失败: "+err.Error(), c)
		return
	}

	global.GVA_LOG.Info("成功读取文件内容", zap.Int("content_length", len(content)))

	// 调用服务层解析YAML内容
	jsonFriendlyData, err := agentDataService.ParseYAMLContent(content)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	req := aiModel.AgentDataRequest{
		Data: jsonFriendlyData,
	}

	resp, err := agentDataService.UploadFile(req)
	if err != nil {
		global.GVA_LOG.Error("上传智能体数据失败", zap.Error(err))
		response.FailWithMessage("上传智能体数据失败: "+err.Error(), c)
		return
	}

	response.OkWithData(resp, c)
}

// UploadJSONData 上传智能体数据（JSON格式）
// @Tags AI
// @Summary 上传智能体数据（JSON格式）
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json
// @Param request body map[string]interface{} true "请求数据，包含name和data字段"
// @Success 200 {object} response.Response{data=ai.AgentDataResponse} "上传响应"
// @Router /v1/ai/upload-json [post]
func (api *AgentDataApi) UploadJSONData(c *gin.Context) {
	// 创建服务实例
	agentDataService := new(aiService.AgentDataService)

	// 从请求体中获取JSON数据
	var requestData struct {
		Data map[string]interface{} `json:"data" binding:"required"`
	}

	err := c.ShouldBindJSON(&requestData)
	if err != nil {
		global.GVA_LOG.Error("解析JSON数据失败", zap.Error(err))
		response.FailWithMessage("解析JSON数据失败: "+err.Error(), c)
		return
	}

	global.GVA_LOG.Info("成功获取JSON数据", zap.Int("fields_count", len(requestData.Data)))

	// 验证数据可以序列化为 JSON
	_, err = json.Marshal(requestData.Data)
	if err != nil {
		global.GVA_LOG.Error("验证JSON序列化失败", zap.Error(err))
		response.FailWithMessage("验证JSON序列化失败: "+err.Error(), c)
		return
	}

	global.GVA_LOG.Info("JSON序列化验证成功")

	// 调用服务保存智能体数据
	req := aiModel.AgentDataRequest{
		Data: requestData.Data,
	}

	resp, err := agentDataService.UploadFile(req)
	if err != nil {
		global.GVA_LOG.Error("上传智能体数据失败", zap.Error(err))
		response.FailWithMessage("上传智能体数据失败: "+err.Error(), c)
		return
	}

	response.OkWithData(resp, c)
}
