import { ToolbarChannel } from '@/types/ipc/xKey';
import { parseActions } from '@/utils/xKey';
import { Preset, PresetConfig } from '@/types/xKey/types';
import { isMacOS } from '@/utils/common';
import { keyboardEvents, mouseEvents } from '../../extension';
import { waitingSelection } from '../../ipc/handlers/xKey/selection';
import { settingsStore } from '../file/settings';
import ChatWindow from './ChatWindow';

import { WindowId } from '@/types/window';
import { BrowserWindow, screen, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalSettings } from '~/main';
import { createLogger } from '~/main/utils/logger';
import { getSelection } from '../../ipc/handlers/xKey/selection';
import { WindowManager } from './WindowManager';
import { getDefaultPresets } from '@/utils/xKey';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logger = createLogger('ToolbarWin');

export default class ToolbarWindow {
  private static preload = path.join(__dirname, '../preload/index.mjs');

  private static indexHtml = 'toolbar.html';
  private static title = 'toolbar';

  private static mouseCheckInterval: NodeJS.Timeout | null = null;
  private static blurOnMouseOut = false;

  private static toolbarEnabled = true;

  public static setToolbarEnabled(enabled: boolean) {
    if (this.toolbarEnabled !== enabled) {
      if (enabled) {
        mouseEvents.resumeMouseEvents();
      } else {
        mouseEvents.pauseMouseEvents();
      }
      this.toolbarEnabled = enabled;
    }
  }

  private static setupMouseTracking(window: BrowserWindow): void {
    // 设置鼠标点击检测
    mouseEvents.on('mousedown', async (event: MouseEvent) => {
      if (window.isVisible()) {
        const [winX, winY] = window.getPosition();
        const bounds = window.getBounds();

        // 检查鼠标点击是否在工具栏窗口外
        if (
          event.x < winX ||
          event.x > winX + bounds.width ||
          event.y < winY ||
          event.y > winY + bounds.height
        ) {
          ToolbarWindow.hideToolbar();
        }
      }
    });

    // wheel
    mouseEvents.on('mousewheel', async (event: MouseEvent) => {
      if (window.isVisible()) {
        const [winX, winY] = window.getPosition();
        const bounds = window.getBounds();

        // 检查鼠标点击是否在工具栏窗口外
        if (
          event.x < winX ||
          event.x > winX + bounds.width ||
          event.y < winY ||
          event.y > winY + bounds.height
        ) {
          ToolbarWindow.hideToolbar();
        }
      }
    });

    keyboardEvents.on('keydown', async (_event: KeyboardEvent) => {
      // console.log('keydown', _event)
      if (window.isVisible() && !waitingSelection) {
        ToolbarWindow.hideToolbar();
      }
    });

    // 周期性检查鼠标是否在工具栏窗口外
    this.mouseCheckInterval = setInterval(async () => {
      if (window.isVisible() && this.blurOnMouseOut) {
        const mousePos = screen.getCursorScreenPoint();
        const [winX, winY] = window.getPosition();
        const bounds = window.getBounds();

        // 检查鼠标是否在工具栏窗口外
        const padding = 20;
        if (
          mousePos.x < winX - padding ||
          mousePos.x > winX + bounds.width + padding ||
          mousePos.y < winY - padding ||
          mousePos.y > winY + bounds.height + padding
        ) {
          ToolbarWindow.hideToolbar();
        }
      }
    }, 2000);
  }

  /** 隐藏工具条 */
  static async hideToolbar(instant: boolean = false): Promise<void> {
    const toolbarWindow =  WindowManager.getInstance().getWindow(WindowId.XKeyToolbar);
    if (toolbarWindow) {
      // logger.debug('隐藏工具条')
      toolbarWindow.webContents.send(ToolbarChannel.HIDE_TOOLBAR);
      // 等待过渡动画完成
      setTimeout(
        () => {
          toolbarWindow.hide();
          if (isMacOS()) {
            toolbarWindow.setVisibleOnAllWorkspaces(false);
          }
        },
        instant ? 0 : 200
      );
    }
  }

