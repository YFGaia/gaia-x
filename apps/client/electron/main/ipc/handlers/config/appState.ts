import { IpcRequest, IpcResponse, IpcChannels } from '@/types/ipc/ipc';
import { IpcMainInvokeEvent } from 'electron';
import { appStateManager } from '~/main/services/config/AppStateManager';
import { AppState } from '@/stores/AppStateStore';

export const appStateHandler = {
  get: (
    _: IpcMainInvokeEvent,
    request: IpcRequest[IpcChannels.GET_APP_STATE]
  ): IpcResponse[IpcChannels.GET_APP_STATE] => {
    return appStateManager.get(request.key as keyof AppState);
  },
  set: async (
    _: IpcMainInvokeEvent,
    request: IpcRequest[IpcChannels.SET_APP_STATE]
  ): Promise<IpcResponse[IpcChannels.SET_APP_STATE]> => {
    return appStateManager.set(request.key as keyof AppState, request.value);
  },
  getAll: (_: IpcMainInvokeEvent): IpcResponse[IpcChannels.GET_ALL_APP_STATE] => {
    return appStateManager.read();
  },
};
