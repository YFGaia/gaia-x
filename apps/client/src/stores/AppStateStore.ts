import { IpcChannels } from '@/types/ipc/ipc';
import { create } from 'zustand';
import { useRemoteStore } from './RemoteStore';

type Mode = 'normal' | 'remote' | 'mini';

export interface AppState {
  leftPanel: 'open' | 'close';
  rightPanel: 'open' | 'close';
  mode: Mode;
  canUpdate: Boolean;
  windowWidth: number;
  windowHeight: number;
}

interface AppStateStore extends AppState {
  initConfig: () => Promise<void>;
  setConfig: (key: keyof AppState, value: AppState[keyof AppState]) => Promise<boolean>;
  updateConfig: (config: Partial<AppState>) => void;
  setMode: (mode: Mode, url?: string) => void;
  setUpdate: () => void;
}

export const useAppStateStore = create<AppStateStore>((set) => ({
  leftPanel: 'close',
  rightPanel: 'close',
  mode: 'normal',
  canUpdate: false,
  windowWidth: 960,
  windowHeight: 600,
  initConfig: async () => {
    const config = await window.ipcRenderer.invoke(IpcChannels.GET_ALL_APP_STATE);
    set(config);
  },
  setConfig: async (key, value) => {
    await window.ipcRenderer.invoke(IpcChannels.SET_APP_STATE, { key, value });
    set({ [key]: value });
    return true;
  },
  updateConfig: (config) => {
    set(config);
  },
  setMode: async (mode: Mode, url?: string) => {
    set({ mode });
    if (mode === 'remote') {
      await useRemoteStore.getState().waitLoaded(url || '');
    } else {
      useRemoteStore.getState().setLoaded(false);
    }
  },
  setUpdate: () => {
    set({ canUpdate: true });
  },
}));

window.ipcRenderer.on(IpcChannels.SET_APP_STATE, (_) => {
  useAppStateStore.getState().initConfig();
});
