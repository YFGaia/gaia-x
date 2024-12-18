package gaia_x

import (
	"time"

	"gorm.io/gorm"
)

// UsageReportExtend 用户使用信息上报表
type UsageReportExtend struct {
	gorm.Model
	ReportData string    `json:"report_data" gorm:"column:report_data;type:text;comment:上报数据JSON字符串"` // 上报数据JSON字符串
	ReportTime time.Time `json:"report_time" gorm:"column:report_time;comment:上报时间"`                  // 上报时间
}

// TableName 设置表名
func (u *UsageReportExtend) TableName() string {
	return "usage_report_extend"
}
