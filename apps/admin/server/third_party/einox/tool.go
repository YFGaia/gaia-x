// Package einox provides RSA encryption and decryption tools for LLM adapters
// 该包提供了用于LLM适配器的RSA加密和解密工具函数
//
// 主要功能：
// 1. 生成RSA密钥对
// 2. 保存和加载RSA密钥对
// 3. 使用RSA公钥加密数据和使用私钥解密数据
// 4. 为配置设置RSA加密和解密函数
// 5. 自动管理密钥文件（检查、生成或加载）
//
// 使用示例:
//
// 生成并保存RSA密钥对:
//
//	err := GenerateAndSaveRSAKeyPair("/path/to/private.pem", "/path/to/public.pem")
//	if err != nil {
//		log.Fatalf("生成RSA密钥对失败: %v", err)
//	}
//
// 加密敏感配置数据:
//
//	sensitiveData := `{"api_key": "secret-key-123", "password": "secure-pwd"}`
//	encryptedData, err := EncryptSensitiveConfig("/path/to/public.pem", sensitiveData)
//	if err != nil {
//		log.Fatalf("加密敏感数据失败: %v", err)
//	}
//	// 存储加密后的数据
//	os.WriteFile("/path/to/encrypted.txt", []byte(encryptedData), 0644)
//
// 解密敏感配置数据:
//
//	encryptedData, err := os.ReadFile("/path/to/encrypted.txt")
//	if err != nil {
//		log.Fatalf("读取加密数据失败: %v", err)
//	}
//	decryptedData, err := DecryptSensitiveConfig("/path/to/private.pem", string(encryptedData))
//	if err != nil {
//		log.Fatalf("解密数据失败: %v", err)
//	}
//	// 使用解密后的数据
//	var config map[string]string
//	json.Unmarshal([]byte(decryptedData), &config)
//
// 使用RSA密钥管理器自动管理密钥（如果不存在则创建）:
//
//	// 指定密钥文件路径
//	privateKeyPath := "/path/to/private.pem"
//	publicKeyPath := "/path/to/public.pem"
//
//	// 初始化RSA密钥管理器
//	// 如果密钥文件不存在，将自动生成并保存
//	encryptFunc, decryptFunc, err := InitRSAKeyManager(privateKeyPath, publicKeyPath)
//	if err != nil {
//		log.Fatalf("初始化RSA密钥管理器失败: %v", err)
//	}
//
//	// 使用返回的函数加密敏感数据
//	sensitiveData := "api_key=very-secret-value"
//	encryptedData, err := encryptFunc(sensitiveData)
//	if err != nil {
//		log.Fatalf("加密数据失败: %v", err)
//	}
//
//	// 存储加密后的数据或进行传输
//	// ...
//
//	// 后续使用同一密钥解密数据
//	decryptedData, err := decryptFunc(encryptedData)
//	if err != nil {
//		log.Fatalf("解密数据失败: %v", err)
//	}
//	fmt.Println("解密后的数据:", decryptedData)
//
// 使用便捷方法同时初始化并加密:
//
//	// 需要加密的数据
//	dataToEncrypt := "sensitive_credential=xyz123"
//
//	// 一步完成初始化和加密
//	encryptedData, decryptFunc, err := InitRSAKeyManagerWithEncryption(
//		"/path/to/private.pem",
//		"/path/to/public.pem",
//		dataToEncrypt,
//	)
//	if err != nil {
//		log.Fatalf("加密失败: %v", err)
//	}
//
//	// 存储加密后的数据
//	// ...
//
//	// 使用返回的函数解密
//	decryptedData, err := decryptFunc(encryptedData)
//	if err != nil {
//		log.Fatalf("解密失败: %v", err)
//	}
package einox

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

const (
	// RSAKeySize 定义RSA密钥长度
	RSAKeySize = 2048
	// RSAKeysEnvVar 定义环境变量名称，用于指定RSA密钥存储目录
	RSAKeysEnvVar = "EINOX_RSA_KEYS_DIR"
)

var (
	// ErrInvalidKey 表示RSA密钥无效
	ErrInvalidKey = errors.New("无效的RSA密钥")
	// ErrInvalidData 表示加密或解密的数据无效
	ErrInvalidData = errors.New("无效的数据")
	// ErrKeyNotFound 表示找不到RSA密钥文件
	ErrKeyNotFound = errors.New("RSA密钥文件不存在")
	// ErrKeyGeneration 表示生成RSA密钥对时发生错误
	ErrKeyGeneration = errors.New("RSA密钥生成失败")

	// 默认RSA密钥存储路径 - 运行时动态确定
	DefaultRSAKeysDir     string
	DefaultPrivateKeyPath string
	DefaultPublicKeyPath  string
)

