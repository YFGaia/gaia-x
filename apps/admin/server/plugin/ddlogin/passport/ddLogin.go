package passport

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/global"
	"github.com/flipped-aurora/gin-vue-admin/server/plugin/ddlogin/model"
)

type DDLoginPassport struct {
}

func (f *DDLoginPassport) DDLogin(code string) (userInfo model.DDUserInfo, err error) {
	info := make(map[string]string)
	info["tmp_auth_code"] = code

	bytesData, _ := json.Marshal(info)
	timestamp := strconv.Itoa(int(time.Now().UnixMilli()))
	fmt.Println(global.GlobalConfig.AppSecret)
	fmt.Println(global.GlobalConfig.AppKey)
	signature := hamcSha256(timestamp, global.GlobalConfig.AppSecret)
	url := fmt.Sprintf("https://oapi.dingtalk.com/sns/getuserinfo_bycode?accessKey=%s&timestamp=%s&signature=%s", global.GlobalConfig.AppKey, timestamp, signature)
	reader := bytes.NewReader(bytesData)
	req, err := http.NewRequest("POST", url, reader)
	defer req.Body.Close()
	if err != nil {
		fmt.Println("4444444")
		fmt.Println(err.Error())
		return
	}
	req.Header.Set("Content-Type", "application/json;charset=UTF-8")

	client := http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("5555555")
		fmt.Println(err.Error())
		return
	}
	defer resp.Body.Close()
	reqsBytes, err := io.ReadAll(resp.Body)
	var uniReq model.UniReq
	err = json.Unmarshal(reqsBytes, &uniReq)
	if err != nil {
		fmt.Println("6666666")
		fmt.Println(err.Error())
		return
	}
	if uniReq.Errcode != 0 {
		fmt.Println("7777777")
		err = errors.New(uniReq.Errmsg)
		fmt.Println(err.Error())
		return
	}
	return f.GetUserInfo(uniReq.UserInfo.Unionid)
}

func (f *DDLoginPassport) GetUserInfo(Unionid string) (userInfo model.DDUserInfo, err error) {
	info := make(map[string]string)
	info["unionid"] = Unionid
	bytesData, _ := json.Marshal(info)
	reader := bytes.NewReader(bytesData)
	accessToken := GetAccessToken()
	if accessToken == "" {
		err = errors.New("accessToken获取失败")
		return
	}
	url := fmt.Sprintf("https://oapi.dingtalk.com/topapi/user/getbyunionid?access_token=%s", accessToken)
	req, err := http.NewRequest("POST", url, reader)
	client := http.Client{}
	req.Header.Set("Content-Type", "application/json;charset=UTF-8")
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("8888888")
		fmt.Println(err.Error())
		return
	}
	defer resp.Body.Close()
	reqsBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("9999999")
		fmt.Println(err.Error())
		return
	}
	var userIdRes model.UseridRes
	json.Unmarshal(reqsBytes, &userIdRes)
	if userIdRes.Result.Userid == "" {
		fmt.Println("1000000")
		fmt.Println(string(reqsBytes))
		err = errors.New("获取用户id失败")
		return
	}

	return getUserInfo(userIdRes.Result.Userid)
}

func getUserInfo(userId string) (userInfo model.DDUserInfo, err error) {
	info := make(map[string]string)
	info["userid"] = userId
	bytesData, _ := json.Marshal(info)
	reader := bytes.NewReader(bytesData)
	accessToken := GetAccessToken()
	if accessToken == "" {
		err = errors.New("accessToken获取失败")
		return
	}
	url := fmt.Sprintf("https://oapi.dingtalk.com/topapi/v2/user/get?access_token=%s", accessToken)
	req, err := http.NewRequest("POST", url, reader)
	client := http.Client{}
	req.Header.Set("Content-Type", "application/json;charset=UTF-8")
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("333")
		fmt.Println(err.Error())
		return
	}
	defer resp.Body.Close()
	reqsBytes, err := io.ReadAll(resp.Body)
	var uniReq model.DDUserInfoRes
	err = json.Unmarshal(reqsBytes, &uniReq)
	if err != nil {
		fmt.Println("1111111")
		fmt.Println(err.Error())
		return
	}
	if uniReq.Errcode != 0 {
		fmt.Println("22222")
		err = errors.New(uniReq.Errmsg)
		fmt.Println(err.Error())
		return
	}
	userInfo.Unionid = uniReq.Result.Unionid
	userInfo.Mobile = uniReq.Result.Mobile
	userInfo.Telephone = uniReq.Result.Telephone
	userInfo.Avatar = uniReq.Result.Avatar
	userInfo.Email = uniReq.Result.Email
	userInfo.Name = uniReq.Result.Name
	userInfo.Title = uniReq.Result.Title
	userInfo.Userid = uniReq.Result.Userid
	return userInfo, nil
}

func hamcSha256(message string, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	sha := h.Sum(nil)
	return url.QueryEscape(base64.StdEncoding.EncodeToString(sha))
}

func GetAccessToken() string {
	url := fmt.Sprintf("https://oapi.dingtalk.com/gettoken?appkey=%s&appsecret=%s", global.GlobalConfig.AppKey, global.GlobalConfig.AppSecret)

	fmt.Println(url)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Println(err)
		return ""
	}
	client := http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println(err.Error())
		return ""
	}
	defer resp.Body.Close()
	reqsBytes, err := io.ReadAll(resp.Body)
	var acres model.AccessRes
	json.Unmarshal(reqsBytes, &acres)
	if acres.AccessToken == "" {
		fmt.Println(acres.Errmsg)
	}
	return acres.AccessToken
}
