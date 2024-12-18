import { useAppStateStore } from '@/stores/AppStateStore';
import { WindowChannel } from '@/types/ipc/windowControl';
import { Button } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscChromeRestore,
} from 'react-icons/vsc';
import { AiFillPushpin, AiOutlinePushpin } from 'react-icons/ai';
import styles from './index.module.css';
import { SelectOutlined } from '@ant-design/icons';
import { useViewStore } from '@/stores/ViewStore';

function handleMinimize() {
  window.ipcRenderer.invoke(WindowChannel.MINIMIZE);
  (document.activeElement as HTMLElement)?.blur();
}

function handleMaximize() {
  window.ipcRenderer.invoke(WindowChannel.MAXIMIZE);
  (document.activeElement as HTMLElement)?.blur();
}

function handleClose(mode: string) {
  window.ipcRenderer.invoke(WindowChannel.CLOSE, mode);
  (document.activeElement as HTMLElement)?.blur();
}

const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const { mode, setMode } = useAppStateStore();
  const { viewParams } = useViewStore();

  useEffect(() => {
    if (viewParams?.mode) {
      setMode(viewParams.mode);
    }
  }, [viewParams?.mode]);


  console.log('windows controls mode', mode);
  function handleExpand() {
    setMode('normal');
    window.ipcRenderer.send(WindowChannel.SHOW_CHAT_WINDOW);
  }
  const handleBlur = useCallback(() => {
    if (!isPinned && mode === 'mini') {
      window.ipcRenderer.send(WindowChannel.HIDE_WINDOW);
    }
  }, [isPinned, mode]);

  useEffect(() => {
    window.ipcRenderer.invoke(WindowChannel.IS_MAXIMIZED).then((res) => {
      setIsMaximized(res);
    });
    const cleanMaxed = window.ipcRenderer.on('window:maximized', () => {
      setIsMaximized(true);
    });
    const cleanUnMaxed = window.ipcRenderer.on('window:unmaximized', () => setIsMaximized(false));

    window.addEventListener('blur', handleBlur);

    return () => {
      cleanMaxed();
      cleanUnMaxed();
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleBlur]);

  const handlePin = () => {
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    setMode(!newPinnedState ? 'normal' : 'mini');
    window.ipcRenderer.send(WindowChannel.PIN_WINDOW, newPinnedState);
  };

  return (
    <div className="color-red">
      {mode != 'mini' && (
        <>
          <Button
            type="text"
            icon={<VscChromeMinimize />}
            className={`!px-6 ${styles.button} `}
            onClick={handleMinimize}
          />
          <Button
            type="text"
            icon={isMaximized ? <VscChromeRestore /> : <VscChromeMaximize />}
            className={`!px-6 ${styles.button} `}
            onClick={handleMaximize}
          />
        </>
      )}
      {mode === 'mini' && (
        <>
          <Button
            type="text"
            icon={<SelectOutlined />}
            className={`!px-6 ${styles.button} `}
            onClick={handleExpand}
          />
          <Button
            type="text"
            icon={isPinned ? <AiFillPushpin /> : <AiOutlinePushpin />}
            className={`!px-6 ${styles.button} `}
            onClick={handlePin}
          />
        </>
      )}
      <Button
        type="text"
        icon={<VscChromeClose />}
        className={`!px-6 ${styles.button} `}
        onClick={() => {
          handleClose(mode);
        }}
      />
    </div>
  );
};

export default WindowControls;
