import { WindowId } from '@/types/window';
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalSettings } from '~/main';
import { update } from '~/main/update';
import { WindowManager } from './WindowManager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const windowManager = WindowManager.getInstance();

export default class UpdateWindow {
  private static preload = path.join(__dirname, '../preload/index.mjs');

  private static indexHtml = 'update.html';
  private static title = '更新';

  static createWindow(isForce: Boolean = false) {

    const registerWebContent = (win: BrowserWindow) => {
  
      win.once('ready-to-show', () => {
        console.log('update window ready-to-show');
        win?.show();
      });

      win.on('closed', () => {
        if (isForce) {
          windowManager.closeAllWindows()
          if (process.platform !== 'darwin') app.quit();
        }
      })
  
      // Test actively push message to the Electron-Renderer
      win.webContents.on('did-finish-load', async () => {
        if (isForce) {
          win?.webContents.send('force-update');
        }
      });
      
      // Auto update
      update();
    }


    const win = windowManager.createWindow(
      WindowId.Update,
      {
        height: 200,
        width: 600,
        minHeight: 200,
        minWidth: 600,
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

}
