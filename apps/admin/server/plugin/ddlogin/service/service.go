package service

import (
	"errors"
	global2 "github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/system"
	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/global"
	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/model"
	"github.com/flipped-aurora/gin-vue-admin/server/service"
	"gorm.io/gorm"
)

type DDLoginService struct{}

var userService = service.ServiceGroupApp.SystemServiceGroup.UserService

func (e *DDLoginService) LoginOrRegister(DDUserInfo model.DDUserInfo) (gvaInfo system.SysUser, err error) {
	var loginUserInfo model.DDUserInfo
	err = global2.GVA_DB.Where("unionid = ?", DDUserInfo.Unionid).First(&loginUserInfo).Error
	if err != nil {
		//	走注册逻辑或者失败逻辑
		user := system.SysUser{
			Username:    DDUserInfo.Name,
			Password:    "123456",
			NickName:    DDUserInfo.Name,
			AuthorityId: global.GlobalConfig.AuthorityID,
			Authorities: []system.SysAuthority{
				{
					AuthorityId: global.GlobalConfig.AuthorityID,
				},
			},
		}
		gvaInfo, err := userService.Register(user)

		if err != nil {
			//	走注册失败逻辑
			return gvaInfo, err
		}
		DDUserInfo.GvaUserId = gvaInfo.ID
		err = global2.GVA_DB.Create(&DDUserInfo).Error
		if err != nil {
			//	走创建失败逻辑
			return gvaInfo, err
		}
		return gvaInfo, err
	} else {
		//走登录逻辑
		err := global2.GVA_DB.First(&gvaInfo, "id = ?", loginUserInfo.GvaUserId).Error
		if err != nil {
			//	登录失败
			return gvaInfo, err
		}
		return gvaInfo, err
	}
}

func (e *DDLoginService) BindDD(DDUserInfo model.DDUserInfo, id uint) (err error) {
	DDUserInfo.GvaUserId = id
	err = global2.GVA_DB.First(&DDUserInfo, "gva_user_id = ?", id).Error
	if errors.Is(gorm.ErrRecordNotFound, err) {
		err = global2.GVA_DB.First(&DDUserInfo, "unionid = ?", DDUserInfo.Unionid).Error
		if err == nil {
			return errors.New("此钉钉已绑定其他账号")
		}
		err = global2.GVA_DB.Create(&DDUserInfo).Error
		return err
	} else {
		return errors.New("请勿重复绑定")
	}
}
