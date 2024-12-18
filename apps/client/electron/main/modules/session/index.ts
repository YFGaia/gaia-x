import { ipcMain } from "electron";
import { sessionHandler } from "../../ipc/handlers/session";
import { SessionChannel } from "@/types/ipc/session";

export function setupSession() {
    ipcMain.handle(SessionChannel.SET_SESSION, sessionHandler.setSession)
    ipcMain.handle(SessionChannel.GET_COOKIES, sessionHandler.getCookies)
    ipcMain.handle(SessionChannel.REMOVE_COOKIE, sessionHandler.removeCookie)
}