package gaia_x

import (
	"time"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/request"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/response"
)

type GaiaXUsageReportService struct{}

// CreateUsageReport 创建用户使用信息上报
// @author: [YourName]
// @function: CreateUsageReport
// @description: 创建用户使用信息上报
// @param: req request.CreateUsageReportReq
// @return: err error
func (s *GaiaXUsageReportService) CreateUsageReport(req request.CreateUsageReportReq) error {
	usageReport := gaia_x.UsageReportExtend{
		ReportData: req.ReportData,
		ReportTime: time.Now(),
	}

	return global.GVA_DB.Create(&usageReport).Error
}

// GetUsageReportList 获取用户使用信息上报列表
// @author: [YourName]
// @function: GetUsageReportList
// @description: 获取用户使用信息上报列表
// @param: req request.GetUsageReportListReq
// @return: res response.GetUsageReportListRes, err error
func (s *GaiaXUsageReportService) GetUsageReportList(req request.GetUsageReportListReq) (res response.GetUsageReportListRes, err error) {
	var usageReports []gaia_x.UsageReportExtend
	query := global.GVA_DB.Model(&gaia_x.UsageReportExtend{})

	// 添加时间范围筛选
	if !req.StartTime.IsZero() {
		query = query.Where("report_time >= ?", req.StartTime)
	}
	if !req.EndTime.IsZero() {
		query = query.Where("report_time <= ?", req.EndTime)
	}

	// 添加搜索文本筛选
	if req.SearchText != "" {
		query = query.Where("report_data LIKE ?", "%"+req.SearchText+"%")
	}

	// 获取总数
	var total int64
	if err = query.Count(&total).Error; err != nil {
		return
	}

	// 设置默认值
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err = query.Order("report_time desc").Offset(offset).Limit(req.PageSize).Find(&usageReports).Error; err != nil {
		return
	}

	// 转换为响应结构
	list := make([]response.UsageReportInfoRes, len(usageReports))
	for i, v := range usageReports {
		list[i] = response.UsageReportInfoRes{
			ID:         v.ID,
			ReportData: v.ReportData,
			ReportTime: v.ReportTime,
			CreatedAt:  v.CreatedAt,
		}
	}

	res = response.GetUsageReportListRes{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}

	return
}
