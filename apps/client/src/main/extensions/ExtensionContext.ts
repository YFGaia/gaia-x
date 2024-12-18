import { EventEmitter } from 'events';
import { app } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { Extension, Disposable, StorageService } from '@/types/extension';

export class ExtensionContext {
  private _subscriptions: Disposable[] = [];
  private _events = new EventEmitter();
  private _storage: StorageService;
  private _api: any = {};

  constructor(
    public readonly extension: Extension,
    private readonly extensionPath: string
  ) {
    // 初始化存储服务
    this._storage = this.createStorageService();
  }

  // 获取扩展 API
  get api() {
    return this._api;
  }

  // 设置扩展 API
  set api(value: any) {
    this._api = value;
  }

  // 获取存储服务
  get storage(): StorageService {
    return this._storage;
  }

  // 获取事件发射器
  get events() {
    return this._events;
  }

  // 获取订阅列表
  get subscriptions() {
    return this._subscriptions;
  }

  // 创建存储服务
  private createStorageService(): StorageService {
    const storagePath = path.join(
      app.getPath('userData'),
      'extensions',
      this.extension.id,
      'storage.json'
    );

    // 确保目录存在
    fs.ensureDirSync(path.dirname(storagePath));

    // 读取存储文件
    let data: Record<string, any> = {};
    if (fs.existsSync(storagePath)) {
      try {
        data = fs.readJsonSync(storagePath);
      } catch (error) {
        console.error(`Failed to read storage for ${this.extension.id}:`, error);
      }
    }

    return {
      get: (key: string) => data[key],
      set: (key: string, value: any) => {
        data[key] = value;
        fs.writeJsonSync(storagePath, data, { spaces: 2 });
      },
      delete: (key: string) => {
        delete data[key];
        fs.writeJsonSync(storagePath, data, { spaces: 2 });
      },
      clear: () => {
        data = {};
        fs.writeJsonSync(storagePath, data, { spaces: 2 });
      }
    };
  }

  // 清理资源
  dispose() {
    // 清理所有订阅
    this._subscriptions.forEach(sub => sub.dispose());
    this._subscriptions = [];

    // 清理所有事件监听
    this._events.removeAllListeners();

    // 清理存储
    this.storage.clear();
  }
} 