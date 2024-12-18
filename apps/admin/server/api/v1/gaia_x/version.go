package gaia_x

import (
	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/request"
	"github.com/gin-gonic/gin"
)

type VersionApi struct{}

// GetVersionInfo 获取版本信息
// @Tags GaiaXVersion
// @Summary 获取版本信息
// @accept application/json
// @Produce application/json
// @Param isStable query bool false "是否只获取稳定版本"
// @Success 200 {object} response.Response{data=response.GetVersionInfoRes,msg=string} "获取成功"
// @Router /gaia-x/v1/version/getVersionInfo [get]
func (api *VersionApi) GetVersionInfo(c *gin.Context) {
	var req request.GetVersionInfoReq
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	res, err := gaiaXVersionService.GetVersionInfo(req)
	if err != nil {
		response.FailWithMessage("获取失败:"+err.Error(), c)
		return
	}
	response.OkWithDetailed(res, "获取成功", c)
}

// CreateVersion 创建版本信息
// @Tags GaiaXVersion
// @Summary 创建版本信息
// @accept application/json
// @Produce application/json
// @Param data body request.CreateVersionReq true "版本信息"
// @Success 200 {object} response.Response{msg=string} "创建成功"
// @Router /gaia-x/v1/version/createVersion [post]
func (api *VersionApi) CreateVersion(c *gin.Context) {
	var req request.CreateVersionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	if err := gaiaXVersionService.CreateVersion(req); err != nil {
		response.FailWithMessage("创建失败:"+err.Error(), c)
		return
	}
	response.OkWithMessage("创建成功", c)
}

// UpdateVersion 更新版本信息
// @Tags GaiaXVersion
// @Summary 更新版本信息
// @accept application/json
// @Produce application/json
// @Param data body request.UpdateVersionReq true "版本信息"
// @Success 200 {object} response.Response{msg=string} "更新成功"
// @Router /gaia-x/v1/version/updateVersion [put]
func (api *VersionApi) UpdateVersion(c *gin.Context) {
	var req request.UpdateVersionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	if err := gaiaXVersionService.UpdateVersion(req); err != nil {
		response.FailWithMessage("更新失败:"+err.Error(), c)
		return
	}
	response.OkWithMessage("更新成功", c)
}

// DeleteVersion 删除版本信息
// @Tags GaiaXVersion
// @Summary 删除版本信息
// @accept application/json
// @Produce application/json
// @Param data body request.DeleteVersionReq true "版本ID"
// @Success 200 {object} response.Response{msg=string} "删除成功"
// @Router /gaia-x/v1/version/deleteVersion [delete]
func (api *VersionApi) DeleteVersion(c *gin.Context) {
	var req request.DeleteVersionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	if err := gaiaXVersionService.DeleteVersion(req); err != nil {
		response.FailWithMessage("删除失败:"+err.Error(), c)
		return
	}
	response.OkWithMessage("删除成功", c)
}

// GetVersionList 获取版本列表
// @Tags GaiaXVersion
// @Summary 获取版本列表
// @accept application/json
// @Produce application/json
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param isStable query bool false "是否只获取稳定版本"
// @Success 200 {object} response.Response{data=response.GetVersionListRes,msg=string} "获取成功"
// @Router /gaia-x/v1/version/getVersionList [get]
func (api *VersionApi) GetVersionList(c *gin.Context) {
	var req request.GetVersionListReq
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	// 设置默认值
	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 10
	}

	res, err := gaiaXVersionService.GetVersionList(req)
	if err != nil {
		response.FailWithMessage("获取失败:"+err.Error(), c)
		return
	}
	response.OkWithDetailed(res, "获取成功", c)
}
