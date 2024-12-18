import { useSettingStore } from '@/stores/SettingStore';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import Layout from './pages/Layout';
import Schedule from './pages/Schedule';
import { useMcpToolStore } from './stores/McpToolStore';
import { useUserStore } from './stores/UserStore';
import { ConfigProvider, Spin } from 'antd';
import { SqliteUserChannel } from './types/ipc/sqlite/user';
import Login from './pages/Login';
import { UserApi, VersionApi } from './api';
import { UtilsChannel } from './types/ipc/utils';
import { useAppStateStore } from './stores/AppStateStore';
import { VersionService } from './services/VersionService';
import { SettingChannel } from './types/ipc/xKey';
import { useViewStore, ViewType } from './stores/ViewStore';
import { WindowChannel } from './types/ipc/windowControl';

const AppGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setUserInfo, userInfo } = useUserStore();
  const theme = useSettingStore((state) => state.settings['app.theme']);
  const [themeConfig, setThemeConfig] = useState<Record<string, any>>({});
  const { setUpdate } = useAppStateStore();
  const { setView } = useViewStore();
  const [loading, setLoading] = useState(false);

  // 初始化标志,防止严格模式下重复执行
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    // initRef.current = true;
    const init = async () => {
      setLoading(true);
      useSettingStore.getState().initialize();
      useMcpToolStore.getState().initialize();
      await useUserStore.getState().initialize();
      if (await VersionService.checkUpdate(false)) {
        setUpdate();
      }
      setLoading(false);
    };
    init();
    const cleanShowSettings = window.ipcRenderer.on(SettingChannel.SHOW_SETTINGS, () => {
      setView('setting');
    });

    const cleanShowChatWindow = window.ipcRenderer.on(
      WindowChannel.SHOW_CHAT_WINDOW,
      (_: Electron.IpcRendererEvent, { view, mode }: { view: ViewType, mode: string }) => {
        console.log('show chat window', view, mode);
        setView(view, {
          mode: mode || 'normal',
        });
      }
    );

    return () => {
      cleanShowSettings?.();
      cleanShowChatWindow?.();
    };
  }, []);
  useEffect(() => {
    if (theme) {
      setThemeConfig(theme);
    }
  }, [theme]);
  return (
    <>
      {loading && (
        <div className="loading-container">
          <Spin />
        </div>
      )}
      {!loading && <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>}
    </>
  );
};

function App() {
  return (
    <AppGuard>
      <Schedule />
      <div className="App">
        <Layout />
      </div>
    </AppGuard>
  );
}

export default App;
