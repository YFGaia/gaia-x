package einox

import (
	"encoding/json"
	"fmt"
	"testing"
)

func TestMultiAgentDemo(t *testing.T) {
	// 初始化环境变量
	err := LoadLLMConfigPathFromEnv()
	if err != nil {
		t.Logf("警告: 初始化LLM配置路径失败: %v，将使用默认配置", err)
	}

	// 测试用例
	testCases := []struct {
		name  string
		query string
	}{
		{
			name:  "简单问题",
			query: "介绍一下人工智能的发展历史和未来趋势",
		},
		// {
		// 	name:  "技术分析",
		// 	query: "分析比特币的工作原理及其对金融系统的影响",
		// },
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// 调用多智能体DEMO
			result, err := MultiAgentDemo(tc.query)
			if err != nil {
				t.Fatalf("执行多智能体DEMO失败: %v", err)
			}

			// 验证结果
			if result == nil {
				t.Fatal("返回结果为空")
			}

			if result.OriginalQuery != tc.query {
				t.Errorf("原始查询不匹配，期望: %s, 实际: %s", tc.query, result.OriginalQuery)
			}

			if result.Status != "completed" && result.Status != "failed" {
				t.Errorf("状态不正确，期望: completed或failed, 实际: %s", result.Status)
			}

			if len(result.Steps) == 0 {
				t.Error("步骤列表为空")
			}

			// 打印结果
			resultJSON, _ := json.MarshalIndent(result, "", "  ")
			t.Logf("测试结果: %s", resultJSON)

			// 打印最终回答
			t.Logf("最终回答: %s", result.FinalResult)
		})
	}
}

// 打印多智能体DEMO的示例用法
func ExampleMultiAgentDemo() {
	query := "解释量子力学的基本原理，并举例说明它在现实生活中的应用"
	result, err := MultiAgentDemo(query)
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}

	fmt.Printf("原始问题: %s\n", result.OriginalQuery)
	fmt.Printf("解析步骤数: %d\n", len(result.Steps))
	fmt.Printf("执行状态: %s\n", result.Status)
	fmt.Printf("最终回答: %s\n", result.FinalResult)
}
