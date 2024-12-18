package response

import (
	"time"
)

// UsageReportInfoRes 用户使用信息上报响应
type UsageReportInfoRes struct {
	ID         uint      `json:"id"`
	ReportData string    `json:"report_data"` // 上报数据JSON字符串
	ReportTime time.Time `json:"report_time"` // 上报时间
	CreatedAt  time.Time `json:"created_at"`  // 创建时间
}

// GetUsageReportListRes 获取用户使用信息上报列表响应
type GetUsageReportListRes struct {
	List     []UsageReportInfoRes `json:"list"`     // 上报列表
	Total    int64                `json:"total"`    // 总数
	Page     int                  `json:"page"`     // 当前页码
	PageSize int                  `json:"pageSize"` // 每页数量
}
