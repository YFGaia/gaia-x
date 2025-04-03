package ai

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/ai"
	"go.uber.org/zap"
	"gopkg.in/yaml.v3"
)

type AgentDataService struct{}

// ParseYAMLContent 解析YAML内容并转换为JSON友好格式
func (s *AgentDataService) ParseYAMLContent(content []byte) (map[string]interface{}, error) {
	// 检查文件内容是否为空
	if len(content) == 0 {
		global.GVA_LOG.Error("文件内容为空")
		return nil, errors.New("文件内容为空")
	}

	// 使用 yaml.Decoder 和 JSONOpts 直接解析为 JSON 友好的格式
	var jsonFriendlyData map[string]interface{}
	decoder := yaml.NewDecoder(bytes.NewReader(content))
	decoder.KnownFields(true)
	err := decoder.Decode(&jsonFriendlyData)
	if err != nil {
		global.GVA_LOG.Error("解析YAML内容失败", zap.Error(err), zap.String("content", string(content)))
		return nil, errors.New("解析YAML内容失败: " + err.Error())
	}

	global.GVA_LOG.Info("YAML解析成功", zap.String("type", fmt.Sprintf("%T", jsonFriendlyData)))

	// 验证数据可以序列化为 JSON
	_, err = json.Marshal(jsonFriendlyData)
	if err != nil {
		global.GVA_LOG.Error("验证JSON序列化失败", zap.Error(err))
		return nil, errors.New("验证JSON序列化失败: " + err.Error())
	}

	global.GVA_LOG.Info("JSON序列化验证成功")

	// 校验智能体配置的必要参数
	if err := s.ValidateAgentConfig(jsonFriendlyData); err != nil {
		global.GVA_LOG.Error("智能体配置校验失败", zap.Error(err))
		return nil, err
	}

	global.GVA_LOG.Info("智能体配置校验成功")

	return jsonFriendlyData, nil
}

// ValidateAgentConfig 校验智能体配置的必要参数
func (s *AgentDataService) ValidateAgentConfig(config map[string]interface{}) error {
	// 校验顶级必要参数
	requiredTopFields := []string{"app", "kind", "version", "model_config"}
	for _, field := range requiredTopFields {
		if _, exists := config[field]; !exists {
			return fmt.Errorf("缺少必要参数: %s", field)
		}
	}

	// 校验 app 字段下的必要参数
	app, ok := config["app"].(map[string]interface{})
	if !ok {
		return errors.New("app 参数格式不正确")
	}

	requiredAppFields := []string{"name", "mode", "description"}
	for _, field := range requiredAppFields {
		if _, exists := app[field]; !exists {
			return fmt.Errorf("app 缺少必要参数: %s", field)
		}
	}

	// 校验app.name不能为空
	if name, ok := app["name"].(string); !ok || name == "" {
		return errors.New("app.name 不能为空")
	}

	// 校验app.description不能为空
	if description, ok := app["description"].(string); !ok || description == "" {
		return errors.New("app.description 不能为空")
	}

	// 校验 model_config 字段下的必要参数
	modelConfig, ok := config["model_config"].(map[string]interface{})
	if !ok {
		return errors.New("model_config 参数格式不正确")
	}

	// 校验 model 必要参数
	model, ok := modelConfig["model"].(map[string]interface{})
	if !ok {
		return errors.New("model_config.model 参数不存在或格式不正确")
	}

	requiredModelFields := []string{"name", "provider", "mode"}
	for _, field := range requiredModelFields {
		if _, exists := model[field]; !exists {
			return fmt.Errorf("model 缺少必要参数: %s", field)
		}
	}

	// 校验 model.name 不能为空
	if modelName, ok := model["name"].(string); !ok || modelName == "" {
		return errors.New("model.name 不能为空")
	}

	// 校验 model.provider 不能为空
	if provider, ok := model["provider"].(string); !ok || provider == "" {
		return errors.New("model.provider 不能为空")
	}

	// 校验 model.mode 必须为有效值
	if mode, ok := model["mode"].(string); !ok || (mode != "chat" && mode != "completion") {
		return errors.New("model.mode 必须为 'chat' 或 'completion'")
	}

	// 校验 completion_params 如果存在
	if completionParams, exists := model["completion_params"].(map[string]interface{}); exists {
		// 检查温度参数是否在有效范围内
		if temp, ok := completionParams["temperature"].(float64); ok {
			if temp < 0 || temp > 2 {
				return errors.New("model.completion_params.temperature 必须在 0-2 范围内")
			}
		}
	}

	// 校验 agent_mode (如果存在)
	if agentMode, exists := modelConfig["agent_mode"].(map[string]interface{}); exists {
		// 如果 agent_mode.enabled 为 true，则检查其他必要字段
		if enabled, ok := agentMode["enabled"].(bool); ok && enabled {
			if _, exists := agentMode["strategy"]; !exists {
				return errors.New("当 agent_mode.enabled 为 true 时，必须提供 strategy 参数")
			}
		}
	}

	return nil
}

