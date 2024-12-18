import { WindowId } from '@/types/window';
import { isDev } from '@/utils/common';
import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOauthString } from '../protocols';
// import MainWindow from './MainWindow';
import { globalSettings } from '~/main/index';
import { registerHandlers } from '~/main/ipc/handlers/xKey';
import MainWindow from './MainWindow';
import ToolbarWindow from './ToolbarWindow';
import { TrayMenu } from './TrayMenu';
import { WindowManager } from './WindowManager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const windowManager = WindowManager.getInstance();

app.on('second-instance', (event, args) => {
  const protocolUrl = args.find((arg) => {
    if (isDev()) {
      // 开发环境下，去掉可能的额外路径前缀
      return arg.replace(process.execPath, '').startsWith('gaia-x://');
    }
    return arg.startsWith('gaia-x://');
  });
  console.log('second-instance', protocolUrl);
  if (protocolUrl) {
    const oauthStr = getOauthString(protocolUrl);
    windowManager.getWindow(WindowId.Login)?.webContents.send('set-token', oauthStr);
  }
});

export default class LoginWindow {
  private static preload = path.join(__dirname, '../preload/index.mjs');

  private static indexHtml = 'login.html';
  private static title = '登录页';

  static createWindow() {
    const registerWebContent = (win: BrowserWindow) => {

      win.once('ready-to-show', () => {
        win?.show();
      });

      // Test actively push message to the Electron-Renderer
      win.webContents.on('did-finish-load', async () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString());
        const url = process.argv.find((arg) => arg.startsWith('gaia-x://'));
        if (url) {
          const oauthStr = getOauthString(url);
          win?.webContents.send('set-token', oauthStr);
        }
      });

      // Make all links open with the browser, not with the application
      win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) shell.openExternal(url);
        return { action: 'deny' };
      });

      // 处理mac系统打开url
      app.on('open-url', async (event, url) => {
        if (url.startsWith('gaia-x://')) {
          const oauthStr = getOauthString(url);
          win?.webContents.send('set-token', oauthStr);
        }
      });
    };

    const win = windowManager.createWindow(
      WindowId.Login,
      {
        height: 280,
        width: 240,
        title: this.title,
        frame: false,
        thickFrame: true,
        icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
        show: false,
        webPreferences: {
          // 预加载脚本的路径
          preload: this.preload,
          // 启用上下文隔离，确保渲染进程和主进程的安全隔离
          contextIsolation: true,
          // 启用 web 安全策略，防止跨域等安全问题
          webSecurity: false,
          // 禁止运行不安全的内容，增强安全性
          allowRunningInsecureContent: false,
          // 禁用 Node.js 集成，提高安全性
          nodeIntegration: false,
          // 启用沙盒模式，防止跨域等安全问题
          sandbox: true,
          // 启用开发者工具
          devTools: globalSettings.inDebug,
          // 设置默认字符编码
          defaultEncoding: 'utf8',
          // 启用 WebGL 支持
          webgl: true,
          // 禁用拼写检查，减少不必要的警告
          spellcheck: false,
        },
      },
      this.indexHtml,
      registerWebContent
    );
    return win;
  }

  static loginSuccess(userId: string) {
    globalSettings.userId = userId;
    MainWindow.createWindow();
    windowManager.closeWindow(WindowId.Login);
    // ChatWindow.createWindow();
    // SettingsWindow.createWindow();
    ToolbarWindow.createWindow();
    TrayMenu.instance;
    registerHandlers();
  }
}
