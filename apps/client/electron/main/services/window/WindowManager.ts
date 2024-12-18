import { WindowId } from '@/types/window';
import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { VITE_DEV_SERVER_URL } from '~/main';
import { globalSettings } from '~/main/index';
import { logger } from '~/main/utils/logger';
import LoginWindow from './LoginWindow';
import MainWindow from './MainWindow';
import ToolbarWindow from './ToolbarWindow';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '../..');
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

export class WindowManager {
  private static instance: WindowManager;
  private mainWindow: BrowserWindow | null = null;
  private windows: Map<string, BrowserWindow> = new Map();

  private isDev = !!process.env.VITE_DEV_SERVER_URL;
  private constructor() {}

  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  closeWindow(windowId: string) {
    this.windows.get(windowId)?.close();
    this.windows.delete(windowId);
  }
  closeAllWindows() {
    this.windows.forEach((window) => {
      window.close();
    });
    this.windows.clear();
  }

  getWindows(): Map<string, BrowserWindow> {
    return this.windows;
  }

  createWindow(
    id: string,
    options: Electron.BrowserWindowConstructorOptions = {},
    htmlPage: string,
    registerWebContent: (win: BrowserWindow) => void
  ): BrowserWindow {
    const win = this.windows.get(id);
    if (win) {
      return win;
    }
    const window = new BrowserWindow({
      ...options,
    });
    this.windows.set(id, window);
    
    window.on('closed', () => {
      this.windows.delete(id);
      if (id == WindowId.Main) {
        this.closeAllWindows();
      }
    });
    window.on('maximize', () => {
      window.webContents.send('window:maximized');
    });
    window.on('unmaximize', () => {
      window.webContents.send('window:unmaximized');
    });

    registerWebContent(window);

    if (this.isDev) {
      window.loadURL(`${process.env.VITE_DEV_SERVER_URL}${htmlPage}`).then(() => {
        if (VITE_DEV_SERVER_URL || globalSettings.inDebug) {
          window.webContents.openDevTools({ mode: 'detach' });
        } 
      });
    } else {
      window.loadFile(path.join(RENDERER_DIST, htmlPage)).then(() => {
        if (VITE_DEV_SERVER_URL || globalSettings.inDebug) {
          window.webContents.openDevTools({ mode: 'detach' });
        } 
      });
    }
    return window;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getWindow(id: string): BrowserWindow {
    const win = this.windows.get(id);
    // console.log(this.windows)
    if (!win) {
      if (id === WindowId.XKeyToolbar) {
        return ToolbarWindow.createWindow();
      } else if (id === WindowId.Login) {
        return LoginWindow.createWindow();
      } else {
        return MainWindow.createWindow();
      }
    }
    return win;
  }

  /** 设置窗口尺寸
   * https://github.com/electron/electron/issues/27651
   * Windows系统设置了缩放比例后，部分客户端在设置大小时会与设置的原始大小不一致(多一个像素)
   * 所以此处在设置完毕重新检测，错误则重新计算设置一次
   */
  setWindowSize(id: string, width: number, height: number): void {
    const win = this.getWindow(id);
    // validate
    if (width < 2 || height < 2) {
      logger.error('Invalid window size, will set default', width, height);
      width = win?.getSize()[0] || 450;
      height = win?.getSize()[1] || 600;
    }
    const isResizable = win?.isResizable();
    win?.setResizable(true); // 程序段发起的大小调整可临时设置为可调整大小；不可调整大小仅对于用户发起的大小调整
    win?.setSize(width, height);
    const newWidth = win?.getSize()[0];
    if (newWidth && newWidth > width) {
      win.setSize(width - (newWidth - width), height);
    }
    // win.setMinimumSize(2, 2)
    win?.setResizable(isResizable || true); // 恢复为原有设置
  }
}
