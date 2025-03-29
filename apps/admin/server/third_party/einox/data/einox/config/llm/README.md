# LLM配置文件说明

本目录包含了各大语言模型服务提供商的配置文件，用于管理API密钥和相关设置。

## 目录结构详解

```
configs/llm/
├── openai.yaml          # OpenAI API配置
│   - 管理OpenAI的API密钥和模型配置
│   - 支持GPT-3.5、GPT-4等模型
│   - 配置请求频率和超时设置
│
├── claude.yaml          # Anthropic Claude API配置
│   - 管理Anthropic Claude的API密钥
│   - 支持Claude 1、Claude 2、Claude Instant等模型
│   - 配置请求限制和超时参数
│
├── aws_bedrock.yaml     # AWS Bedrock API配置
│   - 管理AWS Bedrock服务的访问凭证
│   - 支持通过AWS访问的多种模型(如Claude、Llama等)
│   - 配置区域设置和请求参数
│
├── azure_openai.yaml    # Azure OpenAI API配置
│   - 管理Azure上部署的OpenAI服务
│   - 包含部署名称、资源名称和API版本
│   - 配置区域和端点信息
│
├── gemini.yaml          # Google Gemini API配置
│   - 管理Google Gemini模型的API访问
│   - 支持Gemini Pro、Gemini Ultra等模型
│   - 配置项目ID和区域设置
│
├── ollama.yaml          # Ollama本地模型配置
│   - 管理本地部署的Ollama模型
│   - 配置端点和可用模型列表
│   - 设置资源限制参数
│
├── xinference.yaml      # X-Inference模型配置
│   - 管理自部署的开源模型服务
│   - 配置服务端点和认证信息
│   - 设置模型参数和资源分配
│
└── README.md            # 本说明文件
```

## 配置文件格式说明

每个配置文件都遵循以下结构：

```yaml
environments:
  development:           # 开发环境配置
    credentials:         # 凭证列表
      - name: "xxx"     # 配置名称
        enabled: true   # 是否启用
        weight: 50      # 负载均衡权重
        # ... 其他配置项
  
  production:           # 生产环境配置
    credentials:
      # ... 生产环境凭证
```

## 通用配置项说明

- `enabled`: 是否启用该配置
- `weight`: 负载均衡权重（1-100）
- `qps_limit`: 每秒请求限制
- `timeout`: 请求超时时间（秒）
- `description`: 配置说明
- `models`: 支持的模型列表

## 安全建议

1. 不要将真实的API密钥提交到代码仓库
2. 使用环境变量或密钥管理服务来管理敏感信息
3. 定期轮换生产环境的API密钥
4. 对不同环境使用不同的API密钥

## 使用示例

```go
// 加载配置文件
config, err := LoadConfig("openai")
if err != nil {
    log.Fatal(err)
}

// 获取开发环境的配置
devConfig := config.Environments["development"]

// 获取生产环境的配置
prodConfig := config.Environments["production"]
```

## 配置最佳实践

1. 每个环境至少配置两个账号用于故障转移
2. 根据实际使用情况调整权重和QPS限制
3. 为不同用途（如测试、开发、生产）使用不同的API密钥
4. 定期检查和更新API版本
5. 监控API使用情况和配额

## 监控建议

1. 监控每个API密钥的使用量
2. 设置费用预警
3. 监控请求成功率
4. 设置QPS告警阈值

## 故障处理

1. 当主要API密钥出现问题时，自动切换到备用密钥
2. 记录所有API调用错误
3. 实现重试机制
4. 设置合理的超时时间

## 配置更新流程

1. 在开发环境测试新配置
2. 进行代码审查
3. 在测试环境验证
4. 分批次更新生产环境配置

## 注意事项

1. 确保配置文件权限设置正确
2. 定期备份配置文件
3. 保持配置文件的版本控制
4. 记录配置变更历史

## 配置文件详细功能说明

### OpenAI配置 (openai.yaml)
- 用于连接OpenAI官方API服务
- 支持所有OpenAI提供的模型，如GPT-3.5-Turbo、GPT-4、GPT-4-Turbo等
- 可配置API密钥、基础URL、组织ID
- 支持按模型设置不同的温度、最大token等参数
- 提供请求重试和故障转移机制

### Claude配置 (claude.yaml)
- 用于连接Anthropic的Claude API服务
- 支持Claude系列所有模型，包括Claude 3系列
- 配置API密钥和版本信息
- 可设置模型特定参数如温度、top_p等
- 支持速率限制和使用配额管理

### AWS Bedrock配置 (aws_bedrock.yaml)
- 通过AWS Bedrock服务访问多种大型语言模型
- 支持Claude、Llama、Titan等多种模型
- 配置AWS凭证（Access Key、Secret Key）
- 设置区域和端点信息
- 可配置每个模型的特定参数

### Azure OpenAI配置 (azure_openai.yaml)
- 用于连接部署在Azure上的OpenAI服务
- 包含资源名称、部署ID和API版本
- 配置API密钥和端点URL
- 支持Azure特有的认证和区域设置
- 提供与Azure监控和日志集成的配置项

### Google Gemini配置 (gemini.yaml)
- 管理Google AI Studio提供的Gemini模型API访问
- 支持Gemini Pro、Ultra等变体
- 配置API密钥和项目信息
- 设置区域和版本控制参数
- 提供安全和合规相关配置选项

### Ollama本地配置 (ollama.yaml)
- 管理本地部署的Ollama服务和模型
- 配置服务端点和可用模型列表
- 设置本地资源分配（内存、GPU等）
- 支持自定义模型加载和卸载策略
- 配置与其他服务的故障转移关系

### X-Inference配置 (xinference.yaml)
- 管理基于X-Inference框架部署的开源模型
- 配置服务器URL和认证信息
- 设置模型加载和缓存策略
- 支持集群部署和负载均衡设置
- 提供资源监控和预警配置

## 配置文件同步和备份建议

1. 使用版本控制系统管理配置文件的变更
2. 实现配置自动同步机制，确保多环境一致性
3. 设置定期备份计划，防止配置丢失
4. 建立配置更新的审批流程
5. 记录每次配置变更的详细日志

## 配置安全最佳实践

1. 使用环境变量或密钥管理服务存储敏感信息
2. 对配置文件实施访问控制
3. 加密存储API密钥
4. 实施最小权限原则
5. 定期审计配置安全性

以上内容为LLM配置系统的完整文档，提供了详细的目录结构说明和每个配置文件的具体用途。请根据实际项目需求继续完善和更新此文档。 