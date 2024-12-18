/// <reference types="vite/client" />

interface Window {
  // expose in the `electron/preload/index.ts`
  xKeyIpcRenderer: import('electron').IpcRenderer;
  ipcRenderer: Omit<import('electron').IpcRenderer, 'on'> & {
    on: (channel: string, listener: (event: import('electron').IpcRendererEvent, ...args: any[]) => void) => () => void;
  };
}