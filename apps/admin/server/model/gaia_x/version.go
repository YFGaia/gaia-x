package gaia_x

import (
	"time"

	"gorm.io/gorm"
)

// Version 版本信息表
type Version struct {
	gorm.Model
	Version     string    `json:"version" gorm:"column:version;comment:版本号"`              // 版本号
	ReleaseTime time.Time `json:"release_time" gorm:"column:release_time;comment:发布时间"`   // 发布时间
	Description string    `json:"description" gorm:"column:description;comment:版本描述"`     // 版本描述
	DownloadUrl string    `json:"download_url" gorm:"column:download_url;comment:下载地址"`   // 下载地址
	IsStable    bool      `json:"is_stable" gorm:"column:is_stable;comment:是否为稳定版本"`      // 是否为稳定版本
	ForceUpdate bool      `json:"force_update" gorm:"column:force_update;comment:是否强制更新"` // 是否强制更新
}

// TableName 设置表名
func (v *Version) TableName() string {
	return "gaia_x_versions"
}
