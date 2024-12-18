import { SettingChannel, ToolbarChannel } from '@/types/ipc/xKey';
import { WindowId } from '@/types/window';
import { DEFAULT_THEME, isValidTheme, Theme } from '@/types/xKey/theme';
import { PresetConfig } from '@/types/xKey/types';
import { getDefaultPresets, parseActions } from '@/utils/xKey';
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { settingsStore } from '~/main/services/file/settings';
import ToolbarWindow from '~/main/services/window/ToolbarWindow';
import { WindowManager } from '~/main/services/window/WindowManager';
import { createLogger } from '~/main/utils/logger';
import { showNotification } from './notification';
const logger = createLogger('Settings');

// 从存储中获取主题，如果无效则使用默认主题
const getSavedTheme = (): Theme => {
  const savedTheme = settingsStore.get('theme') as string;
  return isValidTheme(savedTheme) ? savedTheme : DEFAULT_THEME;
};

/** 当前主题 */
let currentTheme = getSavedTheme();

/** 切换主题 */
const changeTheme = (_: IpcMainInvokeEvent, theme: string) => {
  if (!isValidTheme(theme)) {
    logger.error('Invalid theme:', theme);
    return;
  }

  // logger.info('changeTheme', theme);
  currentTheme = theme;
  settingsStore.set('theme', theme);

  // 通知所有 renderer 窗口更新主题
  const toolbarWin = WindowManager.getInstance().getWindow(WindowId.XKeyToolbar);
  toolbarWin.webContents.send(SettingChannel.UPDATE_THEME, currentTheme);
};

/** 获取主题 */
const getTheme = (event: IpcMainEvent) => {
  event.reply(SettingChannel.UPDATE_THEME, currentTheme);
};

/** 获取预设 */
const getPresets = (_: IpcMainInvokeEvent) => {
  try {
    const appPresets = settingsStore.get('presets') as PresetConfig;
    if (!appPresets.presets || appPresets.presets.length === 0) {
      appPresets.presets = getDefaultPresets().presets;
    }
    logger.info('getPresets', appPresets.presets.length);
    return appPresets;
  } catch (e) {
    logger.error('Failed to get presets', e);
    return getDefaultPresets();
  }
};

/** 设置预设 */
const setPresets = (_: IpcMainInvokeEvent, presetsText: string) => {
  try {
    const appPresets = JSON.parse(presetsText) as PresetConfig;
    settingsStore.set('presets', appPresets);
    logger.info(
      'setPresets',
      appPresets.presets.map((p) => p.title)
    );
    const toolbarWin = WindowManager.getInstance().getWindow(WindowId.XKeyToolbar);
    toolbarWin.webContents.send(SettingChannel.UPDATE_PRESETS, {
      actions: parseActions(appPresets),
      toolbarSize: appPresets.toolbarSize,
    });
  } catch (e) {
    logger.error('setPresets', e);
  }
};

/** 获取工具栏半透明 */
const getToolbarAlpha = (event: IpcMainEvent) => {
  const toolbarAlpha = settingsStore.get('toolbarAlpha') as boolean;
  event.reply(ToolbarChannel.TOOLBAR_ALPHA, toolbarAlpha);
};

/** 设置工具栏半透明 */
const setToolbarAlpha = (_: IpcMainInvokeEvent, toolbarAlpha: boolean) => {
  settingsStore.set('toolbarAlpha', toolbarAlpha);
  const toolbarWin = WindowManager.getInstance().getWindow(WindowId.XKeyToolbar);
  toolbarWin.webContents.send(ToolbarChannel.TOOLBAR_ALPHA, toolbarAlpha);
};

/** 利用后台代理请求，发送到任意 API */
const doRequest = async (_: IpcMainInvokeEvent, url: string, ...args: any[]) => {
  const timeout = 60000 * 10; // 10 minutes timeout
  try {
    // 处理不同的调用方式：GET 或 POST
    const options: RequestInit =
      args.length === 1
        ? args[0] // GET: (url, options)
        : {
            // POST: (url, data, options)
            ...args[1],
            body: typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]),
          };

    // 确保 headers 存在
    options.headers = {
      ...(options.headers || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (res.status === 401) {
      const errorText = await res.text();
      console.error('errorText', errorText);
      showNotification('Gaia-X 登录已过期', "请在 设置 - 个人信息 退出重新登录", false);
      return {
        error: '请求失败',
        message: errorText,
      };
    }
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    logger.debug('success:', { url, status: res.status });
    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    logger.error('failed:', { url, error: errorMessage });
    showNotification('找不到该应用，请检查复制的URL是否正确', errorMessage, false);
    return {
      error: err instanceof Error && err.name === 'AbortError' ? '请求超时' : '请求失败',
      message: errorMessage,
    };
  }
};

/** 从渲染进程触发系统通知 */
const triggerNotification = (_: IpcMainInvokeEvent, title: string, body: string, silent = false) => {
  return showNotification(title, body, silent);
};

/** 设置划词工具栏是否启用 */
const setToolbarEnabled = (_: IpcMainInvokeEvent, toolbarEnabled: boolean) => {
  ToolbarWindow.setToolbarEnabled(toolbarEnabled);
};

export const registerSettingsHandlers = () => {
  ipcMain.on(SettingChannel.CHANGE_THEME, changeTheme);
  ipcMain.on(SettingChannel.GET_THEME, getTheme);
  ipcMain.handle(SettingChannel.GET_PRESETS, getPresets);
  ipcMain.on(SettingChannel.SET_PRESETS, setPresets);
  ipcMain.on(ToolbarChannel.GET_TOOLBAR_ALPHA, getToolbarAlpha);
  ipcMain.on(ToolbarChannel.SET_TOOLBAR_ALPHA, setToolbarAlpha);
  ipcMain.handle(SettingChannel.DO_REQUEST, doRequest);
  ipcMain.handle(SettingChannel.SHOW_NOTIFICATION, triggerNotification);
  ipcMain.on(SettingChannel.TOOLBAR_ENABLED, setToolbarEnabled);
};
