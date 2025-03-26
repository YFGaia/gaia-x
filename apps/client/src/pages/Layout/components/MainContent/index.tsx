import ChatView from '@/pages/Chat/components/ChatView';
import ExtensionDetail from '@/pages/Extension/components/ExtensionDetail';
import SettingView from '@/pages/Settings/Components/SettingView';
import McpView from '@/pages/Settings/Components/McpView';
import { useViewStore } from '@/stores/ViewStore';
import { useEffect } from 'react';
import { SettingChannel } from '@/types/ipc/xKey';
import { useSettingStore } from '@/stores/SettingStore';

const MainContent: React.FC = () => {
  const { currentView, viewParams } = useViewStore();
  const toolbarEnabled = useSettingStore((state) => state.settings['app.toolbarEnabled']);
  useEffect(() => {
    if (toolbarEnabled !== undefined) {
      window.ipcRenderer.send(SettingChannel.TOOLBAR_ENABLED, toolbarEnabled);
    }
  }, [toolbarEnabled]);
  return (
    <div className="mainContent h-full bg-white dark:bg-[#141414]">
      {currentView === 'chat' && <ChatView params={viewParams} />}
      {currentView === 'mcp' && <McpView />}
      {currentView === 'extension' && <ExtensionDetail />}
      {currentView === 'setting' && <SettingView />}
    </div>
  );
};

export default MainContent;
