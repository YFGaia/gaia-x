import { IpcChannels, IpcRequest, IpcResponse } from "@/types/ipc/ipc";
import { IpcMainInvokeEvent } from "electron";
import FileManager from "~/main/services/file/FileManager";
import path from 'path';

export const fileHandler = {
  get: async (_: IpcMainInvokeEvent, request: IpcRequest[IpcChannels.OPEN_FILE]): Promise<IpcResponse[IpcChannels.OPEN_FILE]> => {
    const fileType = path.extname(request.path) === '.json' ? 'json' : 'text';
    const result = FileManager.get(request.path, fileType);
    return fileType === 'json' ? JSON.stringify(result) : result as string;
  },
  
  set: async (_: IpcMainInvokeEvent, request: IpcRequest[IpcChannels.SAVE_FILE]): Promise<IpcResponse[IpcChannels.SAVE_FILE]> => {
    const fileType = path.extname(request.path) === '.json' ? 'json' : 'text';
    let content = request.content;
    
    if (fileType === 'json') {
      try {
        content = JSON.parse(request.content);
      } catch (error) {
        console.error('JSON解析失败:', error);
        return false;
      }
    }
    
    return FileManager.set(request.path, content, fileType);
  }
};