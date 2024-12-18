package request

import "time"

// GetVersionInfoReq 获取版本信息请求值
type GetVersionInfoReq struct {
	IsStable bool `json:"is_stable" form:"is_stable"` // 是否只获取稳定版本
}

// CreateVersionReq 创建版本信息请求值
type CreateVersionReq struct {
	Version     string    `json:"version" binding:"required"`      // 版本号
	ReleaseTime time.Time `json:"release_time" binding:"required"` // 发布时间
	Description string    `json:"description"`                     // 版本描述
	DownloadUrl string    `json:"download_url" binding:"required"` // 下载地址
	IsStable    bool      `json:"is_stable"`                       // 是否为稳定版本
	ForceUpdate bool      `json:"force_update"`                    // 是否强制更新
}

// UpdateVersionReq 更新版本信息请求值
type UpdateVersionReq struct {
	ID          uint      `json:"id" binding:"required"` // 版本ID
	Version     string    `json:"version"`               // 版本号
	ReleaseTime time.Time `json:"release_time"`          // 发布时间
	Description string    `json:"description"`           // 版本描述
	DownloadUrl string    `json:"download_url"`          // 下载地址
	IsStable    bool      `json:"is_stable"`             // 是否为稳定版本
	ForceUpdate bool      `json:"force_update"`          // 是否强制更新
}

// DeleteVersionReq 删除版本信息请求值
type DeleteVersionReq struct {
	ID uint `json:"id" binding:"required"` // 版本ID
}

// GetVersionListReq 获取版本列表请求值
type GetVersionListReq struct {
	Page     int  `json:"page" form:"page"`           // 页码
	PageSize int  `json:"page_size" form:"page_size"` // 每页数量
	IsStable bool `json:"is_stable" form:"is_stable"` // 是否只获取稳定版本
}
