package gaia_x

import (
	//"github.com/flipped-aurora/gin-vue-admin/server/model/gaia"
	gaiaxReq "github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/request"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia_x/response"
)

type GaiaXUserService struct{}

// GetUserInfo 获取用户信息
func (dashboardService *GaiaXUserService) GetUserInfo(req gaiaxReq.GetUserInfoReq) (res response.GetUserInfoRes, err error) {

	// TODO:登录的授权地址应该传入
	//
	///**
	//请求获取accessToken
	//*/
	//clientGetToken := resty.New().R()
	//var accessTokenResponse *resty.Response
	//getTokenUrl := fmt.Sprintf("%s%s", global.GVA_CONFIG.OaLogin.Url, global.GVA_CONFIG.OaLogin.GetTokenByCodeApiPath)
	//var postParams = map[string]string{
	//	"client_id":     global.GVA_CONFIG.OaLogin.Oauth2ClientId,
	//	"client_secret": global.GVA_CONFIG.OaLogin.Oauth2ClientSecret,
	//	"code":          req.Code,
	//	"grant_type":    "authorization_code",
	//	"redirect_uri":  "",
	//}
	//accessTokenResponse, err = clientGetToken.
	//	SetFormData(postParams).
	//	Post(getTokenUrl)
	//if err != nil {
	//	global.GVA_LOG.Error("请求OA用户信息失败,响应数据为：", zap.Error(errors.New(accessTokenResponse.String())))
	//	err = fmt.Errorf("请求OA用户信息失败：%s", err.Error())
	//	return
	//}
	//tokenRes := accessTokenResponse.String()
	//global.GVA_LOG.Info("请求OA用户信息成功,响应数据为：", zap.String("res", tokenRes))
	//var oaAccessToken systemRes.OaAccessTokenRes
	//err = json.Unmarshal([]byte(tokenRes), &oaAccessToken)
	//if err != nil {
	//	global.GVA_LOG.Error("解析OA AccessToken接口返回数据失败,响应数据为：", zap.Error(errors.New(accessTokenResponse.String())))
	//	err = fmt.Errorf("解析OA AccessToken接口返回数据失败：%s", err.Error())
	//	return
	//}
	//
	///**
	//请求OA，返回用户信息
	//*/
	//getUserInfoUrl := fmt.Sprintf("%s%s", global.GVA_CONFIG.OaLogin.Url, global.GVA_CONFIG.OaLogin.GetUserApiPath)
	//clientGetUser := resty.New().R()
	//var userInfoResponse *resty.Response
	//userInfoResponse, err = clientGetUser.SetHeader("Authorization", oaAccessToken.AccessToken).Post(getUserInfoUrl)
	//userInfoRes := userInfoResponse.String()
	//if err != nil {
	//	global.GVA_LOG.Error("请求OA用户信息失败,响应数据为：", zap.Error(errors.New(userInfoRes)))
	//	err = fmt.Errorf("请求OA用户信息失败,响应数据为：%s", userInfoRes)
	//	return
	//}
	//var oaUserInfo systemRes.OaUserInfoRes
	//err = json.Unmarshal([]byte(userInfoRes), &oaUserInfo)
	//if err != nil {
	//	global.GVA_LOG.Error("解析OA用户信息接口返回数据失败,响应数据为：", zap.Error(errors.New(userInfoRes)))
	//	err = fmt.Errorf("解析OA用户信息接口返回数据失败,响应数据为：%s", userInfoRes)
	//	return
	//}
	//
	///**
	//查询数据库，获取用户信息
	//*/
	//sysUser := system.SysUser{}
	//err = global.GVA_DB.Where("email", oaUserInfo.Data.Email).First(&sysUser).Error
	//if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
	//	err = errors.New("查询sys_user数据库信息失败：" + err.Error())
	//	return
	//}
	//
	//if sysUser.ID == 0 {
	//	err = fmt.Errorf("%s 用户不存在,请联系管理检查！", oaUserInfo.Data.Username)
	//	return
	//}
	//
	//difyAccount := gaia.Account{}
	//err = global.GVA_DB.Where("email=?", oaUserInfo.Data.Email).First(&difyAccount).Error
	//if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
	//	err = errors.New("查询account数据库信息失败：" + err.Error())
	//	return
	//}
	//
	//token, _, err := utils.LoginTokenWithExpireTime(&sysUser, "7d")
	//if err != nil {
	//	global.GVA_LOG.Error("获取token失败!", zap.Error(err))
	//	err = fmt.Errorf("获取token失败: %s", err.Error())
	//	return
	//}
	//
	//res = response.GetUserInfoRes{
	//	UserId:   difyAccount.ID.String(),
	//	Username: oaUserInfo.Data.Username,
	//	Name:     oaUserInfo.Data.Name,
	//	Email:    oaUserInfo.Data.Email,
	//	JwtToken: token,
	//}
	return
}
