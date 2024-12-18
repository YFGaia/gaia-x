package request

import "time"

// CreateUsageReportReq 创建用户使用信息上报请求
type CreateUsageReportReq struct {
	ReportData string `json:"report_data" binding:"required"` // 上报数据JSON字符串
}

// GetUsageReportListReq 获取用户使用信息上报列表请求
type GetUsageReportListReq struct {
	Page       int       `json:"page" form:"page"`               // 页码
	PageSize   int       `json:"page_size" form:"page_size"`     // 每页数量
	StartTime  time.Time `json:"start_time" form:"start_time"`   // 开始时间
	EndTime    time.Time `json:"end_time" form:"end_time"`       // 结束时间
	SearchText string    `json:"search_text" form:"search_text"` // 搜索文本
}
