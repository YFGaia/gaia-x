package response

import (
	"time"
)

// GetVersionInfoRes 获取版本信息响应
type GetVersionInfoRes struct {
	ID          uint      `json:"id"`
	Version     string    `json:"version"`      // 版本号
	ReleaseTime time.Time `json:"release_time"` // 发布时间
	Description string    `json:"description"`  // 版本描述
	DownloadUrl string    `json:"download_url"` // 下载地址
	IsStable    bool      `json:"is_stable"`    // 是否为稳定版本
	ForceUpdate bool      `json:"force_update"` // 是否强制更新
}

// GetVersionListRes 获取版本列表响应
type GetVersionListRes struct {
	List     []GetVersionInfoRes `json:"list"`     // 版本列表
	Total    int64               `json:"total"`    // 总数
	Page     int                 `json:"page"`     // 当前页码
	PageSize int                 `json:"pageSize"` // 每页数量
}
