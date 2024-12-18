import { app, ipcMain } from 'electron';
import { createRequire } from 'node:module';
import type { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater';
import { UtilsChannel } from '@/types/ipc/utils';
import { AppVersion } from '@/api';
import UpdateWindow from './services/window/UpdateWindow';
import { WindowManager } from './services/window/WindowManager';
import { WindowId } from '@/types/window';
import { globalSettings } from './index';

const { autoUpdater } = createRequire(import.meta.url)('electron-updater');

export function update() {
  // When set to false, the update download will be triggered through the API
  autoUpdater.autoDownload = false;
  autoUpdater.disableWebInstaller = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.forceDevUpdateConfig = true;
  // // 设置开发测试用更新源
  // autoUpdater.setFeedURL({
  //   provider: 'generic',
  //   url: 'http://wu.update.local/latest/'
  // })

  // start check
  autoUpdater.on('checking-for-update', function () {});
  // update available
  autoUpdater.on('update-available', (arg: UpdateInfo) => {
    console.log('update-available', arg);
    const win = WindowManager.getInstance().getWindow(WindowId.Update);
    win.webContents.send('update-can-available', {
      update: true,
      version: app.getVersion(),
      newVersion: arg?.version,
    });
  });
  // update not available
  autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
    const win = WindowManager.getInstance().getWindow(WindowId.Update);
    win.webContents.send('update-can-available', {
      update: false,
      version: app.getVersion(),
      newVersion: arg?.version,
    });
  });
}
export function setupUpdate() {
  // Checking for updates
  ipcMain.handle('check-update', async () => {
    // if (!app.isPackaged) {
    //   const error = new Error('The update feature is only available after the package.')
    //   return { message: error.message, error }
    // }
    try {
      return await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      console.log(error);
      return { message: 'Network error', error };
    }
  });

  // Start downloading and feedback on progress
  ipcMain.handle('start-download', (event: Electron.IpcMainInvokeEvent) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          // feedback download error message
          event.sender.send('update-error', { message: error.message, error });
        } else {
          // feedback update progress message
          event.sender.send('download-progress', progressInfo);
        }
      },
      () => {
        // feedback update downloaded message
        event.sender.send('update-downloaded');
      }
    );
  });

  ipcMain.handle('update-close-window', () => {
    if (globalSettings.forceUpdate) {
      WindowManager.getInstance().closeAllWindows();
    } else {
      WindowManager.getInstance().closeWindow(WindowId.Update);
    }
  });

  // Install now
  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.on(
    UtilsChannel.SHOW_UPDATE,
    (_: Electron.IpcMainInvokeEvent, versionInfo: AppVersion) => {
      autoUpdater.setFeedURL({
        provider: 'generic',
        channel: 'latest',
        url: versionInfo.download_url,
      });
      const windowManager = WindowManager.getInstance();
      const windows = windowManager.getWindows();
      if (versionInfo.force_update) {
        globalSettings.forceUpdate = true;
        windows.forEach((window, id) => {
          if (id !== WindowId.Update) {
            window.hide();
          }
        });
      }

      if (windows.has(WindowId.Update)) {
        const win = windows.get(WindowId.Update);
        win?.show();
      } else {
        const win = UpdateWindow.createWindow(versionInfo.force_update);
      }
    }
  );
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void
) {
  autoUpdater.on('download-progress', (info: ProgressInfo) => callback(null, info));
  autoUpdater.on('error', (error: Error) => callback(error, null));
  autoUpdater.on('update-downloaded', complete);
  autoUpdater.downloadUpdate();
}
