import { VersionApi, UserApi } from '@/api';
import { Logo } from '@/components/Logo';
import { VersionService } from '@/services/VersionService';
import { useUserStore } from '@/stores/UserStore';
import { SqliteUserChannel } from '@/types/ipc/sqlite/user';
import { UtilsChannel } from '@/types/ipc/utils';
import { WindowChannel } from '@/types/ipc/windowControl';
import { CloseOutlined } from '@ant-design/icons';
import { Button, theme } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

const useStyle = createStyles(({ token, css }) => {
  return {
    container: css`
      position: relative;
      -webkit-app-region: drag;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      align-items: center;
      background-color: ${token.colorBgLayout};
    `,
    loginBtn: css`
      width: 120px;
      -webkit-app-region: no-drag;
    `,
    logo: css``,
    header: css`
      position: absolute;
      -webkit-app-region: no-drag;
      top: 8px;
      right: 8px;
    `,
  };
});

const Login: React.FC<{ className?: string }> = ({ className }) => {
  const { styles } = useStyle();
  const { token } = theme.useToken();
  const { userInfo, setUserInfo } = useUserStore();
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    window.open(import.meta.env.VITE_SSO_LOGIN_URL, '_blank');
  };

  const closeWindow = () => {
    window.close();
  };

  async function getUserInfo(token: string): Promise<boolean> {
    try {
      console.log('我调用的3');
      const response = await UserApi.getUserInfo(token);
      if (response.code !== 0 || !response.data) {
        setLoading(false);
        console.error('获取用户信息失败:', response.message);
        return false;
      }
      const { user_id, name, jwt_token } = response.data;
      const userInfo = {
        id: user_id,
        username: name,
        token: jwt_token,
      };
      console.log(userInfo);
      if (
        await window.ipcRenderer.invoke(SqliteUserChannel.UPDATE_USER, ...Object.values(userInfo))
      ) {
        setUserInfo(userInfo);
      }
      return true;
    } catch (error) {
      setLoading(false);
      console.error('获取用户信息出错:', error);
      return false;
    }
  }

  function loginSuccess(userId: string) {
    VersionService.checkUpdate(false);
    window.ipcRenderer.send(WindowChannel.LOGIN_SUCCESS, userId);
  }

  useEffect(() => {
    const initialize = async () => {
      const userInfoData = await useUserStore.getState().initialize();
      let localLoading = false
      if (userInfoData != undefined && userInfoData.token) {
        setLoading(true);
        localLoading = true;
        const appVersion : string = await window.ipcRenderer.invoke(UtilsChannel.APP_VERSION);
        await VersionApi.getVersion(appVersion).catch((err) => {
          if (err.status === 401) {
            setLoading(false);
            localLoading = false;
          }
        });
        if (localLoading) {
          window.ipcRenderer.invoke(WindowChannel.GET_ALL_INFO).then(res => {
            UserApi.uploadInfo(res)
          });
          loginSuccess(userInfoData.id);
          setLoading(false);
          localLoading = false;
        }
      }
    };
    initialize();
    const cleanUp = window.ipcRenderer.on('set-token', async (_, token: string) => {
      const loginSucc = await getUserInfo(token);
      if (loginSucc) {
        loginSuccess(userInfo.id);
      }
    });
    return () => {
      cleanUp();
    };
  }, []);

  return (
    <div className={`${styles.container} ${className}`}>
      <Logo size="large" className={styles.logo} />
      <Button
        onClick={login}
        size="large"
        type="primary"
        className={styles.loginBtn}
        loading={loading}
      >
        登录
      </Button>
      <div className={styles.header}>
        <CloseOutlined onClick={closeWindow} />
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Login />
  </React.StrictMode>
);

export default Login;
