import { IpcChannels } from '@/types/ipc/ipc';
import { ipcMain, IpcMainInvokeEvent, nativeTheme } from 'electron';
import { settingManager } from '~/main/services/config/SettingManager';

type ThemeMap = 'system' | 'light' | 'dark';

export class ThemeHandler {
  constructor() {
    settingManager.get('app.theme').then((res) => (nativeTheme.themeSource = res));

    ipcMain.handle(IpcChannels.SET_THEME, (_: IpcMainInvokeEvent, theme: ThemeMap): void => {
      nativeTheme.themeSource = theme;
    });
  }
}
