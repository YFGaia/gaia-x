import { IpcRequest, IpcResponse, IpcChannels } from '@/types/ipc/ipc';
import { IpcMainInvokeEvent } from 'electron';
import { settingManager } from '~/main/services/config/SettingManager';
import { SettingsState } from '@/stores/SettingStore';

export const settingHandler = {
  get: (
    _: IpcMainInvokeEvent,
    request: IpcRequest[IpcChannels.GET_APP_STATE]
  ): IpcResponse[IpcChannels.GET_APP_STATE] => {
    return settingManager.get(request.key as keyof SettingsState);
  },
  set: async (
    _: IpcMainInvokeEvent,
    request: IpcRequest[IpcChannels.SET_APP_STATE]
  ): Promise<IpcResponse[IpcChannels.SET_APP_STATE]> => {
    return settingManager.set(request.key as keyof SettingsState, request.value);
  },
  getAll: (_: IpcMainInvokeEvent): IpcResponse[IpcChannels.GET_ALL_APP_STATE] => {
    return settingManager.read();
  },
};
