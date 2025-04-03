package ai

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"testing"

	"github.com/flipped-aurora/gin-vue-admin/server/model/common/response"
	"github.com/stretchr/testify/assert"
)

// TestEncryptData 测试RSA加密接口
func TestEncryptData(t *testing.T) {
	// 创建请求数据
	reqData := RSAEncryptRequest{
		Key: "3dc20865d693412abf3873479bc3e10d",
	}

	// 将请求数据转换为JSON
	jsonData, err := json.Marshal(reqData)
	if err != nil {
		t.Fatalf("JSON编码失败: %v", err)
	}

	// 创建HTTP客户端
	client := &http.Client{}

	// 创建请求
	req, err := http.NewRequest("POST", "http://localhost:8888/v1/ai/rsa/encrypt", bytes.NewBuffer(jsonData))
	if err != nil {
		t.Fatalf("创建HTTP请求失败: %v", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("发送请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("读取响应失败: %v", err)
	}

	// 解析响应
	var result response.Response
	err = json.Unmarshal(body, &result)
	if err != nil {
		t.Fatalf("解析响应失败: %v", err)
	}

	// 断言响应
	assert.Equal(t, 200, resp.StatusCode, "状态码应为200")
	assert.Equal(t, 0, result.Code, "响应Code应为0")

	// 验证返回的数据结构
	var rsaResp RSAEncryptResponse
	respData, err := json.Marshal(result.Data)
	if err != nil {
		t.Fatalf("响应数据解析失败: %v", err)
	}

	err = json.Unmarshal(respData, &rsaResp)
	if err != nil {
		t.Fatalf("RSA响应数据解析失败: %v", err)
	}

	// 验证加密后的数据不为空
	assert.NotEmpty(t, rsaResp.EncryptedData, "加密后的数据不应为空")

	// 输出响应内容
	t.Logf("加密成功，加密后的数据: %s", rsaResp.EncryptedData)
}
