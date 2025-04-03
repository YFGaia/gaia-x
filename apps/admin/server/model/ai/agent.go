package ai

import (
	"time"

	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"gorm.io/datatypes"
)

// AgentData 智能体数据记录
type AgentData struct {
	global.GVA_MODEL
	Name      string         `json:"name" gorm:"not null;comment:智能体名称"`
	Data      datatypes.JSON `json:"data" gorm:"type:json;comment:智能体数据"`
	CreatedAt time.Time      `json:"createdAt" gorm:"comment:创建时间"`
	UpdatedAt time.Time      `json:"updatedAt" gorm:"comment:更新时间"`
}

// TableName 指定表名
func (AgentData) TableName() string {
	return "agent_data"
}

// AgentDataRequest 智能体数据上传请求
type AgentDataRequest struct {
	Data interface{} `json:"data" form:"data" binding:"required"` // 智能体数据
}

// AgentDataResponse 智能体数据响应
type AgentDataResponse struct {
	ID        uint           `json:"id"`
	Name      string         `json:"name"`
	Data      datatypes.JSON `json:"data"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}
