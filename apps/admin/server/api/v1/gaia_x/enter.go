package gaia_x

import "github.com/flipped-aurora/gin-vue-admin/server/service"

type ApiGroup struct {
	UserApi
	VersionApi
	UsageReportExtendApi
}

var (
	gaiaXUserService        = service.ServiceGroupApp.GaiaXServiceGroup.GaiaXUserService
	gaiaXVersionService     = service.ServiceGroupApp.GaiaXServiceGroup.GaiaXVersionService
	gaiaXusageReportService = service.ServiceGroupApp.GaiaXServiceGroup.GaiaXUsageReportService
)
