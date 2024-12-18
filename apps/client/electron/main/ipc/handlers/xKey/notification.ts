import path from 'path';

import { app, Notification, ipcMain } from 'electron';
import { WindowManager } from '~/main/services/window/WindowManager';
import { WindowId } from '@/types/window';
import { createLogger } from '~/main/utils/logger';
const logger = createLogger('Notification');

/** 显示通知
 * @param title 通知标题
 * @param body 通知内容
 * @param silent 是否静默
 * @returns 通知实例，如果系统不支持通知则返回 null
 */
export const showNotification = (title: string, body: string, silent = false) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent,
      icon: app.isPackaged 
        ? path.join(process.resourcesPath, 'icon.png')
        : path.join(app.getAppPath(), 'resources', 'icon.png')
    });
    
    notification.show();
    logger.info('showNotification', title, body);
    // 可选：点击通知时的行为
    notification.on('click', () => {
      const mainWindow = WindowManager.getInstance().getWindow(WindowId.Main);
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    
    return notification;
  }
  
  logger.warn('系统不支持通知功能');
  return null;
};

/** 注册系统通知事件 */
export const registerNotificationHandlers = () => {
  ipcMain.on('global-notification', (event, title, body, silent) => {
    showNotification(title, body, silent);
  });
};

