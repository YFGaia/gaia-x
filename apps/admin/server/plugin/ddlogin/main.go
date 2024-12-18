package ddlogin

import (
	global2 "github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/global"
	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/model"
	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/router"
	"github.com/gin-gonic/gin"
)

type DDLoginPlugin struct {
}

func CreateDDLoginPlug(AgentID, AppSecret, AppKey string, AuthorityID uint, engine *gin.Engine) *DDLoginPlugin {
	global.GlobalConfig.AgentID = AgentID
	global.GlobalConfig.AppKey = AppKey
	global.GlobalConfig.AppSecret = AppSecret
	global.GlobalConfig.AuthorityID = AuthorityID

	global2.GVA_DB.AutoMigrate(model.DDUserInfo{})
	return &DDLoginPlugin{}
}

func (*DDLoginPlugin) Register(group *gin.RouterGroup) {
	router.RouterGroupApp.InitDDLoginRouter(group)
}

func (*DDLoginPlugin) RouterPath() string {
	return "ddLogin"
}
