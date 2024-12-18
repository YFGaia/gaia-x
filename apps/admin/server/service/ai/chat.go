package ai

import (
	"errors"
	"io"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/ai"
	"github.com/gaia-x/server/service/llmadapter"
)

// ChatService 聊天服务接口
type ChatService struct{}

// CreateChatCompletion 创建聊天完成
// 统一的聊天接口，根据req.Stream参数决定是否使用流式响应
// 如果writer为nil，则返回普通响应；如果writer不为nil，则写入流式响应
func (s *ChatService) CreateChatCompletion(req llmadapter.ChatRequest, writer io.Writer) (*ai.ChatResponse, error) {
	// 根据配置选择供应商
	provider := req.Provider
	if provider == "" {
		provider = global.GVA_CONFIG.AI.Provider
	}

	// 如果是流式响应且writer不为nil
	if req.Stream && writer != nil {
		var err error
		_, err = llmadapter.CreateChatCompletion(req, writer)
		return nil, err
	}

	//// 非流式响应
	//switch provider {
	//case "azure":
	//	return Azure.CreateChatCompletion(req)
	//case "deepseek":
	//	return Deepseek.CreateChatCompletion(req)
	//default:
	//	return nil, errors.New("不支持的AI供应商: " + provider)
	//}
	return nil, errors.New("暂不支持非流式响应")
}
