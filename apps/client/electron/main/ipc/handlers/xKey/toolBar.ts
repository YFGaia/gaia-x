import { WindowId } from '@/types/window';
// import { IpcMessage } from '@/types/xKey/constants';
import { PresetConfig } from '@/types/xKey/types';
import { ToolbarChannel } from '@/types/ipc/xKey';
import { ipcMain } from 'electron';
import { settingsStore } from '~/main/services/file/settings';
import ToolbarWindow from '~/main/services/window/ToolbarWindow';
import { WindowManager } from '~/main/services/window/WindowManager';
import { logger } from '~/main/utils/logger';
import { getDefaultPresets } from '@/utils/xKey';

export const registerToolbarHandlers = () => {
  // const windowManager = WindowManager.getInstance();

  /** 调整工具栏大小 */
  ipcMain.on(
    ToolbarChannel.RESIZE_TOOLBAR,
    async (_event, { width, height }: { width: number; height: number }) => {
      // windows 1920x1080 100% scaling. 透明窗口的最小高度是 64px；
      // 小于最小高度的窗口即使显示得小，实际占用位置一点不少，会导致鼠标点击不到窗口后面的内容
      const windowManager = WindowManager.getInstance();
      logger.info('resizeToolbar', width, height);
      try {
        windowManager.setWindowSize(
          WindowId.XKeyToolbar,
          Math.round(width + 2),
          Math.max(64, Math.round(height))
        );
      } catch (e) {
        logger.error('resizeToolbar', e);
      }
    }
  );
  /** 隐藏工具栏 */
  ipcMain.on(ToolbarChannel.HIDE_TOOLBAR, () => {
    ToolbarWindow.hideToolbar();
  });

  /** 工具栏点击事件 */
  ipcMain.on(ToolbarChannel.TOOLBAR_ACTION, async (_event, { id }: { id: string }) => {
    logger.info(id);
    const storedPresets = settingsStore.get('presets') as PresetConfig;
    // 如果本地没有保存的配置，则使用默认配置
    const appPresets = (storedPresets && storedPresets.presets.length > 0) ? storedPresets : getDefaultPresets(); 
    const toolbarAction = appPresets.presets.find((preset) => preset.id === id);
    logger.info('[TOOLBAR_ACTION]', toolbarAction?.title);
    if (toolbarAction) {
      ToolbarWindow.showChatWindow(toolbarAction);
    } else {
      logger.error('[TOOLBAR_ACTION] not found', id);
      try {
        const appPresets = settingsStore.get('presets') as PresetConfig;
        const toolbarAction = appPresets.presets.find((preset) => preset.id === id);
        logger.info('[TOOLBAR_ACTION]', toolbarAction?.title);
        if (toolbarAction) {
          ToolbarWindow.showChatWindow(toolbarAction);
        } else {
          logger.error('[TOOLBAR_ACTION] not found', id);
        }
      } catch (e) {
        logger.error('[TOOLBAR_ACTION] Action error', id);
      }
    }
  });
};
