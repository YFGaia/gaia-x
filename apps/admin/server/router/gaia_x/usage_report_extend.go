package gaia_x

import (
	"github.com/gin-gonic/gin"
)

type GaiaXUsageReportRouter struct{}

// InitGaiaXUsageReportRouter 初始化用户使用信息上报路由
func (r *GaiaXUsageReportRouter) InitGaiaXUsageReportRouter(Router *gin.RouterGroup, PublicRouter *gin.RouterGroup) {
	// 需要权限验证的路由
	privateRouter := Router.Group("gaia-x/v1/usage-report")
	{
		privateRouter.GET("getUsageReportList", usageReportExtendApi.GetUsageReportList) // 获取用户使用信息上报列表
		privateRouter.POST("createUsageReport", usageReportExtendApi.CreateUsageReport)  // 创建用户使用信息上报
	}
}
