package api

import (
	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	"github.com/flipped-aurora/gin-vue-admin/server/model/system"
	systemReq "github.com/flipped-aurora/gin-vue-admin/server/model/system/request"
	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/service"
	"github.com/flipped-aurora/gin-vue-admin/server/utils"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type DDLoginApi struct{}

// @Tags ddLogin
// @Summary 请手动填写接口功能
// @Produce  application/json
// @Success 200 {string} string "{"success":true,"data":{},"msg":"发送成功"}"
// @Router /ddLogin/login [get]
func (p *DDLoginApi) Login(c *gin.Context) {
	code, _ := c.GetQuery("code")
	token, _ := c.GetQuery("state")
	j := utils.NewJWT()
	// parseToken 解析token包含的信息
	claims, err := j.ParseToken(token)
	DDUserInfo, err := ddLoginPassPort.DDLogin(code)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		c.Abort()
		return
	}
	if claims != nil {
		// 绑定逻辑
		userId := claims.BaseClaims.ID
		if err := service.ServiceGroupApp.BindDD(DDUserInfo, userId); err != nil {
			c.Data(200, "text/html; charset=utf-8", []byte(errHtml(err.Error())))
		} else {
			c.Data(200, "text/html; charset=utf-8", []byte(bindHtml()))
		}
	} else {
		// 登录逻辑
		if userInfo, err := service.ServiceGroupApp.LoginOrRegister(DDUserInfo); err != nil {
			global.GVA_LOG.Error("失败!", zap.Error(err))
			c.Data(200, "text/html; charset=utf-8", []byte(errHtml(err.Error())))
		} else {
			AuthO2Login(userInfo, c)
		}
	}

}

func AuthO2Login(user system.SysUser, c *gin.Context) {
	j := &utils.JWT{SigningKey: []byte(global.GVA_CONFIG.JWT.SigningKey)} // 唯一签名
	claims := j.CreateClaims(systemReq.BaseClaims{
		UUID:        user.UUID,
		ID:          user.ID,
		NickName:    user.NickName,
		Username:    user.Username,
		AuthorityId: user.AuthorityId,
	})
	token, err := j.CreateToken(claims)
	if err != nil {
		c.Data(200, "text/html; charset=utf-8", []byte(errHtml(err.Error())))
	} else {
		c.Data(200, "text/html; charset=utf-8", []byte(loginHtml(user.NickName, token)))
	}
}
