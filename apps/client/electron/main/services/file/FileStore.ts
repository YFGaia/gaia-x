import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { createLogger } from '~/main/utils/logger';

const logger = createLogger('Store');

interface StoreData {
  theme?: string;
  [key: string]: any;
}

/**
 * 本地文件存储管理类
 * 
 * 用于管理应用的本地设置存储，数据会持久化到用户目录下的 settings.json 文件中
 * 
 * 使用示例：
 * 
 * // 初始化（可传入默认值）
 * const store = new FileStore({ theme: 'dark' });
 * 
 * // 获取值
 * const theme = store.get('theme'); // 返回 'dark'
 * 
 * // 设置值
 * store.set('theme', 'light');
 * 
 * // 批量设置
 * store.setMultiple({ theme: 'dark', fontSize: 14 });
 * 
 * // 检查是否存在
 * store.has('theme'); // true
 * 
 * // 删除值
 * store.delete('theme');
 * 
 * // 重置为默认值
 * store.reset('theme');
 * 
 * // 获取所有数据
 * const allData = store.getAll();
 * 
 * // 清空数据（保留默认值）
 * store.clear();
 */
class FileStore {
  private filePath: string;
  private data: StoreData;
  private defaults: StoreData;
  private storeName: string;

  /**
   * @param storeName - Unique name for this store instance, used as filename
   * @param defaults - Default values for this store
   */
  constructor(storeName: string, defaults: StoreData = {}) {
    if (!storeName) {
      throw new Error('Store name is required');
    }
    this.storeName = storeName;
    this.defaults = defaults;
    this.filePath = this.getStorePath();
    logger.info(`Store path: ${this.filePath}`);
    this.data = this.loadData();
    // logger.info('Store data:', this.data);
    this.saveData();
  }

  private getStorePath(): string {
    const userDataPath = app.getPath('userData');
    if (!userDataPath) {
      throw new Error('Unable to get user data path');
    }
    // Use storeName as filename, ensuring .json extension
    const filename = `store-${this.storeName}.json`;
    return path.join(userDataPath, filename);
  }

  private ensureStoreDirectory(): void {
    const directory = path.dirname(this.filePath);
    if (!fs.existsSync(directory)) {
      try {
        fs.mkdirSync(directory, { recursive: true });
      } catch (error) {
        logger.error('Failed to create store directory:', error);
        throw error;
      }
    }
  }

  private loadData(): StoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        try {
          return JSON.parse(fileContent);
        } catch (parseError) {
          logger.error('Store data not found');
          return {};
        }
      }
    } catch (error) {
      logger.error('Error loading store data:', error);
    }
    return {};
  }

  private saveData(): void {
    try {
      this.ensureStoreDirectory();
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      logger.error('Error saving store data:', error);
      throw error;
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    const value = this.data[key];
    return value !== undefined ? value : (defaultValue !== undefined ? defaultValue : this.defaults[key]);
  }

  set(key: string, value: any): void {
    if (value === undefined) {
      delete this.data[key];
    } else {
      this.data[key] = value;
    }
    this.saveData();
  }

  // New utility methods
  has(key: string): boolean {
    return key in this.data;
  }

  delete(key: string): void {
    delete this.data[key];
    this.saveData();
  }

  clear(): void {
    this.data = { ...this.defaults };
    this.saveData();
  }

  // Get all store data
  getAll(): StoreData {
    return { ...this.defaults, ...this.data };
  }

  // Set multiple key-value pairs at once
  setMultiple(items: Record<string, any>): void {
    Object.entries(items).forEach(([key, value]) => {
      if (value === undefined) {
        delete this.data[key];
      } else {
        this.data[key] = value;
      }
    });
    this.saveData();
  }

  // Reset specific keys to their default values
  reset(...keys: string[]): void {
    keys.forEach(key => {
      if (key in this.defaults) {
        this.data[key] = this.defaults[key];
      } else {
        delete this.data[key];
      }
    });
    this.saveData();
  }
}

export default FileStore; 