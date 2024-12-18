import { isDev } from '@/utils/common';
import { app, BrowserWindow, protocol } from 'electron';
import minimist from 'minimist';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupModules } from './modules';
import { handleProtocol } from './services/protocols';
import { initializeRuntimes } from './services/runtime';
import LoginWindow from './services/window/LoginWindow';
import MainWindow from './services/window/MainWindow';
import { WindowManager } from './services/window/WindowManager';

// 保存原始环境变量，但不修改它
export const originalEnv = { ...process.env };

// 获取原始环境变量的函数，返回副本而不是修改全局变量
export function getOriginalEnv(): NodeJS.ProcessEnv {
  return { ...originalEnv };
}

export const globalSettings = {
  forceUpdate: false,
  inDebug: false,
  userId: '',
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('process.argv 参数', minimist(process.argv.slice(2)));

if (process.argv.includes('--inspect') || isDev()) {
  globalSettings.inDebug = true;
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: app.getName(),
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

if (isDev()) {
  app.setAsDefaultProtocolClient(app.getName(), process.execPath, [
    path.resolve(process.argv[1])
  ]);
} else {
  app.setAsDefaultProtocolClient(app.getName());
}

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.whenReady().then(async () => {
  const url = process.argv.find((arg) => arg.startsWith(app.getName() + '://'));
  if (url) {
    await handleProtocol(url);
  }
  
  // 不再直接修改环境变量
  await setupModules();
  
  // 初始化运行时环境
  // initializeRuntimes();
  
  console.log('setupModules');
  LoginWindow.createWindow();
});


app.on('window-all-closed', () => {
  WindowManager.getInstance().closeAllWindows();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  }
  MainWindow.showWindow();
});
