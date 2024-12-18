import { IpcChannels } from "@/types/ipc/ipc";
import { ipcMain } from "electron";
import { appStateHandler } from "~/main/ipc/handlers/config/appState";
import { settingHandler } from "~/main/ipc/handlers/config/settingState";

export async function setupConfig() {
  ipcMain.handle(IpcChannels.GET_APP_STATE, appStateHandler.get);
  ipcMain.handle(IpcChannels.SET_APP_STATE, appStateHandler.set);
  ipcMain.handle(IpcChannels.GET_ALL_APP_STATE, appStateHandler.getAll);
  
  ipcMain.handle(IpcChannels.GET_SETTING_STATE, settingHandler.get);
  ipcMain.handle(IpcChannels.SET_SETTING_STATE, settingHandler.set);
  ipcMain.handle(IpcChannels.GET_ALL_SETTING_STATE, settingHandler.getAll);
}
