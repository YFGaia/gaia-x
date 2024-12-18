import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Win32Runtime } from './win32';
import { DarwinRuntime } from './darwin';
// 初始化运行时环境
export async function initializeRuntimes() {
  const runtimesPath = path.join(app.getPath('userData'), 'runtime');
  fs.mkdirSync(runtimesPath, { recursive: true });

  if (process.platform === 'win32') {
    await new Win32Runtime().installRuntime();
  } else if (process.platform === 'darwin') {
    await new DarwinRuntime().installRuntime();
  }
  
}

export function getRuntime() {
  if (process.platform === 'win32') {
    return new Win32Runtime();
  } else if (process.platform === 'darwin') {
    return new DarwinRuntime();
  }
  return null;
}
