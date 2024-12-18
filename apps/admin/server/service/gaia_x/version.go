package gaia_x

import (
	"errors"

	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/request"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/response"
	"gorm.io/gorm"
)

type GaiaXVersionService struct{}

// GetVersionInfo 获取版本信息
func (s *GaiaXVersionService) GetVersionInfo(req request.GetVersionInfoReq) (res response.GetVersionInfoRes, err error) {
	var version gaia_x.Version
	query := global.GVA_DB.Model(&gaia_x.Version{})

	if req.IsStable {
		query = query.Where("is_stable = ?", true)
	}

	// 获取最新版本
	err = query.Order("release_time desc").First(&version).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return res, errors.New("未找到版本信息")
		}
		return res, err
	}

	// 转换为响应结构
	res = response.GetVersionInfoRes{
		ID:          version.ID,
		Version:     version.Version,
		ReleaseTime: version.ReleaseTime,
		Description: version.Description,
		DownloadUrl: version.DownloadUrl,
		IsStable:    version.IsStable,
		ForceUpdate: version.ForceUpdate,
	}

	return
}

// CreateVersion 创建版本信息
func (s *GaiaXVersionService) CreateVersion(req request.CreateVersionReq) error {
	version := gaia_x.Version{
		Version:     req.Version,
		ReleaseTime: req.ReleaseTime,
		Description: req.Description,
		DownloadUrl: req.DownloadUrl,
		IsStable:    req.IsStable,
		ForceUpdate: req.ForceUpdate,
	}

	return global.GVA_DB.Create(&version).Error
}

// UpdateVersion 更新版本信息
func (s *GaiaXVersionService) UpdateVersion(req request.UpdateVersionReq) error {
	var version gaia_x.Version
	if err := global.GVA_DB.First(&version, req.ID).Error; err != nil {
		return err
	}

	// 更新字段
	updates := map[string]interface{}{}
	if req.Version != "" {
		updates["version"] = req.Version
	}
	if !req.ReleaseTime.IsZero() {
		updates["release_time"] = req.ReleaseTime
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.DownloadUrl != "" {
		updates["download_url"] = req.DownloadUrl
	}
	updates["is_stable"] = req.IsStable
	updates["force_update"] = req.ForceUpdate

	return global.GVA_DB.Model(&version).Updates(updates).Error
}

// DeleteVersion 删除版本信息
func (s *GaiaXVersionService) DeleteVersion(req request.DeleteVersionReq) error {
	return global.GVA_DB.Delete(&gaia_x.Version{}, req.ID).Error
}

// GetVersionList 获取版本列表
func (s *GaiaXVersionService) GetVersionList(req request.GetVersionListReq) (res response.GetVersionListRes, err error) {
	var versions []gaia_x.Version
	query := global.GVA_DB.Model(&gaia_x.Version{})

	if req.IsStable {
		query = query.Where("is_stable = ?", true)
	}

	// 获取总数
	var total int64
	if err = query.Count(&total).Error; err != nil {
		return
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err = query.Order("release_time desc").Offset(offset).Limit(req.PageSize).Find(&versions).Error; err != nil {
		return
	}

	// 转换为响应结构
	list := make([]response.GetVersionInfoRes, len(versions))
	for i, v := range versions {
		list[i] = response.GetVersionInfoRes{
			ID:          v.ID,
			Version:     v.Version,
			ReleaseTime: v.ReleaseTime,
			Description: v.Description,
			DownloadUrl: v.DownloadUrl,
			IsStable:    v.IsStable,
			ForceUpdate: v.ForceUpdate,
		}
	}

	res = response.GetVersionListRes{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}

	return
}