// 初始化函数，动态设置密钥存储路径
func InitializationSettings() {
	// 首先检查环境变量是否设置了自定义密钥目录
	customDir := os.Getenv(RSAKeysEnvVar)
	if customDir != "" {
		// 使用环境变量指定的目录
		DefaultRSAKeysDir = customDir
		DefaultPrivateKeyPath = filepath.Join(DefaultRSAKeysDir, "private_key.pem")
		DefaultPublicKeyPath = filepath.Join(DefaultRSAKeysDir, "public_key.pem")
		//fmt.Printf("使用环境变量 %s 指定的RSA密钥存储目录: %s\n", RSAKeysEnvVar, DefaultRSAKeysDir)
		return
	} else {
		//无环境变量报错
		//打印当前目录
		fmt.Printf("未设置环境变量 %s\n", RSAKeysEnvVar)
		panic(fmt.Sprintf("未设置环境变量 %s", RSAKeysEnvVar))
	}
}

// RSAKeyPair 保存RSA密钥对
type RSAKeyPair struct {
	PrivateKey *rsa.PrivateKey
	PublicKey  *rsa.PublicKey
}

// GenerateRSAKeyPair 生成新的RSA密钥对
func GenerateRSAKeyPair() (*RSAKeyPair, error) {
	privateKey, err := rsa.GenerateKey(rand.Reader, RSAKeySize)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrKeyGeneration, err)
	}
	return &RSAKeyPair{
		PrivateKey: privateKey,
		PublicKey:  &privateKey.PublicKey,
	}, nil
}

// SaveRSAKeyPair 将RSA密钥对保存到文件
func SaveRSAKeyPair(keyPair *RSAKeyPair, privateKeyPath, publicKeyPath string) error {
	// 保存私钥
	privateKeyBytes := x509.MarshalPKCS1PrivateKey(keyPair.PrivateKey)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyBytes,
	})

	// 确保目录存在
	if err := os.MkdirAll(filepath.Dir(privateKeyPath), 0755); err != nil {
		return fmt.Errorf("创建私钥目录失败: %v", err)
	}

	if err := os.WriteFile(privateKeyPath, privateKeyPEM, 0600); err != nil {
		return fmt.Errorf("保存私钥文件失败: %v", err)
	}

	// 保存公钥
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(keyPair.PublicKey)
	if err != nil {
		return fmt.Errorf("序列化公钥失败: %v", err)
	}
	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PUBLIC KEY",
		Bytes: publicKeyBytes,
	})

	// 确保目录存在
	if err := os.MkdirAll(filepath.Dir(publicKeyPath), 0755); err != nil {
		return fmt.Errorf("创建公钥目录失败: %v", err)
	}

	if err := os.WriteFile(publicKeyPath, publicKeyPEM, 0644); err != nil {
		return fmt.Errorf("保存公钥文件失败: %v", err)
	}

	return nil
}

// LoadRSAKeyPair 从文件加载RSA密钥对
func LoadRSAKeyPair(privateKeyPath, publicKeyPath string) (*RSAKeyPair, error) {
	// 读取私钥
	privateKeyData, err := os.ReadFile(privateKeyPath)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrKeyNotFound, err)
	}

	privateKeyBlock, _ := pem.Decode(privateKeyData)
	if privateKeyBlock == nil || privateKeyBlock.Type != "RSA PRIVATE KEY" {
		return nil, fmt.Errorf("%w: 私钥格式不正确", ErrInvalidKey)
	}

	privateKey, err := x509.ParsePKCS1PrivateKey(privateKeyBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidKey, err)
	}

	// 读取公钥
	publicKeyData, err := os.ReadFile(publicKeyPath)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrKeyNotFound, err)
	}

	publicKeyBlock, _ := pem.Decode(publicKeyData)
	if publicKeyBlock == nil || publicKeyBlock.Type != "RSA PUBLIC KEY" {
		return nil, fmt.Errorf("%w: 公钥格式不正确", ErrInvalidKey)
	}

	publicKeyInterface, err := x509.ParsePKIXPublicKey(publicKeyBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidKey, err)
	}

	publicKey, ok := publicKeyInterface.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("%w: 无法转换为RSA公钥", ErrInvalidKey)
	}

	return &RSAKeyPair{
		PrivateKey: privateKey,
		PublicKey:  publicKey,
	}, nil
}

