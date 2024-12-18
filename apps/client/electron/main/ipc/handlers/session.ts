import { IpcMainInvokeEvent } from 'electron';
import {
  SessionConfig,
  SessionManager
} from '~/main/services/session/SessionManager';
export const sessionHandler = {
  setSession: (_: IpcMainInvokeEvent, request: SessionConfig) => {
    return SessionManager.setSession(request);
  },
  getCookies: (_: IpcMainInvokeEvent, partition: string) => {
    return SessionManager.getCookies(partition);
  },
  removeCookie: (
    _: IpcMainInvokeEvent,
    request: { partition: string; url: string; name?: string }
  ) => {
    return SessionManager.removeCookie(request.partition, request.url, request.name);
  },
};