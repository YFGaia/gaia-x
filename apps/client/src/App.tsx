import { useSettingStore } from '@/stores/SettingStore';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import Layout from './pages/Layout';
import Schedule from './pages/Schedule';
import { useMcpToolStore } from './stores/McpToolStore';
import { useUserStore } from './stores/UserStore';
import { ConfigProvider, Spin, theme } from 'antd';
// import { SqliteUserChannel } from './types/ipc/sqlite/user';
// import Login from './pages/Login';
// import { UserApi, VersionApi } from './api';
// import { UtilsChannel } from './types/ipc/utils';
import { useAppStateStore } from './stores/AppStateStore';
import { VersionService } from './services/VersionService';
import { SettingChannel } from './types/ipc/xKey';
import { useViewStore, ViewType } from './stores/ViewStore';
import { WindowChannel } from './types/ipc/windowControl';

// 主题色变量定义
const primaryColor = '#1677ff';
const successColor = '#52c41a';
const warningColor = '#faad14';
const errorColor = '#ff4d4f';
const infoColor = '#1677ff';

// 深色主题配置
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: primaryColor,
    colorSuccess: successColor,
    colorWarning: warningColor,
    colorError: errorColor,
    colorInfo: infoColor,
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    Button: {
      colorPrimary: primaryColor,
      algorithm: true,
    },
    Menu: {
      colorItemBg: 'transparent',
      colorSubItemBg: 'transparent',
      colorItemText: 'rgba(255, 255, 255, 0.65)',
      colorItemTextHover: '#fff',
      colorItemTextSelected: '#fff',
      colorActiveBarWidth: 0,
      colorActiveBarHeight: 0,
      colorActiveBarBorderSize: 0,
    },
    Card: {
      colorBgContainer: '#1f1f1f',
    },
    Table: {
      colorBgContainer: '#141414',
      colorFillAlter: 'rgba(255, 255, 255, 0.04)',
    },
    Drawer: {
      colorBgElevated: '#1f1f1f',
    },
    Modal: {
      colorBgElevated: '#1f1f1f',
    },
    Select: {
      colorBgElevated: '#1f1f1f',
      colorBgContainer: '#141414',
    },
    Input: {
      colorBgContainer: '#141414',
    },
  },
};

// 浅色主题配置
const lightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: primaryColor,
    colorSuccess: successColor,
    colorWarning: warningColor,
    colorError: errorColor,
    colorInfo: infoColor,
    borderRadius: 6,
    wireframe: false,
  },
  components: {
    Button: {
      colorPrimary: primaryColor,
      algorithm: true,
    },
    Menu: {
      colorItemBg: 'transparent',
      colorSubItemBg: 'transparent',
    },
    Card: {
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    },
    Table: {
      colorFillAlter: 'rgba(0, 0, 0, 0.02)',
    },
    Drawer: {
      colorBgElevated: '#ffffff',
    },
    Modal: {
      colorBgElevated: '#ffffff',
    },
  },
};

const AppGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setUserInfo, userInfo } = useUserStore();
  const theme: string = useSettingStore((state) => state.settings['app.theme']);
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
    if (theme === 'dark') {
      setThemeConfig(darkTheme);
    } else if (theme === 'light') {
      setThemeConfig(lightTheme);
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
