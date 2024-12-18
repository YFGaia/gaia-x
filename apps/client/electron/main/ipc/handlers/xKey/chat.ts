import { ChatChannel } from '@/types/ipc/xKey';
import { WindowId } from '@/types/window';
import { getDefaultPresets } from '@/utils/xKey';
import { ipcMain } from 'electron';
import ChatWindow from '~/main/services/window/ChatWindow';
import ToolbarWindow from '~/main/services/window/ToolbarWindow';
import { WindowManager } from '~/main/services/window/WindowManager';
import { createLogger } from '~/main/utils/logger';
import { getSelection } from './selection';

const logger = createLogger('ChatHandler');

/** 打开聊天窗口 */
const showChatWindow = async () => {
  const toolbarWindow = WindowManager.getInstance().getWindow(WindowId.XKeyToolbar);
  const [x, y] = toolbarWindow.getPosition();
  ChatWindow.newChat(getDefaultPresets().presets[0]);
  ChatWindow.showWindow(x, y, getDefaultPresets().presets[0]);
  const selection = await getSelection();
  if (selection) {
    logger.info('send selection', selection.slice(0, 10) + (selection.length > 10 ? '...' : ''));
    ChatWindow.setContent(selection);
  }
  ToolbarWindow.hideToolbar(true);
}

export const registerChatHandlers = () => {
  ipcMain.on(ChatChannel.SHOW_CHAT_WINDOW, showChatWindow);
}

