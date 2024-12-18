import { EncryptionChannel } from "@/types/ipc/encryption";

export class Encryption {
    static encrypt(data: string, password: string) {
        return window.ipcRenderer.invoke(EncryptionChannel.ENCRYPT, data, password);
    }

    static decrypt(data: string, password: string) {
        return window.ipcRenderer.invoke(EncryptionChannel.DECRYPT, data, password);
    }
}