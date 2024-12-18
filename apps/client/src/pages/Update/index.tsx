import ReactDOM from 'react-dom/client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ProgressInfo } from 'electron-updater';
import { createStyles } from 'antd-style';
import { AppVersion, VersionApi } from '@/api';
import { UtilsChannel } from '@/types/ipc/utils';
import { useUserStore } from '@/stores/UserStore';
import { Button, Progress } from 'antd';

const useStyle = createStyles(({ token, css }) => ({
  modalSlot: css`
    padding: 10px;
    padding-top: 20px;
    -webkit-app-region: drag;
  `,
  header: css`
    position: absolute;
    -webkit-app-region: no-drag;
    top: 10px;
    right: 10px;
  `,
  updateAvailable: css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 18px;
  `,
  description: css`
    font-size: 12px;
    color: ${token.colorTextDescription};
    height: 30px;
    overflow-y: auto;
  `,
  footer: css`
    -webkit-app-region: no-drag;
    margin-top: 10px;
    display: flex;
    justify-content: end;
    gap: 10px;
  `,
  forceUpdate: css`
    color: ${token.colorTextDescription};
    display: inline-block;
    font-size: 12px;
    color: ${token.colorWarning};
  `,
}));

const Update: React.FC = () => {
  const { styles } = useStyle();
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>();
  const [updateError, setUpdateError] = useState<ErrorType>();
  const [progressInfo, setProgressInfo] = useState<Partial<ProgressInfo>>();
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [appVersion, setAppVersion] = useState<AppVersion>();
  const [modalBtn, setModalBtn] = useState<{
    cancelText?: string;
    okText?: string;
    onCancel?: () => void;
    onOk?: () => void;
  }>({
    onCancel: () => window.ipcRenderer.invoke('update-close-window'),
    onOk: () => window.ipcRenderer.invoke('start-download'),
  });

  const checkUpdate = async () => {
    console.log('checkUpdate');
    const appVersion = await window.ipcRenderer.invoke(UtilsChannel.APP_VERSION);
    const newVersion = await VersionApi.getVersion(appVersion);
    setAppVersion(newVersion.data);
    console.log('newVersion', newVersion);
    setChecking(true);
    /**
     * @type {import('electron-updater').UpdateCheckResult | null | { message: string, error: Error }}
     */
    const result = await window.ipcRenderer.invoke('check-update');
    console.log('checkUpdate2222', result);
    setProgressInfo({ percent: 0 });
    setChecking(false);
    setModalOpen(true);
    if (result?.error) {
      setUpdateAvailable(false);
      setUpdateError(result?.error);
    }
  };

  const onUpdateCanAvailable = useCallback(
    (_event: Electron.IpcRendererEvent, arg1: VersionInfo) => {
      setVersionInfo(arg1);
      setUpdateError(undefined);
      // Can be update
      if (arg1.update) {
        setModalBtn((state) => ({
          ...state,
          cancelText: '取消',
          okText: '更新',
          onOk: () => window.ipcRenderer.invoke('start-download'),
        }));
        setUpdateAvailable(true);
      } else {
        setUpdateAvailable(false);
      }
    },
    []
  );

  const onUpdateError = useCallback((_event: Electron.IpcRendererEvent, arg1: ErrorType) => {
    setUpdateAvailable(false);
    setUpdateError(arg1);
    console.log(arg1);
  }, []);

  const onDownloadProgress = useCallback(
    (_event: Electron.IpcRendererEvent, arg1: ProgressInfo) => {
      setProgressInfo(arg1);
    },
    []
  );

  const onUpdateDownloaded = useCallback((_event: Electron.IpcRendererEvent, ...args: any[]) => {
    setProgressInfo({ percent: 100 });
    setModalBtn((state) => ({
      ...state,
      cancelText: '取消',
      okText: '安装',
      onOk: () => window.ipcRenderer.invoke('quit-and-install'),
    }));
  }, []);

  useEffect(() => {
    // Get version information and whether to update
    window.ipcRenderer.on('update-can-available', onUpdateCanAvailable);
    window.ipcRenderer.on('update-error', onUpdateError);
    window.ipcRenderer.on('download-progress', onDownloadProgress);
    window.ipcRenderer.on('update-downloaded', onUpdateDownloaded);

    return () => {
      window.ipcRenderer.off('update-can-available', onUpdateCanAvailable);
      window.ipcRenderer.off('update-error', onUpdateError);
      window.ipcRenderer.off('download-progress', onDownloadProgress);
      window.ipcRenderer.off('update-downloaded', onUpdateDownloaded);
    };
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const userInfoData = await useUserStore.getState().initialize();
      if (userInfoData != undefined && userInfoData.token) {
        checkUpdate();
      }
    };
    initialize();
  }, []);

  const forceUpdateDiv = () => {
    if (appVersion?.force_update) {
      return <div className={styles.forceUpdate}>（ 重要更新！）</div>;
    }
    return null;
  };

  return (
    <div className={`${styles.modalSlot} `}>
      {updateError ? (
        <div>
          <p>下载最新版本失败</p>
          <p>{updateError.message}</p>
        </div>
      ) : updateAvailable ? (
        <div className={`${styles.updateAvailable} `}>
          <div>发现新版本: v{appVersion?.version} {forceUpdateDiv()}</div>
          <div className={`${styles.description} `}>{appVersion?.description}</div>
          <div className="update__progress">
            <div className="progress__bar">
              <Progress percent={progressInfo?.percent}></Progress>
            </div>
          </div>
        </div>
      ) : (
        <div className="can-not-available">{JSON.stringify(versionInfo ?? {}, null, 2)}</div>
      )}
      <div className={styles.footer}>
        <Button onClick={modalBtn.onOk}>{modalBtn.okText}</Button>
        <Button onClick={modalBtn.onCancel}>{modalBtn.cancelText}</Button>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Update />
  </React.StrictMode>
);
