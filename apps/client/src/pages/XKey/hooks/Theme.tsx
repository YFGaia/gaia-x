import { useState, useEffect, useCallback } from 'react';
import { SettingChannel } from '@/types/ipc/xKey';
import { DEFAULT_THEME, Theme, isValidTheme } from '@/types/xKey/theme';

/**
 * 管理主题的钩子
 * @returns {object} 主题管理对象
 * @property {Theme} theme - 当前主题
 * @property {(theme: Theme) => void} changeTheme - 改变主题
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  const handleThemeChange = useCallback((newTheme: string) => {
    if (!isValidTheme(newTheme)) {
      console.error('Invalid theme:', newTheme);
      return;
    }

    console.log('changeTheme', newTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add('light');  // 先固定亮色主题。TODO: 主题更新逻辑统一。
    setTheme(newTheme);
  }, []);

  useEffect(() => {
    // console.log(window);
    // Listen for theme updates from main process
    const cleanUp = window.ipcRenderer.on(SettingChannel.UPDATE_THEME, (_, newTheme: string) => {
      handleThemeChange(newTheme);
    });
    // Request current theme from main process
    window.ipcRenderer.send(SettingChannel.GET_THEME, null);

    return () => {
      cleanUp();
    };
  }, [handleThemeChange]);

  const changeTheme = useCallback(
    (newTheme: Theme) => {
      window.ipcRenderer.send?.(SettingChannel.CHANGE_THEME, newTheme);
      handleThemeChange(newTheme);
    },
    [handleThemeChange]
  );

  return {
    theme,
    changeTheme,
  };
};
