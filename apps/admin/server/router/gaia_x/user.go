package gaia_x

import (
	"github.com/gin-gonic/gin"
)

type GaiaXRouter struct{}

// InitGaiaXRouter 初始化 GaiaX应用API 路由信息
func (d *GaiaXRouter) InitGaiaXRouter(Router *gin.RouterGroup, PublicRouter *gin.RouterGroup) {
	gaiaXRouterWithoutRecord := PublicRouter.Group("gaia-x/v1/user")
	{
		gaiaXRouterWithoutRecord.GET("getUserInfo", userApi.GetUserInfo) // 获取用户信息
	}
}