// EncryptWithPublicKey 使用RSA公钥加密数据
func EncryptWithPublicKey(publicKey *rsa.PublicKey, data string) (string, error) {
	if publicKey == nil {
		return "", fmt.Errorf("%w: 公钥为空", ErrInvalidKey)
	}

	ciphertext, err := rsa.EncryptOAEP(
		sha256.New(),
		rand.Reader,
		publicKey,
		[]byte(data),
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("加密失败: %v", err)
	}

	// 返回Base64编码的加密数据
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptWithPrivateKey 使用RSA私钥解密数据
func DecryptWithPrivateKey(privateKey *rsa.PrivateKey, encryptedData string) (string, error) {
	if privateKey == nil {
		return "", fmt.Errorf("%w: 私钥为空", ErrInvalidKey)
	}

	// 解码Base64字符串
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedData)
	if err != nil {
		return "", fmt.Errorf("%w: Base64解码失败: %v", ErrInvalidData, err)
	}

	// 使用RSA-OAEP算法解密
	plaintext, err := rsa.DecryptOAEP(
		sha256.New(),
		rand.Reader,
		privateKey,
		ciphertext,
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("解密失败: %v", err)
	}

	return string(plaintext), nil
}

// SetRSAEncryptFunc 为配置设置RSA加密函数
func SetRSAEncryptFunc(publicKey *rsa.PublicKey) func(string) (string, error) {
	return func(data string) (string, error) {
		return EncryptWithPublicKey(publicKey, data)
	}
}

// SetRSADecryptFunc 为配置设置RSA解密函数
func SetRSADecryptFunc(privateKey *rsa.PrivateKey) func(string) (string, error) {
	return func(data string) (string, error) {
		return DecryptWithPrivateKey(privateKey, data)
	}
}

// EncryptDataWithKeyFile 使用公钥文件加密数据
func EncryptDataWithKeyFile(publicKeyPath, data string) (string, error) {
	// 加载公钥
	publicKeyData, err := os.ReadFile(publicKeyPath)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrKeyNotFound, err)
	}

	publicKeyBlock, _ := pem.Decode(publicKeyData)
	if publicKeyBlock == nil || publicKeyBlock.Type != "RSA PUBLIC KEY" {
		return "", fmt.Errorf("%w: 公钥格式不正确", ErrInvalidKey)
	}

	publicKeyInterface, err := x509.ParsePKIXPublicKey(publicKeyBlock.Bytes)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrInvalidKey, err)
	}

	publicKey, ok := publicKeyInterface.(*rsa.PublicKey)
	if !ok {
		return "", fmt.Errorf("%w: 无法转换为RSA公钥", ErrInvalidKey)
	}

	// 使用公钥加密数据
	return EncryptWithPublicKey(publicKey, data)
}

// DecryptDataWithKeyFile 使用私钥文件解密数据
func DecryptDataWithKeyFile(privateKeyPath, encryptedData string) (string, error) {
	// 加载私钥
	privateKeyData, err := os.ReadFile(privateKeyPath)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrKeyNotFound, err)
	}

	privateKeyBlock, _ := pem.Decode(privateKeyData)
	if privateKeyBlock == nil || privateKeyBlock.Type != "RSA PRIVATE KEY" {
		return "", fmt.Errorf("%w: 私钥格式不正确", ErrInvalidKey)
	}

	privateKey, err := x509.ParsePKCS1PrivateKey(privateKeyBlock.Bytes)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrInvalidKey, err)
	}

	// 使用私钥解密数据
	return DecryptWithPrivateKey(privateKey, encryptedData)
}

// GenerateAndSaveRSAKeyPair 生成并保存RSA密钥对到指定文件
func GenerateAndSaveRSAKeyPair(privateKeyPath, publicKeyPath string) error {
	// 生成密钥对
	keyPair, err := GenerateRSAKeyPair()
	if err != nil {
		return err
	}

	// 保存密钥对
	return SaveRSAKeyPair(keyPair, privateKeyPath, publicKeyPath)
}

// EncryptSensitiveConfig 加密敏感配置信息
func EncryptSensitiveConfig(publicKeyPath, sensitiveData string) (string, error) {
	return EncryptDataWithKeyFile(publicKeyPath, sensitiveData)
}

// DecryptSensitiveConfig 解密敏感配置信息
func DecryptSensitiveConfig(privateKeyPath, encryptedData string) (string, error) {
	return DecryptDataWithKeyFile(privateKeyPath, encryptedData)
}

