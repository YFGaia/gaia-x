import { WindowId } from '@/types/window';
import { app } from 'electron';
import { BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalSettings, VITE_DEV_SERVER_URL } from '~/main';
import { WindowManager } from './WindowManager';
import { WindowChannel } from '@/types/ipc/windowControl';
import { debounce } from 'lodash';
import { appStateManager } from '../config/AppStateManager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class MainWindow {
  private static preload = path.join(__dirname, '../preload/index.mjs');

  private static indexHtml = 'index.html';
  private static title = app.getName();

  static createWindow() {
    const registerWebContent = (win: BrowserWindow) => {
      win.once('ready-to-show', () => {
        win?.show();
      });

      // Test actively push message to the Electron-Renderer
      win.webContents.on('did-finish-load', async () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString());
      });

      // Make all links open with the browser, not with the application
      win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) shell.openExternal(url);
        return { action: 'deny' };
      });
    };
    const windowWidth = appStateManager.getSync('windowWidth');
    const windowHeight = appStateManager.getSync('windowHeight');

    const win = WindowManager.getInstance().createWindow(
      WindowId.Main,
      {
        title: this.title,
        width: windowWidth,
        height: windowHeight,
        frame: false,
        minHeight: 400,
        minWidth: 300,
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

    const resizeWindowDebounce = debounce(async (win: BrowserWindow) => {
      const width = win.getBounds().width;
      const height = win.getBounds().height;
      // 如果窗口宽度小于600，则不保存窗口大小
      if (width < 600) {
        return;
      }
      await appStateManager.set('windowWidth', width);
      await appStateManager.set('windowHeight', height);
    }, 1000);

    win.on('resize', async () => {
      resizeWindowDebounce(win);
    });
    return win;
  }

  static changeMode(mode: 'normal' | 'mini', moreHeight: number = 0) {
    const window = WindowManager.getInstance().getWindow(WindowId.Main);
    if (mode === 'normal') {
      window.setSize(appStateManager.getSync('windowWidth'), appStateManager.getSync('windowHeight'));
    } else {
      window.setSize(300, 400 + moreHeight);
    }
  }

  static showWindow() {
    const mainWindow = WindowManager.getInstance().getWindow(WindowId.Main);
    mainWindow?.show();
    MainWindow.changeMode('normal');
    mainWindow?.webContents.send(WindowChannel.SHOW_CHAT_WINDOW, {
      view: 'chat',
      mode: 'normal',
    });
  }
}
