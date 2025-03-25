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

package einox

import (
	"os"
	"path/filepath"
	"testing"

	"fmt"
)

func TestRSAEncryptionDecryption(t *testing.T) {
	// 第一步：生成RSA密钥对（包含公钥和私钥）
	// GenerateRSAKeyPair() 函数会创建一对新的RSA密钥
	// 返回的keyPair包含PublicKey和PrivateKey两个字段
	originalKeyPair, err := GenerateRSAKeyPair()
	if err != nil {
		// 如果生成密钥对失败，测试将立即终止并报告错误
		t.Fatalf("生成RSA密钥对失败: %v", err)
	}
	// 输出密钥对信息便于调试
	fmt.Printf("keyPair: %+v\n", originalKeyPair)

	// 打印公钥和私钥
	fmt.Printf("公钥: %v\n", originalKeyPair.PublicKey)
	fmt.Printf("私钥: %v\n", originalKeyPair.PrivateKey)

	// 创建临时目录来保存密钥文件
	tempDir, err := os.MkdirTemp("", "rsa_test")
	if err != nil {
		t.Fatalf("创建临时目录失败: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// 定义密钥文件路径
	privateKeyPath := filepath.Join(tempDir, "private.pem")
	publicKeyPath := filepath.Join(tempDir, "public.pem")

	// 保存密钥对到文件
	err = SaveRSAKeyPair(originalKeyPair, privateKeyPath, publicKeyPath)
	if err != nil {
		t.Fatalf("保存RSA密钥对失败: %v", err)
	}

	// 验证文件是否成功创建
	if _, err := os.Stat(privateKeyPath); os.IsNotExist(err) {
		t.Errorf("私钥文件未创建: %v", err)
	}
	if _, err := os.Stat(publicKeyPath); os.IsNotExist(err) {
		t.Errorf("公钥文件未创建: %v", err)
	}

	// 从文件加载密钥对
	loadedKeyPair, err := LoadRSAKeyPair(privateKeyPath, publicKeyPath)
	if err != nil {
		t.Fatalf("加载RSA密钥对失败: %v", err)
	}

	// 验证加载的密钥对是否与原始密钥对匹配
	if loadedKeyPair.PrivateKey.N.Cmp(originalKeyPair.PrivateKey.N) != 0 {
		t.Error("加载的私钥与原始私钥不匹配")
	}
	if loadedKeyPair.PublicKey.N.Cmp(originalKeyPair.PublicKey.N) != 0 {
		t.Error("加载的公钥与原始公钥不匹配")
	}

	// 第二步：准备需要加密的原始数据
	// 这里可以是任何文本内容，在实际应用中通常是敏感信息
	originalData := "这是一个需要加密的测试数据"

	// 第三步：使用公钥加密数据
	// EncryptWithPublicKey 函数接收公钥和原始数据字符串
	// 返回加密后的数据（通常是base64编码的字符串）
	encryptedData, err := EncryptWithPublicKey(originalKeyPair.PublicKey, originalData)
	if err != nil {
		// 如果加密过程失败，测试终止
		t.Fatalf("加密失败: %v", err)
	}

	// 第四步：使用私钥解密数据
	// DecryptWithPrivateKey 函数接收私钥和加密后的数据
	// 返回解密后的原始数据字符串
	decryptedData, err := DecryptWithPrivateKey(originalKeyPair.PrivateKey, encryptedData)
	if err != nil {
		// 如果解密过程失败，测试终止
		t.Fatalf("解密失败: %v", err)
	}

	// 第五步：验证解密结果
	// 比较解密后的数据是否与原始数据完全一致
	// 如果不一致，说明加密解密过程有问题
	if decryptedData != originalData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", originalData, decryptedData)
	}
	// 如果测试顺利完成且没有报错，说明RSA加密解密功能正常工作
}

func TestRSAKeyPairSaveAndLoad(t *testing.T) {
	// 创建临时目录
	tempDir, err := os.MkdirTemp("", "rsa_test")
	if err != nil {
		t.Fatalf("创建临时目录失败: %v", err)
	}
	defer os.RemoveAll(tempDir)

	privateKeyPath := filepath.Join(tempDir, "private.pem")
	publicKeyPath := filepath.Join(tempDir, "public.pem")

	// 生成RSA密钥对
	originalKeyPair, err := GenerateRSAKeyPair()
	if err != nil {
		t.Fatalf("生成RSA密钥对失败: %v", err)
	}

	// 保存密钥对到文件
	err = SaveRSAKeyPair(originalKeyPair, privateKeyPath, publicKeyPath)
	if err != nil {
		t.Fatalf("保存RSA密钥对失败: %v", err)
	}

	// 从文件加载密钥对
	loadedKeyPair, err := LoadRSAKeyPair(privateKeyPath, publicKeyPath)
	if err != nil {
		t.Fatalf("加载RSA密钥对失败: %v", err)
	}

	// 测试加密和解密功能
	testData := "测试密钥保存和加载功能"

	// 使用原始密钥对加密
	encryptedData, err := EncryptWithPublicKey(originalKeyPair.PublicKey, testData)
	if err != nil {
		t.Fatalf("使用原始公钥加密失败: %v", err)
	}

	// 使用加载的密钥对解密
	decryptedData, err := DecryptWithPrivateKey(loadedKeyPair.PrivateKey, encryptedData)
	if err != nil {
		t.Fatalf("使用加载的私钥解密失败: %v", err)
	}

	// 验证结果
	if decryptedData != testData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, decryptedData)
	}

	// 使用加载的密钥对加密
	encryptedData2, err := EncryptWithPublicKey(loadedKeyPair.PublicKey, testData)
	if err != nil {
		t.Fatalf("使用加载的公钥加密失败: %v", err)
	}

	// 使用原始密钥对解密
	decryptedData2, err := DecryptWithPrivateKey(originalKeyPair.PrivateKey, encryptedData2)
	if err != nil {
		t.Fatalf("使用原始私钥解密失败: %v", err)
	}

	// 验证结果
	if decryptedData2 != testData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, decryptedData2)
	}
}

