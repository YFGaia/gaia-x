import { WindowChannel } from '@/types/ipc/windowControl';
import { ChatChannel, ToolbarChannel } from '@/types/ipc/xKey';
import { WindowId } from '@/types/window';
import { Preset } from '@/types/xKey/types';
import { screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalSettings } from '~/main';
import { createLogger } from '~/main/utils/logger';
import { SqliteManager } from '../sqlite';
import { ChatManager } from '../sqlite/modules/chat';
import MainWindow from './MainWindow';
import { WindowManager } from './WindowManager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logger = createLogger('ChatWin');

export default class ChatWindow {
  private static _isPinned = false;
  public static currentPreset: Preset | null = null;

  public static async setContent(text: string): Promise<void> {
    const window = WindowManager.getInstance().getWindow(WindowId.Main);
    window.webContents.send(ToolbarChannel.TEXT_SELECTED, { text });
  }

  public static async newChat(preset: Preset): Promise<void> {
    const window = WindowManager.getInstance().getWindow(WindowId.Main);
    
    const chatManager: ChatManager = new ChatManager(SqliteManager.getInstance().db);
    const conversation = await chatManager.getNearlyConversation(globalSettings.userId, preset.id);
    if (conversation) {
      window.webContents.send(ChatChannel.NEW_CHAT, preset, conversation.id);
    } else {
      window.webContents.send(ChatChannel.NEW_CHAT, preset, '-1');
    }
  }


  public static async showWindow(x: number, y: number, preset: Preset): Promise<void> {
    if (globalSettings.forceUpdate) {
      return;
    }
    logger.info('showAt', x, y);
    const window = WindowManager.getInstance().getWindow(WindowId.Main);
    if (window.isMinimized()) {
      window.restore();
    }
    let moreHeight = 0;
    console.log('preset', preset);
    if (preset?.userInputForm?.length) {
      moreHeight = preset.userInputForm?.length* 100;
    }
    
    // 先改变窗口大小
    MainWindow.changeMode('mini', moreHeight);
    window.webContents.send(WindowChannel.SHOW_CHAT_WINDOW, {
      view: 'chat',
      mode: 'mini',
    });
    
    if (!ChatWindow._isPinned) {
      // 获取窗口当前尺寸
      const windowBounds = window.getBounds();
      const { width, height } = windowBounds;
      
      // 获取当前鼠标所在的显示器
      const displayForPoint = screen.getDisplayNearestPoint({ x, y });
      const screenBounds = displayForPoint.workArea;
      
      // 调整 x 坐标确保窗口不超出屏幕右侧
      let adjustedX = x;
      if (x + width > screenBounds.x + screenBounds.width) {
        adjustedX = screenBounds.x + screenBounds.width - width;
      }
      
      // 确保窗口不超出屏幕左侧
      if (adjustedX < screenBounds.x) {
        adjustedX = screenBounds.x;
      }
      
      // 调整 y 坐标确保窗口不超出屏幕底部
      let adjustedY = y;
      if (y + height > screenBounds.y + screenBounds.height) {
        adjustedY = screenBounds.y + screenBounds.height - height;
      }
      
      // 确保窗口不超出屏幕顶部
      if (adjustedY < screenBounds.y) {
        adjustedY = screenBounds.y;
      }
      
      logger.info('调整后的窗口位置', { original: {x, y}, adjusted: {x: adjustedX, y: adjustedY} });
      window.setPosition(adjustedX || 0, adjustedY || 0);
    }
    
    window.show();
    window.focus();
  }

}
