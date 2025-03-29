# LLM适配器

LLM适配器提供了一个统一的接口，用于与各种大型语言模型（LLMs）进行交互。本文档将引导您从入门到精通，包括快速设置和高级用法。

## 功能特点

- 支持多种LLM服务提供商，包括OpenAI、Claude、Azure OpenAI、Google Gemini等
- 统一的配置接口，简化多厂商集成
- 灵活的参数设置，支持各厂商特定配置
- 配置打印和测试工具，方便调试
- 安全的API密钥加密机制

## 快速上手指南

### 1. 获取API密钥

首先，您需要从您选择的LLM服务提供商获取API密钥：

- **OpenAI**: 访问[OpenAI开发者平台](https://platform.openai.com/)注册并创建API密钥
- **Azure OpenAI**: 登录[Azure门户](https://portal.azure.com/)获取密钥和端点URL
- **AWS Bedrock**: 通过[AWS管理控制台](https://aws.amazon.com/)生成访问密钥
- **DeepSeek**: 在DeepSeek平台注册并获取API密钥

### 2. 加密API密钥

为了安全起见，使用RSA加密工具加密您的API密钥：

```bash
# 加密API密钥
go run einox/cmd/encrypt/main.go "您的API密钥"
```

加密后，您将得到一个加密字符串和密钥文件位置信息。请妥善保管生成的密钥文件。

### 3. 配置环境设置

创建或更新配置文件，推荐路径为`einox/config/llm/`：

```yaml
environments:
  development:
    credentials:
      - name: "dev_azure1"
        # 使用加密后的API密钥 (命令行得到加密秘钥RSA)本文档提供
        api_key: "s36p3s6XQynzw5MNwjUICOJ6CYzd..."             
        endpoint: "https://your-resource.openai.azure.com"
        api_version: "2024-02-01"
        models:
          - "gpt-35-turbo"
          - "gpt-4o"
        deployment_id: "gpt-4o"
        enabled: true
        weight: 50
        qps_limit: 10
        description: "Azure OpenAI开发测试账号"
        timeout: 300
        proxy: ""
```

对于不同服务商，可以参考对应的配置文件模板（`openai.yaml`、`bedrock.yaml`等）。

### 4. 设置环境变量

设置以下必要的环境变量：

```bash
# Linux/MacOS
export EINOX_RSA_KEYS_DIR="/path/to/keys/directory"
export LLM_CONFIG_PATH="/path/to/config/directory"

# Windows (PowerShell)
$env:EINOX_RSA_KEYS_DIR="C:\path\to\keys\directory"
$env:LLM_CONFIG_PATH="C:\path\to\config\directory"
```

### 5. 基本使用

以下是一个简单的使用示例：

einox/example/main.go

## 工具与实用功能

## 测试与调试

### 运行测试

```bash
go test -v
```

测试包括：配置打印测试、Azure配置测试、多厂商配置测试等。

### 故障排查

如果遇到问题，请检查：

1. API密钥是否正确加密并配置
2. 网络连接是否可用
3. 请求参数是否符合要求
4. 配置文件中的`enabled`字段是否设置为`true`
5. 检查日志以获取详细错误信息
6. 确认环境变量`EINOX_RSA_KEYS_DIR`和`LLM_CONFIG_PATH`是否正确设置

## 更多资源

- 完整API文档: `einox/config/llm/README.md`
- 测试示例: `einox/llmadapter_test.go`

## 安全注意事项

1. 加密后的数据是Base64编码的字符串，可以安全地存储和传输
2. 加密的数据长度不应过长，建议不超过RSA密钥长度限制
3. 加密后的数据只能使用对应的私钥解密
4. 建议在HTTPS环境下调用API，确保传输安全
5. 妥善保管RSA密钥文件，确保它们不被未授权访问

---

希望本指南能帮助您快速上手并高效使用LLM适配器。如有疑问，请联系开发团队。🚀 