func TestSetRSAEncryptAndDecryptFunc(t *testing.T) {
	// 生成RSA密钥对
	keyPair, err := GenerateRSAKeyPair()
	if err != nil {
		t.Fatalf("生成RSA密钥对失败: %v", err)
	}

	// 创建加密解密函数
	encryptFunc := SetRSAEncryptFunc(keyPair.PublicKey)
	decryptFunc := SetRSADecryptFunc(keyPair.PrivateKey)

	// 测试数据
	testData := "测试RSA加密解密函数"

	// 使用加密函数
	encryptedData, err := encryptFunc(testData)
	if err != nil {
		t.Fatalf("使用加密函数失败: %v", err)
	}

	// 使用解密函数
	decryptedData, err := decryptFunc(encryptedData)
	if err != nil {
		t.Fatalf("使用解密函数失败: %v", err)
	}

	// 验证结果
	if decryptedData != testData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, decryptedData)
	}
}

func TestEncryptAndDecryptWithKeyFile(t *testing.T) {
	// 创建临时目录
	tempDir, err := os.MkdirTemp("", "rsa_keyfile_test")
	if err != nil {
		t.Fatalf("创建临时目录失败: %v", err)
	}
	defer os.RemoveAll(tempDir)

	privateKeyPath := filepath.Join(tempDir, "private_key.pem")
	publicKeyPath := filepath.Join(tempDir, "public_key.pem")

	// 生成并保存密钥对
	err = GenerateAndSaveRSAKeyPair(privateKeyPath, publicKeyPath)
	if err != nil {
		t.Fatalf("生成并保存RSA密钥对失败: %v", err)
	}

	// 测试数据
	originalData := "这是一个使用密钥文件进行加密的测试数据"

	// 使用公钥文件加密
	encryptedData, err := EncryptDataWithKeyFile(publicKeyPath, originalData)
	if err != nil {
		t.Fatalf("使用公钥文件加密失败: %v", err)
	}

	// 使用私钥文件解密
	decryptedData, err := DecryptDataWithKeyFile(privateKeyPath, encryptedData)
	if err != nil {
		t.Fatalf("使用私钥文件解密失败: %v", err)
	}

	// 验证结果
	if decryptedData != originalData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", originalData, decryptedData)
	}
}

func TestEncryptAndDecryptSensitiveConfig(t *testing.T) {
	// 创建临时目录
	tempDir, err := os.MkdirTemp("", "rsa_config_test")
	if err != nil {
		t.Fatalf("创建临时目录失败: %v", err)
	}
	defer os.RemoveAll(tempDir)

	privateKeyPath := filepath.Join(tempDir, "private_key.pem")
	publicKeyPath := filepath.Join(tempDir, "public_key.pem")

	// 生成并保存密钥对
	err = GenerateAndSaveRSAKeyPair(privateKeyPath, publicKeyPath)
	if err != nil {
		t.Fatalf("生成并保存RSA密钥对失败: %v", err)
	}

	// 敏感配置数据
	sensitiveConfig := `{
		"api_key": "sk-1234567890abcdef",
		"secret_token": "xyzabc987654321",
		"password": "complex_password_123!@#"
	}`

	// 使用EncryptSensitiveConfig加密
	encryptedConfig, err := EncryptSensitiveConfig(publicKeyPath, sensitiveConfig)
	if err != nil {
		t.Fatalf("加密敏感配置失败: %v", err)
	}

	// 使用DecryptSensitiveConfig解密
	decryptedConfig, err := DecryptSensitiveConfig(privateKeyPath, encryptedConfig)
	if err != nil {
		t.Fatalf("解密敏感配置失败: %v", err)
	}

	// 验证结果
	if decryptedConfig != sensitiveConfig {
		t.Errorf("解密后的配置与原配置不匹配\n原配置: %s\n解密后: %s", sensitiveConfig, decryptedConfig)
	}
}

