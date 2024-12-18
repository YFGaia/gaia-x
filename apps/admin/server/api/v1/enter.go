package v1

import (
	"github.com/flipped-aurora/gin-vue-admin/server/api/v1/ai"
	"github.com/flipped-aurora/gin-vue-admin/server/api/v1/example"
	"github.com/flipped-aurora/gin-vue-admin/server/api/v1/gaia_x"
	"github.com/flipped-aurora/gin-vue-admin/server/api/v1/system"
)

var ApiGroupApp = new(ApiGroup)

type ApiGroup struct {
	SystemApiGroup  system.ApiGroup
	ExampleApiGroup example.ApiGroup
	AiApiGroup      ai.ApiGroup
	GaiaXApiGroup   gaia_x.ApiGroup
}
