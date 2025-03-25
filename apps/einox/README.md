# LLM适配器

LLM适配器提供了一个统一的接口，用于与各种大型语言模型（LLMs）进行交互。

## 功能特点

- 支持多种LLM服务提供商，包括OpenAI、Claude、Azure OpenAI、Google Gemini等
- 统一的配置接口，简化多厂商集成
- 灵活的参数设置，支持各厂商特定配置
- 配置打印和测试工具，方便调试

## 配置结构

LLM适配器使用`Config`结构体来定义配置参数：

```go
type Config struct {
    Vendor        string            // LLM服务提供商
    Timeout       int               // 请求超时时间(秒)
    MaxRetries    int               // 最大重试次数
    Model         string            // 模型名称
    Temperature   float64           // 温度参数(0-1)
    MaxTokens     int               // 最大生成token数
    TopP          float64           // 核采样参数(0-1)
    StopSequences []string          // 停止序列
    VendorParams  map[string]any    // 厂商特定参数
}
```

## 支持的厂商

目前支持以下LLM服务提供商：

- `openai`: OpenAI API
- `azure`: Azure OpenAI服务
- `claude`: Anthropic Claude
- `gemini`: Google Gemini
- `qianfan`: 百度千帆
- `qwen`: 阿里通义千问
- `ollama`: Ollama
- `ark`: 火山引擎
- `bedrock`: AWS Bedrock
- `deepseek`: DeepSeek

## 使用示例

### 基本用法

```go
// 创建配置
config := &einox.Config{
    Vendor:     "openai",
    Timeout:    60,
    MaxRetries: 5,
    Model:      "gpt-4",
    Temperature: 0.7,
    MaxTokens:   1000,
    TopP:        0.9,
    VendorParams: map[string]any{
        "base_url":      "https://api.openai.com/v1",
        "organization":  "org-123456",
    },
}

// 初始化配置
err := config.InitConfig(config.Vendor)
if err != nil {
    log.Fatalf("初始化配置失败: %v", err)
}
```

### 从YAML加载配置

```go
// 从YAML文件加载配置
yamlFile, err := ioutil.ReadFile("config.yaml")
if err != nil {
    log.Fatalf("读取配置文件失败: %v", err)
}

var config einox.Config
err = yaml.Unmarshal(yamlFile, &config)
if err != nil {
    log.Fatalf("解析YAML失败: %v", err)
}
```

## 配置打印工具

LLM适配器提供了一个命令行工具，用于测试和打印配置信息。

### 使用方法

```bash
# 使用默认配置
go run cmd/config_print/main.go

# 指定厂商
go run cmd/config_print/main.go -vendor azure

# 从配置文件加载
go run cmd/config_print/main.go -config example_config.yaml

# 指定输出格式
go run cmd/config_print/main.go -format json
```

### 命令行参数

- `-config`: 配置文件路径
- `-vendor`: LLM服务提供商（默认为openai）
- `-format`: 输出格式（yaml/json）

## 测试

可以使用以下命令运行测试：

```bash
go test -v
```

测试包括：

- 配置打印测试
- Azure配置测试
- 多厂商配置测试 

## RSA加密工具

LLM适配器提供了RSA加密工具，用于加密敏感信息（如API密钥）。

### 命令行加密工具

可以使用以下命令直接加密字符串：

```bash
# 进入项目目录
cd apps/admin/server
# 加密
go run service/einox/cmd/encrypt/main.go "sk-abcdefg123456"
```

加密后的字符串可以安全地存储在配置文件或环境变量中。密钥文件存储在当前包目录下的 `rsa_keys` 子目录中：
- 私钥：`rsa_keys/private_key.pem`
- 公钥：`rsa_keys/public_key.pem`

密钥路径会在运行时动态确定，确保无论在哪里运行都能正确找到密钥文件。

### 在代码中使用

```go
// 初始化RSA密钥管理器
encryptFunc, decryptFunc, err := einox.InitRSAKeyManager()
if err != nil {
    log.Fatalf("初始化RSA密钥管理器失败: %v", err)
}

// 加密敏感数据
sensitiveData := "sk-abcdefg123456"
encryptedData, err := encryptFunc(sensitiveData)
if err != nil {
    log.Fatalf("加密数据失败: %v", err)
}

// 解密数据
decryptedData, err := decryptFunc(encryptedData)
if err != nil {
    log.Fatalf("解密数据失败: %v", err)
}
```

一次性加密：