  static createWindow() {

    const registerWebContent = (win: BrowserWindow) => {
  
      win.once('ready-to-show', () => {
      });
  
      // Test actively push message to the Electron-Renderer
      win.webContents.on('did-finish-load', async () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString());
      });
  
      win.on('blur', () => {
        logger.debug('工具栏窗口失去焦点');
        ToolbarWindow.hideToolbar();
      });
  
      win.on('closed', () => {
        if (this.mouseCheckInterval) {
          clearInterval(this.mouseCheckInterval);
          this.mouseCheckInterval = null;
        }
      });
  
      // Make all links open with the browser, not with the application
      win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) shell.openExternal(url);
        return { action: 'deny' };
      });
    }

    const win =  WindowManager.getInstance().createWindow(
      WindowId.XKeyToolbar,
      {
        minHeight: 64,
        show: false,
        type: 'panel',
        frame: false,
        transparent: true,
        backgroundColor: '#0000',
        skipTaskbar: true, // 不显示在任务栏
        alwaysOnTop: true,
        resizable: false,
        hasShadow: false,
        focusable: false,
        autoHideMenuBar: true,
        icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
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

    // try {
    //   const presets = settingsStore.get('presets') as PresetConfig;
    //   const toolbarAlpha = settingsStore.get('toolbarAlpha') as boolean;
    //   console.log('initToolbar', presets)
    //   win.webContents.send(
    //     SettingChannel.UPDATE_PRESETS,
    //     {
    //       actions: parseActions(presets),
    //       toolbarSize: presets.toolbarSize,
    //     }
    //   );
    //   win.webContents.send(ToolbarChannel.TOOLBAR_ALPHA, toolbarAlpha);
    // } catch (e) {
    //   logger.error('Config not found');
    // }

    ToolbarWindow.setupMouseTracking(win);
    return win;
  }

  /** 显示工具栏，main -> renderer, x, y 是工具栏的坐标，alpha 是否半透明 */
  static async showToolbar(x: number, y: number, alpha: boolean = false): Promise<void> {
    if (globalSettings.forceUpdate) {
      return;
    }
    const toolbarWindow =  WindowManager.getInstance().getWindow(WindowId.XKeyToolbar);
    
    if (toolbarWindow) {
      // Ensure coordinates are valid integers, only enforce non-negative on macOS
      const validX = Math.round(isMacOS() ? Math.max(0, x) : x);
      const validY = Math.round(isMacOS() ? Math.max(0, y) : y);
      const storedPresets = settingsStore.get('presets') as PresetConfig;
      // 如果本地没有保存的配置，则使用默认配置
      const presets = (storedPresets && storedPresets.presets.length > 0) ? storedPresets : getDefaultPresets(); 
      const actions = parseActions(presets);
      logger.debug('显示工具条', { x: validX, y: validY, alpha });
      // 无论工具栏是否可见，都更新位置和内容
      toolbarWindow.setPosition(validX, validY);
      toolbarWindow.webContents.send(ToolbarChannel.SHOW_TOOLBAR, alpha, actions);
      // 如果工具栏当前不可见，则显示它
      if (!toolbarWindow.isVisible()) {
        toolbarWindow.showInactive(); // 不激活窗口, 只能通过鼠标交互
        if (isMacOS()) {
          toolbarWindow.setVisibleOnAllWorkspaces(true);
        }
      }
      toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
      // toolbarWindow.focus()
    } else {
      logger.debug('showToolbar failed');
    }
  }


  public static async hideWindow(): Promise<void> {
    const window =  WindowManager.getInstance().getWindow(WindowId.XKeyToolbar);
    if (!window) return;
    window.hide();
  }

  static async showChatWindow (preset: Preset) {
    const toolbarWindow =  WindowManager.getInstance().getWindow(WindowId.XKeyToolbar)
    const [x, y] = toolbarWindow.getPosition();
  
    ChatWindow.newChat(preset);
    logger.info('preset', preset);
    ChatWindow.showWindow(x, y, preset);
    const selection = await getSelection();
    if (selection) {
      logger.info('send selection', selection.slice(0, 10) + (selection.length > 10 ? '...' : ''));
      ChatWindow.setContent(selection);
    }
    ToolbarWindow.hideToolbar(true);
  };
}
