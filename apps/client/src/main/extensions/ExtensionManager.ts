import { Worker } from 'worker_threads';
import { ipcMain } from 'electron';
import path from 'path';
import { ExtensionContext } from './ExtensionContext';
import { Extension } from '@/types/extension';

interface ActivationProgress {
  extensionId: string;
  status: 'pending' | 'activating' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export class ExtensionManager {
  private contexts = new Map<string, ExtensionContext>();
  private extensions = new Map<string, Extension>();
  private activationQueue: string[] = [];
  private isActivating = false;
  private progressCallbacks = new Set<(progress: ActivationProgress) => void>();

  constructor() {
    // this.setupIPC();
  }

  // 注册扩展
  async registerExtension(extension: Extension) {
    if (this.extensions.has(extension.id)) {
      throw new Error(`Extension ${extension.id} already registered`);
    }

    this.extensions.set(extension.id, extension);
    // 添加到激活队列
    this.activationQueue.push(extension.id);
    
    // 开始处理队列
    this.processActivationQueue();
  }

  // 处理激活队列
  private async processActivationQueue() {
    if (this.isActivating || this.activationQueue.length === 0) return;

    this.isActivating = true;
    
    try {
      while (this.activationQueue.length > 0) {
        const extensionId = this.activationQueue.shift()!;
        await this.activateExtensionInWorker(extensionId);
      }
    } finally {
      this.isActivating = false;
    }
  }

  // 注册进度回调
  onProgress(callback: (progress: ActivationProgress) => void) {
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  // 报告进度
  private reportProgress(progress: ActivationProgress) {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  // 在 Worker 中激活扩展
  private async activateExtensionInWorker(extensionId: string): Promise<void> {
    this.reportProgress({
      extensionId,
      status: 'activating',
      progress: 0
    });

    return new Promise((resolve, reject) => {
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        reject(new Error(`Extension ${extensionId} not found`));
        return;
      }

      // 创建 Worker
      const worker = new Worker(
        path.join(__dirname, 'extensionWorker.js'),
        {
          workerData: {
            extensionId,
            extensionPath: path.join(__dirname, 'extensions', extensionId),
            extension: extension
          }
        }
      );

      // 设置超时
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Extension ${extensionId} activation timed out`));
      }, 30000); // 30 秒超时

      // 处理 Worker 消息
      worker.on('message', (message) => {
        clearTimeout(timeout);
        
        if (message.type === 'progress') {
          this.reportProgress({
            extensionId,
            status: 'activating',
            progress: message.progress
          });
        } else if (message.type === 'activated') {
          this.reportProgress({
            extensionId,
            status: 'completed',
            progress: 100
          });
          const context = new ExtensionContext(extension, message.api);
          this.contexts.set(extensionId, context);
          console.log(`Activated extension: ${extensionId}`);
          resolve();
        } else if (message.type === 'error') {
          this.reportProgress({
            extensionId,
            status: 'error',
            progress: 0,
            error: message.error
          });
          reject(new Error(message.error));
        }
      });

      // 处理 Worker 错误
      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // 处理 Worker 退出
      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
} 