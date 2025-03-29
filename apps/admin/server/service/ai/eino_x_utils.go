package ai

import (
	"fmt"
	"os"
	"path/filepath"

	einox "github.com/YFGaia/eino-x"
	"github.com/flipped-aurora/gin-vue-admin/server/global"
)

// InitEnvironment 初始化测试环境需要的环境变量
func InitEnvironment() {
	// 设置RSA密钥环境变量
	err := SetupRSAKeys()
	if err != nil {
		fmt.Printf("初始化RSA密钥环境变量失败: %v", err)
	}

	// 设置LLM配置路径环境变量
	err = SetupLLMConfigPath()
	if err != nil {
		fmt.Printf("初始化LLM配置路径环境变量失败: %v", err)
	}
}

// SetupRSAKeys 设置RSA密钥环境变量
// projectRoot 是项目根目录的路径
// 返回错误信息（如果有）
func SetupRSAKeys() error {
	// 获取项目根目录
	projectRoot, err := GetProjectRoot()
	if err != nil {
		return err
	}
	// 设置全局配置
	global.GVA_CONFIG.AutoCode.Root = projectRoot
	global.GVA_CONFIG.AutoCode.Server = "server"

	// 设置RSA密钥目录
	rsaKeysPath := filepath.Join(projectRoot, "server", "data", "einox", "rsa_keys")

	// 检查目录是否存在
	if _, err := os.Stat(rsaKeysPath); err != nil {
		if os.IsNotExist(err) {
			// 如果目录不存在，创建它
			if err := os.MkdirAll(rsaKeysPath, 0755); err != nil {
				return err
			}
		} else {
			return err
		}
	}

	// 设置RSA密钥环境变量
	os.Setenv(einox.RSAKeysEnvVar, rsaKeysPath)
	return nil
}

// SetupLLMConfigPath 设置LLM配置文件环境变量
// 配置文件路径为 server/data/einox/config/
// 返回错误信息（如果有）
func SetupLLMConfigPath() error {
	// 获取项目根目录
	projectRoot, err := GetProjectRoot()
	if err != nil {
		return err
	}

	// 设置LLM配置目录路径
	llmConfigPath := filepath.Join(projectRoot, "server", "data", "einox", "config", "llm")

	// 检查目录是否存在
	if _, err := os.Stat(llmConfigPath); err != nil {
		if os.IsNotExist(err) {
			// 如果目录不存在，创建它
			if err := os.MkdirAll(llmConfigPath, 0755); err != nil {
				return err
			}
		} else {
			return err
		}
	}

	// 设置LLM配置环境变量
	os.Setenv("LLM_CONFIG_PATH", llmConfigPath)
	return nil
}

// GetProjectRoot 获取项目根目录
// 从当前目录开始向上查找，直到找到包含server目录的目录
func GetProjectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// 向上查找直到找到server目录
	for {
		if _, err := os.Stat(filepath.Join(dir, "server")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", os.ErrNotExist
		}
		dir = parent
	}
}
