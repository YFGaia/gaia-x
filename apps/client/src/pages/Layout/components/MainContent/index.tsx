import ChatView from '@/pages/Chat/components/ChatView';
import ExtensionDetail from '@/pages/Extension/components/ExtensionDetail';
import SettingView from '@/pages/Settings/Components/SettingView';
import McpView from '@/pages/Settings/Components/McpView';
import { useViewStore } from '@/stores/ViewStore';
import { useEffect } from 'react';
import { ChatChannel, SettingChannel } from '@/types/ipc/xKey';
import { useSettingStore } from '@/stores/SettingStore';
import { Preset } from '@/types/xKey/types';
import { useAppStateStore } from '@/stores/AppStateStore';
import { ChatProvider } from '@/contexts/ChatContext';

const MainContent: React.FC = () => {
  const { currentView, viewParams, setView } = useViewStore();
  const toolbarEnabled = useSettingStore((state) => state.settings['app.toolbarEnabled']);
  const { setConfig } = useAppStateStore();
  useEffect(() => {
    if (toolbarEnabled !== undefined) {
      window.ipcRenderer.send(SettingChannel.TOOLBAR_ENABLED, toolbarEnabled);
    }
  }, [toolbarEnabled]);


  useEffect(() => {
    const cleanChat = window.ipcRenderer.on(
      ChatChannel.NEW_CHAT,
      (_: Electron.IpcRendererEvent, preset: Preset, conversationId: string) => {
        setConfig('leftPanel', 'close');
        setView('chat', { chatId: conversationId, presetId: preset.id });
      }
    )
    return () => {
      cleanChat();
    }
  }, [])
  return (
    <div className="mainContent h-full bg-white dark:bg-[#141414]">
      {currentView === 'chat' && <ChatProvider><ChatView params={viewParams} /></ChatProvider>}
      {currentView === 'mcp' && <McpView />}
      {currentView === 'extension' && <ExtensionDetail />}
      {currentView === 'settings' && <SettingView />}
    </div>
  );
};

export default MainContent;
