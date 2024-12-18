import { parentPort, workerData } from 'worker_threads';
import { Extension } from '@/types/extension';

async function activateExtension() {
  const { extension, extensionPath } = workerData;

  try {
    // 创建临时上下文
    const tempContext = {
      storage: new Map(),
      events: new Map(),
      subscriptions: []
    };

    // 激活扩展
    const api = await extension.activate(tempContext);

    // 发送激活成功消息
    parentPort?.postMessage({
      type: 'activated',
      api
    });
  } catch (error) {
    // 发送错误消息
    parentPort?.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

activateExtension().catch((error) => {
  parentPort?.postMessage({
    type: 'error',
    error: error instanceof Error ? error.message : String(error)
  });
}); 