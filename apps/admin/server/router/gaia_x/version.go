package gaia_x

import (
	"github.com/gin-gonic/gin"
)

type GaiaXVersionRouter struct{}

// InitGaiaXVersionRouter 初始化 GaiaX应用版本API 路由信息
func (d *GaiaXVersionRouter) InitGaiaXVersionRouter(Router *gin.RouterGroup, PublicRouter *gin.RouterGroup) {
	// 需要权限验证的路由
	privateVersionRouter := Router.Group("gaia-x/v1/version")
	{
		privateVersionRouter.GET("getVersionInfo", versionApi.GetVersionInfo)  // 获取版本信息
		privateVersionRouter.POST("createVersion", versionApi.CreateVersion)   // 创建版本
		privateVersionRouter.PUT("updateVersion", versionApi.UpdateVersion)    // 更新版本
		privateVersionRouter.DELETE("deleteVersion", versionApi.DeleteVersion) // 删除版本
		privateVersionRouter.GET("getVersionList", versionApi.GetVersionList)  // 获取版本列表
	}
}
