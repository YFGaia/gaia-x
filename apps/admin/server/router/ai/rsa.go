package ai

import (
	"github.com/gin-gonic/gin"
)

type RSARouter struct{}

func (r *RouterGroup) InitRSARouter(privateGroup, publicGroup *gin.RouterGroup) {
	v1Router := publicGroup.Group("v1/ai/rsa")
	{
		v1Router.POST("/encrypt", RSAApi.EncryptData) // 使用RSA加密数据
	}
}
