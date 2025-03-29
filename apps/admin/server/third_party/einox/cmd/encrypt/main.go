package main

import (
	"fmt"
	"os"

	"github.com/gaia-x/eino-x"
)

// 执行命令行示例: go run cmd/encrypt/main.go "要加密的字符串"
func main() {
	if len(os.Args) < 2 {
		fmt.Println("使用方法: encrypt <要加密的字符串>")
		return
	}

	keyToEncrypt := os.Args[1]

	//打印加密前字符
	fmt.Printf("加密前字符: %s\n", keyToEncrypt)

	// 初始化RSA密钥管理器
	encryptFunc, _, err := einox.InitRSAKeyManager()
	if err != nil {
		fmt.Printf("初始化RSA密钥管理器失败: %v\n", err)
		return
	}

	// 使用加密函数加密数据
	encryptedKey, err := encryptFunc(keyToEncrypt)
	if err != nil {
		fmt.Printf("加密失败: %v\n", err)
		return
	}

	fmt.Println("加密结果:")
	fmt.Println(encryptedKey)
	fmt.Printf("\n密钥文件存储在: 私钥=%s, 公钥=%s\n",
		einox.DefaultPrivateKeyPath,
		einox.DefaultPublicKeyPath)
}
