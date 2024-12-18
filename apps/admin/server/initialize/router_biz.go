package initialize

import (
	"github.com/flipped-aurora/gin-vue-admin/server/router"
	"github.com/gin-gonic/gin"
)

// 占位方法，保证文件可以正确加载，避免go空变量检测报错，请勿删除。
func holder(routers ...*gin.RouterGroup) {
	_ = routers
	_ = router.RouterGroupApp
}

func initBizRouter(routers ...*gin.RouterGroup) {
	privateGroup := routers[0]
	publicGroup := routers[1]

	aiRouter := router.RouterGroupApp.Ai
	{
		aiRouter.InitChatRouter(privateGroup, publicGroup) // AI路由
		aiRouter.InitRSARouter(privateGroup, publicGroup)  // RSA加密路由
	}

	gaiaXRouter := router.RouterGroupApp.GaiaX
	{
		gaiaXRouter.InitGaiaXRouter(privateGroup, publicGroup)
		gaiaXRouter.InitGaiaXVersionRouter(privateGroup, publicGroup)
		gaiaXRouter.InitGaiaXUsageReportRouter(privateGroup, publicGroup)
	}

	holder(publicGroup, privateGroup)
}
