package gaia_x

import (
	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/request"
	"github.com/gin-gonic/gin"
)

type UserApi struct{}

// GetUserInfo 获取用户信息
// @Tags GaiaXUser
// @Summary 获取用户信息
// @accept application/json
// @Produce application/json
// @Success 200 {object} response.Response{data=response.GetUserInfoRes,msg=string} "获取成功"
// @Router /gaia-x/user/getUserInfo [get]
func (userApi *UserApi) GetUserInfo(c *gin.Context) {
	// 获取header头中 Authorization
	var req request.GetUserInfoReq
	req.Code = c.GetHeader("Authorization")
	if req.Code == "" {
		response.FailWithMessage("code值为空，参数错误", c)
		return
	}

	res, err := gaiaXUserService.GetUserInfo(req)
	if err != nil {
		response.FailWithMessage("获取失败:"+err.Error(), c)
		return
	}
	response.OkWithDetailed(res, "获取成功", c)
}
