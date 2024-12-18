package gaia_x

import (
	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/request"
	"github.com/gin-gonic/gin"
)

type UsageReportExtendApi struct{}

// CreateUsageReport 创建用户使用信息上报
// @Tags UsageReportExtend
// @Summary 创建用户使用信息上报
// @accept application/json
// @Produce application/json
// @Param data body request.CreateUsageReportReq true "上报数据"
// @Success 200 {object} response.Response{msg=string} "上报成功"
// @Router /gaia-x/v1/usage-report/createUsageReport [post]
func (api *UsageReportExtendApi) CreateUsageReport(c *gin.Context) {
	var req request.CreateUsageReportReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	if err := gaiaXusageReportService.CreateUsageReport(req); err != nil {
		response.FailWithMessage("上报失败:"+err.Error(), c)
		return
	}
	response.OkWithMessage("上报成功", c)
}

// GetUsageReportList 获取用户使用信息上报列表
// @Tags UsageReportExtend
// @Summary 获取用户使用信息上报列表
// @accept application/json
// @Produce application/json
// @Param page query int false "页码"
// @Param pageSize query int false "每页数量"
// @Param startTime query string false "开始时间"
// @Param endTime query string false "结束时间"
// @Param searchText query string false "搜索文本"
// @Success 200 {object} response.Response{data=response.GetUsageReportListRes,msg=string} "获取成功"
// @Router /gaia-x/v1/usage-report/getUsageReportList [get]
func (api *UsageReportExtendApi) GetUsageReportList(c *gin.Context) {
	var req request.GetUsageReportListReq
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

	res, err := gaiaXusageReportService.GetUsageReportList(req)
	if err != nil {
		response.FailWithMessage("获取失败:"+err.Error(), c)
		return
	}
	response.OkWithDetailed(res, "获取成功", c)
}