// ensureTableExists 确保数据表存在
func (s *AgentDataService) ensureTableExists() error {
	// 判断GVA_DB是否为nil
	if global.GVA_DB == nil {
		global.GVA_LOG.Error("数据库连接失败")
		return errors.New("数据库连接失败")
	}

	if !global.GVA_DB.Migrator().HasTable(&ai.AgentData{}) {
		err := global.GVA_DB.AutoMigrate(&ai.AgentData{})
		if err != nil {
			global.GVA_LOG.Error("创建数据表失败", zap.Error(err))
			return errors.New("创建数据表失败: " + err.Error())
		}
		global.GVA_LOG.Info("数据表创建成功")
	}
	return nil
}

// UploadFile 上传智能体数据
func (s *AgentDataService) UploadFile(req ai.AgentDataRequest) (*ai.AgentDataResponse, error) {
	// 确保数据表存在
	if err := s.ensureTableExists(); err != nil {
		return nil, err
	}

	// 输出请求数据的类型
	global.GVA_LOG.Info("上传智能体数据", zap.String("data_type", fmt.Sprintf("%T", req.Data)))

	// 首先确保传入的数据是有效的 JSON 友好类型
	if req.Data == nil {
		global.GVA_LOG.Error("无效的数据: 数据为 nil")
		return nil, errors.New("无效的数据: 数据为 nil")
	}

	// 先尝试 JSON 序列化验证数据是否有效
	dataJSON, err := json.Marshal(req.Data)
	if err != nil {
		global.GVA_LOG.Error("序列化为JSON失败",
			zap.Error(err),
			zap.String("data_type", fmt.Sprintf("%T", req.Data)),
			zap.Any("data", req.Data))
		return nil, errors.New("转换为JSON失败: " + err.Error())
	}

	global.GVA_LOG.Info("序列化JSON成功", zap.Int("length", len(dataJSON)))

	// 从JSON中提取app.name 
	var data map[string]interface{}
	err = json.Unmarshal(dataJSON, &data)
	if err != nil {
		global.GVA_LOG.Error("解析JSON数据失败", zap.Error(err))
		return nil, errors.New("解析JSON数据失败: " + err.Error())
	}

	// 获取app对象
	appObj, ok := data["app"].(map[string]interface{})
	if !ok {
		global.GVA_LOG.Error("JSON数据中缺少app字段或格式不正确")
		return nil, errors.New("JSON数据中缺少app字段或格式不正确")
	}

	// 获取app.name
	appName, ok := appObj["name"].(string)
	if !ok || appName == "" {
		global.GVA_LOG.Error("JSON数据中缺少app.name字段或格式不正确")
		return nil, errors.New("JSON数据中缺少app.name字段或格式不正确")
	}

	// 创建智能体数据记录
	agentData := ai.AgentData{
		Name: appName,
		Data: dataJSON,
	}
	//判断GVA_DB是否为nil
	if global.GVA_DB == nil {
		global.GVA_LOG.Error("数据库连接失败")
		return nil, errors.New("数据库连接失败")
	}

	// 保存到数据库
	err = global.GVA_DB.Create(&agentData).Error
	if err != nil {
		global.GVA_LOG.Error("保存智能体数据失败", zap.Error(err))
		return nil, errors.New("保存智能体数据失败: " + err.Error())
	}

	global.GVA_LOG.Info("智能体数据保存成功", zap.Uint("id", agentData.ID))

	// 构建响应
	return &ai.AgentDataResponse{
		ID:        agentData.ID,
		Name:      agentData.Name,
		Data:      agentData.Data,
		CreatedAt: agentData.CreatedAt,
		UpdatedAt: agentData.UpdatedAt,
	}, nil
}
