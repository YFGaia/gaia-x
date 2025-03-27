import ReactDOM from 'react-dom/client';

import './toolbar.css';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ToolbarChannel, SettingChannel } from '@/types/ipc/xKey';
import { ToolAction } from '@/types/xKey/types';
import { getIcon } from '../assets/iconConfig';
import { useTheme } from '../hooks/Theme';
import { useSettingStore } from '@/stores/SettingStore';
import { getDefaultPresets } from '@/utils/xKey';

const ToolBar: React.FC = () => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarActions, setToolbarActions] = useState<ToolAction[]>(
    getDefaultPresets().presets.map((preset) => ({
      title: preset.title,
      icon: preset.icon,
      id: preset.id,
    }))
  );

  const toolbarTranslucent = useSettingStore((state) => state.settings['app.toolbarTranslucent']);

  const [toolbarSize, setToolbarSize] = useState(3);
  const [isVisible, setIsVisible] = useState(false);
  const alphaBeforeHoverRef = useRef(false);
  const [isAlpha, setIsAlpha] = useState(false); // 是否半透明，半透明状态下 hover 会请求后台获取剪贴板文本
  const shouldCallClipboardAgain = useRef(false);
  useTheme();

  // 监听 toolbarTranslucent 变化
  useEffect(() => {
    setIsAlpha(toolbarTranslucent);
  }, [toolbarTranslucent]);

  const handleAction = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    window.ipcRenderer.send(ToolbarChannel.TOOLBAR_ACTION, { id });
    window.ipcRenderer.send(ToolbarChannel.HIDE_TOOLBAR, null);
  };

  const handleMouseEnter = () => {
    if (shouldCallClipboardAgain.current) {
      // 使用 ref 防止多次触发
      shouldCallClipboardAgain.current = false;
      window.ipcRenderer.send(ToolbarChannel.TEXT_SELECTED_BY_CLIPBOARD, null);
    }
    setIsAlpha(false);
  };

  const handleMouseLeave = () => {
    setIsAlpha(toolbarTranslucent);
  };

  const handleToolbarAlpha = (_: Electron.IpcRendererEvent, alpha: boolean) => {
    alphaBeforeHoverRef.current = alpha;
    // 初始化 store
    useSettingStore.getState().initialize();
  };

  const handleShowToolbar = useCallback(
    (_: Electron.IpcRendererEvent, alpha: boolean, actions: ToolAction[]) => {
      const currentToolbarTranslucent =
        useSettingStore.getState().settings['app.toolbarTranslucent'];

      setIsVisible(true);
      setToolbarActions(actions);
      setIsAlpha(currentToolbarTranslucent);
      shouldCallClipboardAgain.current = alpha;
    },
    [] // 移除 toolbarTranslucent 依赖，因为我们每次都直接从 store 获取最新值
  );

  // 监听 toolbarActions 变化，在 DOM 更新后调整窗口大小
  useEffect(() => {
    if (!isVisible) return;
    
    // 使用 requestAnimationFrame 确保在下一帧DOM更新后执行
    requestAnimationFrame(() => {
      const bounds = toolbarRef.current?.getBoundingClientRect();
      if (bounds) {
        console.log('调整工具栏大小', bounds, toolbarActions);
        window.ipcRenderer.send(ToolbarChannel.RESIZE_TOOLBAR, {
          width: bounds.width,
          height: bounds.height,
        });
      }
    });
  }, [toolbarActions, isVisible]);

  useEffect(() => {
    // 初始化 store
    useSettingStore.getState().initialize();

    const handleTextSelected = (_: Electron.IpcRendererEvent, data: { text: string }) => {
      console.log('收到选中文本:', data.text);
    };

    const handleHideToolbar = () => {
      setIsVisible(false);
    };

    const handleUpdatePresets = (
      _: Electron.IpcRendererEvent,
      preset: { actions: ToolAction[]; toolbarSize: number }
    ) => {
      console.log('handleUpdatePresets', preset);
      const { actions, toolbarSize } = preset;
      console.log(actions);
      setToolbarActions(actions);
      setToolbarSize(toolbarSize);
      console.log('toolbarSize', toolbarSize);
    };

    // 调整工具栏大小
    // const bounds = toolbarRef.current?.getBoundingClientRect();
    // if (bounds) {
    //   console.log('调整工具栏大小', bounds);
    //   window.ipcRenderer.send(ToolbarChannel.RESIZE_TOOLBAR, {
    //     width: bounds.width,
    //     height: bounds.height,
    //   });
    // }

    const clearShowToolBar = window.ipcRenderer.on(ToolbarChannel.SHOW_TOOLBAR, handleShowToolbar);
    const cleanTextSelected = window.ipcRenderer.on(
      ToolbarChannel.TEXT_SELECTED,
      handleTextSelected
    );
    const cleanHideToolBar = window.ipcRenderer.on(ToolbarChannel.HIDE_TOOLBAR, handleHideToolbar);
    const cleanUpdatePresets = window.ipcRenderer.on(
      SettingChannel.UPDATE_PRESETS,
      handleUpdatePresets
    );

    return () => {
      clearShowToolBar?.();
      cleanTextSelected?.();
      cleanHideToolBar?.();
      cleanUpdatePresets?.();
    };
  }, [handleShowToolbar]);

  useEffect(() => {
    const cleanToolBar = window.ipcRenderer.on?.(ToolbarChannel.TOOLBAR_ALPHA, handleToolbarAlpha);
    return () => {
      cleanToolBar();
    };
  }, [handleToolbarAlpha]);

  const hideToolbar = () => {
    // 高度(64 - 38 = 26px) 像素的占位空间。凑够64px高度，即使没有这部分，windows端显示的electron窗口实际也要占用这么多，并且多出来的区域无法进行点击控制，影响用户体验
    // 点击此区域直接隐藏工具条，打断划词过程
    window.ipcRenderer.send(ToolbarChannel.HIDE_TOOLBAR, null);
    window.ipcRenderer.send(ToolbarChannel.INTERRUPT_SELECTION, null);
  };

  return (
    <div className="toolbar-wrapper">
      <div className="toolbar-space" onMouseDown={hideToolbar}></div>
      <div
        ref={toolbarRef}
        className={`floating-toolbar ${!isVisible ? 'hidden' : ''} ${isAlpha ? 'alpha' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {toolbarActions.slice(0, toolbarSize).map((action) => (
          <button
            key={action.id}
            onClick={(e) => handleAction(e, action.id)}
            className="toolbar-button"
          >
            {getIcon(action.icon)}
            <span>{action.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToolBar />
  </React.StrictMode>
);
