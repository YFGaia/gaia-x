import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export class Encryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 12;
  private static readonly AUTH_TAG_LENGTH = 16;

  // 从密码生成加密密钥
  private static async generateKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const key = scryptSync(password, salt, this.KEY_LENGTH);
        resolve(key);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 加密数据
  static async encrypt(data: string, password: string): Promise<string> {
    try {
      // 生成随机盐值和初始化向量
      const salt = randomBytes(this.SALT_LENGTH);
      const iv = randomBytes(this.IV_LENGTH);
      
      // 生成加密密钥
      const key = await this.generateKey(password, salt);
      
      // 创建加密器
      const cipher = createCipheriv(this.ALGORITHM, key, iv);
      
      // 加密数据
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 获取认证标签
      const authTag = cipher.getAuthTag();
      
      // 组合所有需要存储的数据
      const result = {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        encrypted: encrypted,
        authTag: authTag.toString('hex')
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('加密失败:', error);
      throw new Error('加密失败');
    }
  }

  // 解密数据
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
      
      // 从十六进制字符串转换回 Buffer
      const saltBuffer = Buffer.from(salt, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      const authTagBuffer = Buffer.from(authTag, 'hex');
      
      // 重新生成密钥
      const key = await this.generateKey(password, saltBuffer);
      
      // 创建解密器
      const decipher = createDecipheriv(this.ALGORITHM, key, ivBuffer);
      decipher.setAuthTag(authTagBuffer);
      
      // 解密数据
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('解密失败:', error);
      throw new Error('解密失败');
    }
  }
} 