// InitRSAKeyManager 初始化RSA密钥管理器
// 检查是否已存在默认路径的密钥文件；如果不存在，则生成新的密钥对并保存
// 返回用于加密和解密的函数，可以直接用于处理敏感数据
func InitRSAKeyManager() (
	encryptFunc func(string) (string, error),
	decryptFunc func(string) (string, error),
	err error) {

	//InitializationSettings()
	//初始化设置
	InitializationSettings()

	// 确保使用绝对路径
	privateKeyPath := DefaultPrivateKeyPath
	publicKeyPath := DefaultPublicKeyPath

	// 检查公钥和私钥文件是否都存在
	privateKeyExists := true
	publicKeyExists := true

	if _, err := os.Stat(privateKeyPath); os.IsNotExist(err) {
		privateKeyExists = false
	}

	if _, err := os.Stat(publicKeyPath); os.IsNotExist(err) {
		publicKeyExists = false
	}

	var keyPair *RSAKeyPair

	// 如果任一密钥文件不存在，则生成新的密钥对
	if !privateKeyExists || !publicKeyExists {
		// 确保目录存在
		if err := os.MkdirAll(DefaultRSAKeysDir, 0755); err != nil {
			return nil, nil, fmt.Errorf("创建密钥目录失败: %v", err)
		}

		// 生成新的RSA密钥对
		keyPair, err = GenerateRSAKeyPair()
		if err != nil {
			return nil, nil, fmt.Errorf("生成RSA密钥对失败: %v", err)
		}

		// 保存到文件
		err = SaveRSAKeyPair(keyPair, privateKeyPath, publicKeyPath)
		if err != nil {
			return nil, nil, fmt.Errorf("保存RSA密钥对失败: %v", err)
		}
	} else {
		// 如果密钥文件已存在，则加载它们
		keyPair, err = LoadRSAKeyPair(privateKeyPath, publicKeyPath)
		if err != nil {
			return nil, nil, fmt.Errorf("加载RSA密钥对失败: %v", err)
		}
	}

	// 创建加密和解密函数
	encryptFunc = SetRSAEncryptFunc(keyPair.PublicKey)
	decryptFunc = SetRSADecryptFunc(keyPair.PrivateKey)

	return encryptFunc, decryptFunc, nil
}

// InitRSAKeyManagerWithEncryption 初始化RSA密钥管理器并立即加密指定的数据
// 如果密钥文件不存在，会生成新的密钥对并保存
// 返回加密后的数据以及用于后续解密的函数
func InitRSAKeyManagerWithEncryption(dataToEncrypt string) (
	encryptedData string,
	decryptFunc func(string) (string, error),
	err error) {

	// 初始化RSA密钥管理器
	encryptFunc, decryptFunc, err := InitRSAKeyManager()
	if err != nil {
		return "", nil, err
	}

	// 使用加密函数加密数据
	encryptedData, err = encryptFunc(dataToEncrypt)
	if err != nil {
		return "", nil, fmt.Errorf("加密数据失败: %v", err)
	}

	fmt.Printf("密钥文件应该存储在: 私钥=%s, 公钥=%s\n", DefaultPrivateKeyPath, DefaultPublicKeyPath)

	return encryptedData, decryptFunc, nil
}

// InitRSAKeyManagerWithDecryption 初始化RSA密钥管理器并立即解密指定的数据
// 要求密钥文件必须已存在
// 返回解密后的数据以及用于后续加密的函数
func InitRSAKeyManagerWithDecryption(encryptedData string) (
	decryptedData string,
	encryptFunc func(string) (string, error),
	err error) {

	// 初始化RSA密钥管理器
	encryptFunc, decryptFunc, err := InitRSAKeyManager()
	if err != nil {
		return "", nil, err
	}

	// 使用解密函数解密数据
	decryptedData, err = decryptFunc(encryptedData)
	if err != nil {
		return "", nil, fmt.Errorf("解密数据失败: %v", err)
	}

	return decryptedData, encryptFunc, nil
}

// EncryptKey 从命令行加密字符串
// 用于命令行工具调用，加密给定的key
func EncryptKey(key string) (string, error) {
	// 初始化RSA密钥管理器
	encryptFunc, _, err := InitRSAKeyManager()
	if err != nil {
		return "", fmt.Errorf("初始化RSA密钥管理器失败: %v", err)
	}

	// 使用加密函数加密数据
	encryptedKey, err := encryptFunc(key)
	if err != nil {
		return "", fmt.Errorf("加密key失败: %v", err)
	}

	return encryptedKey, nil
}
