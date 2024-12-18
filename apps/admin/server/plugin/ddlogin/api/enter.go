package api

import "github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/passport"

type ApiGroup struct {
	DDLoginApi
}

var ApiGroupApp = new(ApiGroup)

var (
	ddLoginPassPort = new(passport.DDLoginPassport)
)
