import { WindowChannel } from '@/types/ipc/windowControl';

export class WindowService {
  static logout(userId: string) {
    window.ipcRenderer.send(WindowChannel.LOGOUT, userId);
  }
}
