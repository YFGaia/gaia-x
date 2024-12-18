package gaia_x

import api "github.com/flipped-aurora/gin-vue-admin/server/api/v1"

type RouterGroup struct {
	GaiaXRouter
	GaiaXVersionRouter
	GaiaXUsageReportRouter
}

var (
	userApi              = api.ApiGroupApp.GaiaXApiGroup.UserApi
	versionApi           = api.ApiGroupApp.GaiaXApiGroup.VersionApi
	usageReportExtendApi = api.ApiGroupApp.GaiaXApiGroup.UsageReportExtendApi
)
