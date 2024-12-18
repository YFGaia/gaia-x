/*
 * Copyright 2024 CloudWeGo Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package main

import (
	"fmt"
	"os"

	"github.com/gaia-x/server/service/llmadapter"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("使用方法: encrypt <要加密的字符串>")
		return
	}

	keyToEncrypt := os.Args[1]
	// 初始化RSA密钥管理器
	encryptFunc, _, err := llmadapter.InitRSAKeyManager()
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
		llmadapter.DefaultPrivateKeyPath,
		llmadapter.DefaultPublicKeyPath)
}