```go
// 直接加密字符串
encryptedKey, err := einox.EncryptKey("sk-abcdefg123456")
if err != nil {
    log.Fatalf("加密失败: %v", err)
}
fmt.Println("加密结果:", encryptedKey)
```

## API调用示例

### RSA加密API

该API提供了一个HTTP接口用于RSA加密数据。

#### 接口信息
- 请求方法：POST
- 请求路径：`/v1/ai/rsa/encrypt`
- 需要认证：是 (需要JWT Token)
- Content-Type: application/json

#### 请求参数

```json
{
    "key": "需要加密的字符串"
}
```

| 参数名 | 类型   | 必填 | 说明             |
|--------|--------|------|------------------|
| key    | string | 是   | 需要加密的字符串 |

#### 响应参数

```json
{
    "code": 0,
    "data": {
        "encryptedData": "加密后的字符串"
    },
    "msg": "操作成功"
}
```

| 参数名        | 类型   | 说明                           |
|---------------|--------|--------------------------------|
| code          | int    | 状态码，0表示成功              |
| data          | object | 响应数据对象                   |
| encryptedData | string | 使用RSA公钥加密后的Base64字符串 |
| msg           | string | 响应消息                       |

#### 调用示例

使用curl:
```bash
curl -X POST 'http://your-domain/v1/ai/rsa/encrypt' \
-H 'Authorization: Bearer your-jwt-token' \
-H 'Content-Type: application/json' \
-d '{
    "key": "sk-abcdefg123456"
}'
```

使用Python:
```python
import requests
import json

url = "http://your-domain/v1/ai/rsa/encrypt"
headers = {
    "Authorization": "Bearer your-jwt-token",
    "Content-Type": "application/json"
}
data = {
    "key": "sk-abcdefg123456"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

if result["code"] == 0:
    encrypted_data = result["data"]["encryptedData"]
    print("加密成功:", encrypted_data)
else:
    print("加密失败:", result["msg"])
```

使用JavaScript:
```javascript
async function encryptData(key) {
    const response = await fetch('http://your-domain/v1/ai/rsa/encrypt', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer your-jwt-token',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key })
    });
    
    const result = await response.json();
    
    if (result.code === 0) {
        console.log('加密成功:', result.data.encryptedData);
        return result.data.encryptedData;
    } else {
        throw new Error(`加密失败: ${result.msg}`);
    }
}

// 使用示例
encryptData('sk-abcdefg123456')
    .then(encryptedData => {
        console.log('加密结果:', encryptedData);
    })
    .catch(error => {
        console.error('错误:', error);
    });
```

使用Go:
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

type EncryptRequest struct {
    Key string `json:"key"`
}

type EncryptResponse struct {
    Code int `json:"code"`
    Data struct {
        EncryptedData string `json:"encryptedData"`
    } `json:"data"`
    Msg string `json:"msg"`
}

func encryptData(key, jwtToken string) (string, error) {
    url := "http://your-domain/v1/ai/rsa/encrypt"
    
    reqData := EncryptRequest{Key: key}
    jsonData, err := json.Marshal(reqData)
    if err != nil {
        return "", fmt.Errorf("JSON编码失败: %v", err)
    }
    
    req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    if err != nil {
        return "", fmt.Errorf("创建请求失败: %v", err)
    }
    
    req.Header.Set("Authorization", "Bearer "+jwtToken)
    req.Header.Set("Content-Type", "application/json")
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return "", fmt.Errorf("发送请求失败: %v", err)
    }
    defer resp.Body.Close()
    
    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return "", fmt.Errorf("读取响应失败: %v", err)
    }
    
    var result EncryptResponse
    if err := json.Unmarshal(body, &result); err != nil {
        return "", fmt.Errorf("解析响应失败: %v", err)
    }
    
    if result.Code != 0 {
        return "", fmt.Errorf("加密失败: %s", result.Msg)
    }
    
    return result.Data.EncryptedData, nil
}

func main() {
    key := "sk-abcdefg123456"
    jwtToken := "your-jwt-token"
    
    encryptedData, err := encryptData(key, jwtToken)
    if err != nil {
        fmt.Printf("错误: %v\n", err)
        return
    }
    
    fmt.Printf("加密成功: %s\n", encryptedData)
}
```

#### 注意事项

1. 加密后的数据是Base64编码的字符串，可以安全地存储和传输
2. 加密的数据长度不应过长，建议不超过RSA密钥长度限制
3. 加密后的数据只能使用对应的私钥解密
4. 建议在HTTPS环境下调用该接口，确保传输安全 