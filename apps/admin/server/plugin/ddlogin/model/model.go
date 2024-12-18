package model

import model "github.com/flipped-aurora/gin-vue-admin/server/model/system"

type UniReq struct {
	Errcode  int    `json:"errcode"`
	Errmsg   string `json:"errmsg"`
	UserInfo struct {
		Nick                 string `json:"nick"`
		Unionid              string `json:"unionid"`
		DingId               string `json:"dingId"`
		Openid               string `json:"openid"`
		MainOrgAuthHighLevel bool   `json:"main_org_auth_high_level"`
	} `json:"user_info"`
}

type AccessRes struct {
	Errcode     int    `json:"errcode"`
	AccessToken string `json:"access_token"`
	Errmsg      string `json:"errmsg"`
	ExpiresIn   int    `json:"expires_in"`
}

type UseridRes struct {
	Errcode int    `json:"errcode"`
	Errmsg  string `json:"errmsg"`
	Result  struct {
		ContactType string `json:"contact_type"`
		Userid      string `json:"userid"`
	} `json:"result"`
	RequestId string `json:"request_id"`
}

type DDUserInfo struct {
	GvaUserId uint   `json:"gva_user_id"`
	Unionid   string `json:"unionid"`
	Mobile    string `json:"mobile"`
	Active    string `json:"active"`
	Telephone string `json:"telephone"`
	Avatar    string `json:"avatar"`
	Senior    string `json:"senior"`
	Name      string `json:"name"`
	Title     string `json:"title"`
	Userid    string `json:"userid"`
	Email     string `json:"email"`
}

type DDUserInfoRes struct {
	Errcode int    `json:"errcode"`
	Errmsg  string `json:"errmsg"`
	Result  struct {
		Active        bool   `json:"active"`
		Admin         bool   `json:"admin"`
		Avatar        string `json:"avatar"`
		Boss          bool   `json:"boss"`
		DeptIdList    []int  `json:"dept_id_list"`
		DeptOrderList []struct {
			DeptId int   `json:"dept_id"`
			Order  int64 `json:"order"`
		} `json:"dept_order_list"`
		Email            string `json:"email"`
		ExclusiveAccount bool   `json:"exclusive_account"`
		HideMobile       bool   `json:"hide_mobile"`
		JobNumber        string `json:"job_number"`
		LeaderInDept     []struct {
			DeptId int  `json:"dept_id"`
			Leader bool `json:"leader"`
		} `json:"leader_in_dept"`
		Mobile     string `json:"mobile"`
		Name       string `json:"name"`
		RealAuthed bool   `json:"real_authed"`
		Remark     string `json:"remark"`
		RoleList   []struct {
			GroupName string `json:"group_name"`
			Id        int64  `json:"id"`
			Name      string `json:"name"`
		} `json:"role_list"`
		StateCode string `json:"state_code"`
		Telephone string `json:"telephone"`
		Title     string `json:"title"`
		Unionid   string `json:"unionid"`
		Userid    string `json:"userid"`
		WorkPlace string `json:"work_place"`
	} `json:"result"`
	RequestId string `json:"request_id"`
}

func (DDUserInfo) TableName() string {
	return "dd_user_info"
}

type LoginUserInfo struct {
	DDUserInfo
	model.SysUser
}

type LoginU struct {
	Test      string
	JWT       string
	ExpiresAt int64
}

type LoginE struct {
	Err string
}
