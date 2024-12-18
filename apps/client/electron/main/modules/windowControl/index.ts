import { WindowChannel } from '@/types/ipc/windowControl';
import { BrowserWindow, ipcMain, IpcMainInvokeEvent, app } from 'electron';
import LoginWindow from '~/main/services/window/LoginWindow';
import { settingManager } from '~/main/services/config/SettingManager';
import { WindowManager } from '~/main/services/window/WindowManager';
import { WindowId } from '@/types/window';
import { UserManager } from '~/main/services/sqlite/modules/user';
import { SqliteManager } from '~/main/services/sqlite';
import MainWindow from '~/main/services/window/MainWindow';

import os from 'os';
import { screen } from 'electron';
import path from 'path';
export function setupWindowControl() {
  ipcMain.handle(WindowChannel.MAXIMIZE, (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win?.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle(WindowChannel.MINIMIZE, (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  //TODO 这里应该进行优化，封装窗口类，调用窗口的关闭方法
  ipcMain.handle(WindowChannel.CLOSE, async (event: IpcMainInvokeEvent, mode: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const closeMode = await settingManager.get('app.closeMode');
    if (mode == 'mini' || closeMode == 'mini') {
      win?.hide();
    } else {
      win?.close();
    }
  });

  ipcMain.handle(WindowChannel.IS_MAXIMIZED, (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isMaximized();
  });

  ipcMain.on(WindowChannel.LOGIN_SUCCESS, (event: IpcMainInvokeEvent, userId: string) => {
    LoginWindow.loginSuccess(userId);
  });

  ipcMain.on(WindowChannel.PIN_WINDOW, (event: IpcMainInvokeEvent, isPinned: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.setAlwaysOnTop(isPinned);
  });

  ipcMain.on(WindowChannel.HIDE_WINDOW, (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.hide();
  });

  ipcMain.on(WindowChannel.LOGOUT, (event: IpcMainInvokeEvent, userId: string) => { 
    const windowManager = WindowManager.getInstance();
    const userSqlite = new UserManager(SqliteManager.getInstance().db);
    userSqlite.logout(userId);
    windowManager.getWindows().forEach((window, key) => {
      if (key != WindowId.Login) {
        window.hide();
      }
    });
    windowManager.getWindow(WindowId.Login)?.show();
  });

  ipcMain.on(WindowChannel.SHOW_CHAT_WINDOW, (event: IpcMainInvokeEvent) => { 
    MainWindow.showWindow();
  });

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  ipcMain.handle(WindowChannel.GET_ALL_INFO, async () => {
    // 收集所有系统信息并一次性返回
    return {
      // 基本系统信息
      system: {
        platform: process.platform,
        arch: process.arch,
        osRelease: os.release(),
        osType: os.type(),
        osVersion: os.version(),
        uptime: os.uptime(),
        hostname: os.hostname(),
        endianness: os.endianness(),
        tmpdir: os.tmpdir(),
        EOL: os.EOL === '\n' ? 'LF' : 'CRLF',
      },
      
      // 硬件信息
      hardware: {
        cpu: {
          model: os.cpus()[0]?.model || '未知',
          cores: os.cpus().length,
          speed: os.cpus()[0]?.speed || 0,
          architecture: process.arch,
        },
        memory: {
          total: os.totalmem(),
          totalFormatted: formatBytes(os.totalmem()),
          free: os.freemem(),
          freeFormatted: formatBytes(os.freemem()),
          usage: Math.round((1 - os.freemem() / os.totalmem()) * 100),
        },
        loadAverage: os.loadavg(),
      },
      
      // 显示器信息
      display: {
        count: screen.getAllDisplays().length,
        primary: {
          bounds: screen.getPrimaryDisplay().bounds,
          workArea: screen.getPrimaryDisplay().workArea,
          scaleFactor: screen.getPrimaryDisplay().scaleFactor,
          colorDepth: screen.getPrimaryDisplay().colorDepth,
          size: {
            width: screen.getPrimaryDisplay().size.width,
            height: screen.getPrimaryDisplay().size.height,
          },
        },
        all: screen.getAllDisplays().map(display => ({
          bounds: display.bounds,
          workArea: display.workArea,
          scaleFactor: display.scaleFactor,
          colorDepth: display.colorDepth,
          isPrimary: display.id === screen.getPrimaryDisplay().id,
        })),
      },
      
      // 应用信息
      app: {
        name: app.getName(),
        version: app.getVersion(),
        appPath: app.getAppPath(),
        locale: app.getLocale(),
        isPackaged: app.isPackaged,
        commandLine: {
          switch: app.commandLine.getSwitchValue('log-level'),
          hasSwitch: app.commandLine.hasSwitch('enable-logging'),
        },
      },
      
      // 应用路径信息
      paths: {
        appData: app.getPath('appData'),
        userData: app.getPath('userData'),
        temp: app.getPath('temp'),
        exe: app.getPath('exe'),
        module: app.getPath('module'),
        desktop: app.getPath('desktop'),
        logs: app.getPath('logs'),
        crashDumps: app.getPath('crashDumps'),
      },
      
      // 版本信息
      versions: {
        app: app.getVersion(),
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        v8: process.versions.v8,
        openssl: process.versions.openssl,
        zlib: process.versions.zlib,
      },
      
      // 网络信息 (仅返回非敏感信息)
      network: {
        interfaceCount: Object.keys(os.networkInterfaces()).length,
        hasWifi: Object.values(os.networkInterfaces()).some(
          ifaces => ifaces?.some(iface => iface.family === 'IPv4' && !iface.internal)
        ),
        hasEthernet: Object.values(os.networkInterfaces()).some(
          ifaces => ifaces?.some(iface => iface.family === 'IPv4' && !iface.internal)
        ),
      },
      
      // 进程信息
      process: {
        pid: process.pid,
        ppid: process.ppid,
        title: process.title,
        argv: process.argv,
        execPath: process.execPath,
        cwd: process.cwd(),
        resourceUsage: process.resourceUsage(),
      },

      // 时间信息
      time: {
        now: Date.now(),
        nowISO: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
      }
    };
  });
}
