import { EncryptionChannel } from '@/types/ipc/encryption';
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Encryption } from '~/main/utils/encryption';

export async function setupEncryption() {
  ipcMain.handle(EncryptionChannel.ENCRYPT, (_: IpcMainInvokeEvent, data: string, password: string) => {
    return Encryption.encrypt(data, password);
  });
  ipcMain.handle(EncryptionChannel.DECRYPT, (_: IpcMainInvokeEvent, data: string, password: string) => {
    return Encryption.decrypt(data, password);
  });
}
