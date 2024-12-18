package router

import (
	"github.com/flipped-aurora/gin-vue-admin/server/router/ai"
	"github.com/flipped-aurora/gin-vue-admin/server/router/example"
	"github.com/flipped-aurora/gin-vue-admin/server/router/gaia_x"
	"github.com/flipped-aurora/gin-vue-admin/server/router/system"
)

var RouterGroupApp = new(RouterGroup)

type RouterGroup struct {
	System  system.RouterGroup
	Example example.RouterGroup
	Ai      ai.RouterGroup
	GaiaX   gaia_x.RouterGroup
}
