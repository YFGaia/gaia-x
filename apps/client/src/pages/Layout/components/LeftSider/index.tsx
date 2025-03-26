import ChatMenu from "@/pages/Chat/components/ChatMenu";
import PluginsMenu from "@/pages/Plugins/components/Menu";
import { SettingsRouter } from "@/pages/Settings/Components/SettingView";
import { Tabs, TabsProps } from "antd";
import { createStyles } from "antd-style";
import { VscExtensions, VscOctoface, VscSettings, VscSettingsGear  } from "react-icons/vsc";
import { RiHistoryFill } from "react-icons/ri";
import { useViewStore } from "@/stores/ViewStore";
import { useCallback } from "react";
const useStyle = createStyles(({ token, css }) => {
  return {
    leftContent: css`
    `,
    tabs: css`
      .ant-tabs-nav {
        padding-left: 12px;
        margin-bottom: 0;
      }
      .ant-tabs-nav-list {
        justify-content: center;
        gap: 8px;
      }
      .ant-tabs-tab {
        padding: 0;
      }
      .ant-tabs-tab-btn {
        padding: 0 8px;
      }
      .ant-tabs-tab+.ant-tabs-tab {
        margin: 0;
      }
    `,
  };
});

const moreProps: TabsProps['more'] = {
  icon: <VscSettings />,
  trigger: 'click',
  arrow: true,
}

const TabLabel = ({ icon }: { icon: React.ReactNode }) => {
  return (
    <div className="py-2">
      {icon}
    </div>
  )
}

const LeftSider: React.FC = () => {
  const { styles } = useStyle();
  const { setView } = useViewStore();

  const tabItems: TabsProps['items'] = [
    {
      key: 'chat',
      label: <TabLabel icon={<RiHistoryFill fontSize={16}/>} />,
      children: <ChatMenu />
    },
    {
      key: 'mcp',
      label: <TabLabel icon={<VscOctoface fontSize={16}/>} />,
      children: <div>MCP</div>
    },
    {
      key: 'plugin',
      label: <TabLabel icon={<VscExtensions fontSize={16}/>} />,
      children: <PluginsMenu />
    },
    {
      key: 'settings',
      label: <TabLabel icon={<VscSettingsGear fontSize={16}/>} />,
      children: <SettingsRouter />
    },
  ]

  const handleChange = useCallback((key: string) => {
    console.log('key', key);
    if (key === 'chat') {
      setView('chat');
    } else if (key === 'settings') {
      setView('setting');
    } else if (key === 'mcp') {
      setView('mcp');
    } else if (key === 'plugin') {
      setView('extension');
    }
  }, []);

  // 由于扩展功能还没上线，所以先隐藏
  return (
    <div className={styles.leftContent}>
      <Tabs items={tabItems} className={styles.tabs} more={moreProps} onChange={handleChange} />
    </div>
  )
}

export default LeftSider;