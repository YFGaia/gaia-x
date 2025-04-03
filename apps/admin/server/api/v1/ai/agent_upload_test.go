package ai

import (
	"bytes"
	"io/ioutil"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestAgentDataApi_UploadFile(t *testing.T) {
	// 测试用例 
	tests := []struct {
		name           string
		filePath       string
		expectedStatus int
		expectError    bool
	}{
		{
			name:           "读取真实文件",
			//绝对路径智能体的DSL文件
			filePath:       "",
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 读取真实文件
			fileBytes, err := ioutil.ReadFile(tt.filePath)
			if err != nil {
				t.Fatalf("无法读取文件 %s: %v", tt.filePath, err)
			}

			// 创建HTTP客户端
			client := &http.Client{
				Timeout: 5 * time.Second,
			}

			// 创建multipart表单
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)

			part, err := writer.CreateFormFile("file", filepath.Base(tt.filePath))
			if err != nil {
				t.Fatal(err)
			}

			// 将文件内容复制到表单字段
			part.Write(fileBytes)
			writer.Close()

			// 创建HTTP请求
			req, err := http.NewRequest("POST", "http://localhost:8888/v1/ai/upload", body)
			if err != nil {
				t.Fatalf("创建HTTP请求失败: %v", err)
			}
			req.Header.Set("Content-Type", writer.FormDataContentType())

			// 发送请求
			resp, err := client.Do(req)
			if err != nil {
				t.Fatalf("发送请求失败: %v", err)
			}
			defer resp.Body.Close()

			// 读取响应
			respBody, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("读取响应失败: %v", err)
			}

			// 打印响应内容用于调试
			t.Logf("响应状态码: %d, 响应内容: %s", resp.StatusCode, string(respBody))

			// 验证结果
			assert.Equal(t, tt.expectedStatus, resp.StatusCode, "状态码不匹配")

			if tt.expectError {
				assert.Contains(t, string(respBody), "失败", "错误情况下应包含'失败'信息")
			} else {
				assert.Contains(t, string(respBody), "成功", "成功情况下应包含'success'信息")
			}
		})
	}
}