func TestInitRSAKeyManager(t *testing.T) {
	// 测试数据
	testData := ""

	// 第一次初始化，应该生成新的密钥文件
	encryptFunc1, decryptFunc1, err := InitRSAKeyManager()
	if err != nil {
		t.Fatalf("初始化RSA密钥管理器失败: %v", err)
	}
	// 使用第一次初始化得到的函数加密数据
	encryptedData, err := encryptFunc1(testData)
	if err != nil {
		t.Fatalf("使用加密函数失败: %v", err)
	}

	//打印encryptedData
	fmt.Printf("encryptedData: %s\n", encryptedData)
	fmt.Printf("encryptedData: %s\n", encryptedData)
	//encryptedData = "em4pSDneN2su/AE11diMy3s/le2JsJMzvyqBFvvdSARRuo5UTQZ5AUxYfwerAPCT0o3wD1mfYkCKErZ8E/v9XaXPG7WMsLzl/ZtksekrFbDB6/bIPw8HgHBnahXB7HaA38jjWZhV5cZZXQMk+zNu11xaNIEMBtC8f4fYHDL18RR4mnTiQ2ouKNywN3KrBIvvT7IXxB7/9H47DYJP9qpaKlfXWMunpojvBF4ef0G2JqYhBt6OC4Zft5DF3WKyq35P4FoDlboX7DwDWmwx71YvenbupewEKAP2+RMKKoYnqVpiMaiPbc2R7yV7oRl0anrogkxXuk64vlL0ivyRj7+Wgw=="

	// 使用第一次初始化得到的函数解密数据
	decryptedData, err := decryptFunc1(encryptedData)
	if err != nil {
		t.Fatalf("使用解密函数失败: %v", err)
	}

	// 验证解密结果
	if decryptedData != testData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, decryptedData)
	}

	// 第二次初始化，应该加载已存在的密钥文件
	encryptFunc2, decryptFunc2, err := InitRSAKeyManager()
	if err != nil {
		t.Fatalf("第二次初始化RSA密钥管理器失败: %v", err)
	}

	// 使用第二次初始化得到的函数解密第一次加密的数据
	// 这测试了加载的密钥与生成的密钥是一致的
	decryptedData2, err := decryptFunc2(encryptedData)
	if err != nil {
		t.Fatalf("使用第二次初始化的解密函数解密失败: %v", err)
	}

	// 验证解密结果
	if decryptedData2 != testData {
		t.Errorf("第二次解密的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, decryptedData2)
	}

	// 使用第二次的加密函数加密数据
	encryptedData2, err := encryptFunc2(testData)
	if err != nil {
		t.Fatalf("使用第二次初始化的加密函数失败: %v", err)
	}

	// 使用第一次的解密函数解密
	decryptedData3, err := decryptFunc1(encryptedData2)
	if err != nil {
		t.Fatalf("使用第一次初始化的解密函数解密第二次加密的数据失败: %v", err)
	}

	// 验证解密结果
	if decryptedData3 != testData {
		t.Errorf("交叉解密的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, decryptedData3)
	}
}

func TestInitRSAKeyManagerWithEncryption(t *testing.T) {

	// 测试数据
	testData := "这是使用便捷方法进行加密的测试数据"

	// 使用便捷方法同时初始化并加密
	encryptedData, decryptFunc, err := InitRSAKeyManagerWithEncryption(testData)
	if err != nil {
		t.Fatalf("初始化RSA密钥管理器并加密失败: %v", err)
	}

	// 使用返回的解密函数解密数据
	decryptedData, err := decryptFunc(encryptedData)
	if err != nil {
		t.Fatalf("使用解密函数失败: %v", err)
	}

	// 验证解密结果
	if decryptedData != testData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, decryptedData)
	}
}

func TestInitRSAKeyManagerWithDecryption(t *testing.T) {
	// 测试数据
	testData := "这是使用便捷方法进行解密的测试数据"

	// 先生成密钥并加密数据
	encryptedData, decryptFunc, err := InitRSAKeyManagerWithEncryption(testData)
	if err != nil {
		t.Fatalf("初始化密钥并加密失败: %v", err)
	}

	// 使用解密便捷方法来解密数据并获取加密函数
	decryptedData, encryptFunc, err := InitRSAKeyManagerWithDecryption(encryptedData)
	if err != nil {
		t.Fatalf("初始化密钥并解密失败: %v", err)
	}

	// 验证解密结果
	if decryptedData != testData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, decryptedData)
	}

	// 使用返回的加密函数重新加密数据
	newEncryptedData, err := encryptFunc(testData)
	if err != nil {
		t.Fatalf("使用返回的加密函数失败: %v", err)
	}

	// 使用之前获得的解密函数解密新的加密数据
	newDecryptedData, err := decryptFunc(newEncryptedData)
	if err != nil {
		t.Fatalf("使用之前的解密函数解密新加密的数据失败: %v", err)
	}

	// 验证解密结果
	if newDecryptedData != testData {
		t.Errorf("解密后的数据与原数据不匹配\n原数据: %s\n解密后: %s", testData, newDecryptedData)
	}
}
