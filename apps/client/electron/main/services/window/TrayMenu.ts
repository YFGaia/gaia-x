import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  shell,
  Tray,
} from 'electron';
import path, { join } from 'path';

import { ChatChannel, SettingChannel } from '@/types/ipc/xKey';
import { WindowId } from '@/types/window';
import { fileURLToPath } from 'url';
import { globalSettings } from '~/main';
import { createLogger } from '../../utils/logger';
import { WindowManager } from './WindowManager';
import { WindowChannel } from '@/types/ipc/windowControl';
import MainWindow from './MainWindow';
import { RENDERER_DIST, MAIN_DIST } from '~/main';
import { isDev, isMacOS } from '@/utils/common';

const logger = createLogger('TrayMenu');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const windowManager = WindowManager.getInstance();

export class TrayMenu {
  private static _instance: TrayMenu | null = null;
  private static mainTray: Tray | null = null;

  private constructor() {
    if (TrayMenu.mainTray) {
      return;
    }

    // Create tray menu template
    const trayMenuTemplate: MenuItemConstructorOptions[] = [
      {
        enabled: false,
        label: app.getName() + ' ' + app.getVersion(),
      },
      { type: 'separator' },
      {
        label: '聊天窗口',
        click: async (): Promise<void> => {
          if (globalSettings.forceUpdate) {
            return;
          }
          MainWindow.showWindow();
        },
      },
      {
        label: '设置',
        click: async (): Promise<void> => {
          if (globalSettings.forceUpdate) {
            return;
          }
          const mainWindow = windowManager.getWindow(WindowId.Main);
          mainWindow?.show();
          mainWindow?.webContents.send(SettingChannel.SHOW_SETTINGS);
        },
      },
      { type: 'separator' },
      {
        label: '使用教程',
        click: (): void => {
          shell.openExternal('https://alidocs.dingtalk.com/i/nodes/XPwkYGxZV3RXmAj2U0y4w6RnWAgozOKL'); // 使用教程钉钉文档链接
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: (): void => {
          this.cleanup();
          app.quit();
        },
      },
    ];

    // 根据环境确定图标路径
    let iconPath;
    if (isDev()) {
      if (isMacOS()) {
        // 开发环境
        iconPath = join(process.env.APP_ROOT as string, 'src/assets/favicon-mac.png');
      } else {
        // 开发环境
        iconPath = join(process.env.APP_ROOT as string, 'src/assets/icon.png');
      }
    } else {
      if (isMacOS()) {
        // 生产环境 - 使用 app.getAppPath() 获取应用根目录
        // 对于 Mac，我们将图标文件复制到 extraResources 目录
        iconPath = join(app.getAppPath(), '../extraResources/favicon-mac.png');
      } else {
        // 生产环境
        iconPath = join(RENDERER_DIST, 'favicon.ico');
      }
    }

    logger.info('iconPath: ', iconPath);
    try {
      const trayIcon = nativeImage.createFromPath(iconPath);
      
      // 为 macOS 创建适当大小的图标并设置为模板图像
      if (process.platform === 'darwin') {
        const macIcon = trayIcon.resize({ width: 22, height: 22 });
        macIcon.setTemplateImage(false);
        TrayMenu.mainTray = new Tray(macIcon);
      } else {
        TrayMenu.mainTray = new Tray(trayIcon);
      }

      // Set tooltip
      TrayMenu.mainTray.setToolTip(app.getName());

      // Build context menu
      const contextMenu = Menu.buildFromTemplate(trayMenuTemplate);
      TrayMenu.mainTray.setContextMenu(contextMenu);

      // Single click to show main window
      TrayMenu.mainTray.on('click', async () => {
        MainWindow.showWindow();
      });

      logger.info('Tray created successfully');
    } catch (error) {
      logger.error('Failed to create tray:', error);
      console.error('托盘创建失败:', error);
    }
  }

  private cleanup(): void {
    // Close all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });

    // Destroy tray
    if (TrayMenu.mainTray) {
      TrayMenu.mainTray.destroy();
      TrayMenu.mainTray = null;
    }

    TrayMenu._instance = null;
  }

  public static get instance(): TrayMenu {
    if (!TrayMenu._instance) {
      TrayMenu._instance = new TrayMenu();
    }
    return TrayMenu._instance;
  }
}
