package router

import (
	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/api"
	"github.com/gin-gonic/gin"
)

type DDLoginRouter struct {
}

func (s *DDLoginRouter) InitDDLoginRouter(Router *gin.RouterGroup) {
	plugRouter := Router
	plugApi := api.ApiGroupApp.DDLoginApi
	{
		plugRouter.GET("login", plugApi.Login)
	}
}
