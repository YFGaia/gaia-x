package service

import (
	"github.com/flipped-aurora/gin-vue-admin/server/service/ai"
	"github.com/flipped-aurora/gin-vue-admin/server/service/example"
	"github.com/flipped-aurora/gin-vue-admin/server/service/gaia_x"
	"github.com/flipped-aurora/gin-vue-admin/server/service/system"
)

var ServiceGroupApp = new(ServiceGroup)

type ServiceGroup struct {
	SystemServiceGroup  system.ServiceGroup
	ExampleServiceGroup example.ServiceGroup
	AiServiceGroup      ai.ServiceGroup
	GaiaXServiceGroup   gaia_x.ServiceGroup
}
