import { BrowserWindow, shell } from 'electron';
import { BehaviorSubject } from 'rxjs';
import { join } from 'path';
import { logger } from '~/main/utils/logger';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '../..');


export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

export abstract class BaseWindow<T extends BrowserWindow> {
  protected windowReady: Promise<T> | undefined;
  protected window$ = new BehaviorSubject<T | undefined>(undefined);
  private hiddenMacWindow: BrowserWindow | undefined;

  // 窗口类全部采用单例模式，使用私有构造函数确保不能直接实例化，这样只有子类可以调用它
  protected constructor() {}

  protected closeAllWindows(): void {
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed()) {
        w.destroy();
      }
    });
  }

  protected preventMacAppQuit(): void {
    if (!this.hiddenMacWindow && process.platform === 'darwin') {
      this.hiddenMacWindow = new BrowserWindow({
        show: false,
        width: 100,
        height: 100,
      });
      this.hiddenMacWindow.on('close', () => {
        this.cleanupWindows();
      });
    }
  }

  protected cleanupWindows(): void {
    this.closeAllWindows();
    this.windowReady = undefined;
    this.window$.next(undefined);
    this.hiddenMacWindow?.destroy();
    this.hiddenMacWindow = undefined;
  }

  protected async createWindow(options: {
    defaultWidth: number;
    defaultHeight: number;
    windowOptions: Electron.BrowserWindowConstructorOptions;
    htmlPath: string;
  }): Promise<T> {
    const browserWindow = new BrowserWindow({
      width: options.defaultWidth,
      height: options.defaultHeight,
      x: 0,
      y: 0,
      ...options.windowOptions,
    }) as T;

    this.bindEvents(browserWindow);
    if (process.env.NODE_ENV === 'development' && process.env.VITE_DEV_SERVER_URL) {
      await browserWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}src/pages/XKey/${options.htmlPath}`);
    } else {
      const indexHtml = path.join(RENDERER_DIST, 'src/pages/XKey', options.htmlPath);
      await browserWindow.loadFile(indexHtml);
    }
    browserWindow.webContents.openDevTools({ mode: 'detach' });
    if (process.env.VITE_DEV_SERVER_URL) {
      // Open devTool if the app is not packaged
      // browserWindow.webContents.openDevTools({ mode: 'detach', activate: false });
      // 设置调试台宽度为窗口宽度的1/4
      // browserWindow.webContents.once('devtools-opened', () => {
      //   const windowWidth = browserWindow?.getSize()[0] || 1024;
      //   const windowHeight = browserWindow?.getSize()[1] || 768;
      //   // browserWindow?.setSize(Math.floor((windowWidth * 4) / 3), windowHeight);
      //   const devToolsWindow = BrowserWindow.fromWebContents(
      //     browserWindow?.webContents.devToolsWebContents!
      //   );
      //   if (devToolsWindow) {
      //     if (process.platform !== 'darwin') {
      //       // devToolsWindow.setParentWindow(browserWindow!); // 建立父子窗口关系
      //       // TODO 以下配置放在mac系统，会导致运行打开时贴到最右边边边的位置
      //       devToolsWindow.setBounds({
      //         width: Math.floor(windowWidth / 4),
      //         height: windowHeight,
      //         x: windowWidth,
      //         y: 0,
      //       });
      //     }
      //   }
      // });
    }

    return browserWindow;
  }

  protected bindEvents(window: T): void {
    window.on('ready-to-show', () => {
      window.show();
    });

    window.webContents.setWindowOpenHandler((details) => {
      // 如果用户在你的Electron应用中点击了一个指向https://www.google.com的链接，
      // 这段代码会使用用户的默认浏览器（如Chrome、Safari等）打开该链接，而不是在Electron应用内部打开。
      shell.openExternal(details.url); // 使用系统默认浏览器打开URL
      return { action: 'deny' }; // 阻止在Electron应用内创建新窗口
    });
  }

  /** 确保窗口存在，如果窗口不存在，则创建窗口 */
  public async ensureWindow(): Promise<T> {
    if (!this.windowReady || (await this.windowReady.then((w) => w.isDestroyed()))) {
      this.windowReady = this.createWindowInstance();
      this.window$.next(await this.windowReady);
      this.preventMacAppQuit();
    }
    return this.windowReady;
  }

  protected abstract createWindowInstance(): Promise<T>;

  // private static minWidth: number = 450
  /** 设置窗口尺寸
   * https://github.com/electron/electron/issues/27651
   * Windows系统设置了缩放比例后，部分客户端在设置大小时会与设置的原始大小不一致(多一个像素)
   * 所以此处在设置完毕重新检测，错误则重新计算设置一次
   */
  static setWindowSize(win: BrowserWindow, width: number, height: number): void {
    // validate
    if (width < 2 || height < 2) {
      logger.error('Invalid window size', width, height);
      return;
    }
    const isResizable = win.isResizable();
    win.setResizable(true); // 程序段发起的大小调整可临时设置为可调整大小；不可调整大小仅对于用户发起的大小调整
    win.setSize(width, height);
    const newWidth = win.getSize()[0];
    if (newWidth != width) {
      if (newWidth > width) {
        win.setSize(width - (newWidth - width), height);
      }
    }
    // win.setMinimumSize(2, 2)
    win.setResizable(isResizable); // 恢复为原有设置
  }
}
