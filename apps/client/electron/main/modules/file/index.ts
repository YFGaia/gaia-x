import { IpcChannels } from "@/types/ipc/ipc";
import { ipcMain } from "electron";
import { fileHandler } from "~/main/ipc/handlers/file";

export async function setupFile() {
  ipcMain.handle(IpcChannels.OPEN_FILE, fileHandler.get);
  ipcMain.handle(IpcChannels.SAVE_FILE, fileHandler.set);
}
