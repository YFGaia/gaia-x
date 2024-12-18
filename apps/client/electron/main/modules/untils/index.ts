import { UtilsChannel } from '@/types/ipc/utils';
import { ipcMain } from 'electron';
import { app } from 'electron';

export function setupUtils() {
  ipcMain.handle(UtilsChannel.APP_VERSION, () => {
    return app.getVersion();
  });
  
}
