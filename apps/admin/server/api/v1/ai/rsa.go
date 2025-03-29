package ai

import (
	einox "github.com/YFGaia/eino-x"
	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	ServiceAi "github.com/flipped-aurora/gin-vue-admin/server/service/ai"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RSAApi RSA加密相关接口
type RSAApi struct{}

// RSAEncryptRequest RSA加密请求参数
type RSAEncryptRequest struct {
	Key string `json:"key" binding:"required"` // 需要加密的内容
}

// RSAEncryptResponse RSA加密响应参数
type RSAEncryptResponse struct {
	EncryptedData string `json:"encryptedData"` // 加密后的内容
}

// EncryptData 使用RSA加密数据
// @Tags AI
// @Summary 使用RSA加密数据
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json
// @Param data body ai.RSAEncryptRequest true "需要加密的数据"
// @Success 200 {object} response.Response{data=ai.RSAEncryptResponse} "返回加密后的数据"
// @Router /v1/ai/rsa/encrypt [post]
func (api *RSAApi) EncryptData(c *gin.Context) {
	var req RSAEncryptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数解析失败: "+err.Error(), c)
		return
	}

	// 初始化环境变量
	ServiceAi.InitEnvironment()

	// 获取RSA加密函数
	encryptFunc, _, err := einox.InitRSAKeyManager()
	if err != nil {
		global.GVA_LOG.Error("初始化RSA密钥管理器失败", zap.Error(err))
		response.FailWithMessage("初始化RSA密钥失败: "+err.Error(), c)
		return
	}

	// 加密数据
	encryptedData, err := encryptFunc(req.Key)
	if err != nil {
		global.GVA_LOG.Error("RSA加密数据失败", zap.Error(err))
		response.FailWithMessage("加密数据失败: "+err.Error(), c)
		return
	}

	// 返回加密后的数据
	resp := RSAEncryptResponse{
		EncryptedData: encryptedData,
	}

	response.OkWithData(resp, c)
}
