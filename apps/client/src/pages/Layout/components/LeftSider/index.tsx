import ChatMenu from "@/pages/Chat/components/ChatMenu";
import PluginsMenu from "@/pages/Plugins/components/Menu";
import { Tabs, TabsProps } from "antd";
import { createStyles } from "antd-style";
import { VscExtensions, VscOctoface, VscComment, VscSettings, VscSettingsGear  } from "react-icons/vsc";

const useStyle = createStyles(({ token, css }) => {
  return {
    leftContent: css`
    `,
    tabs: css`
      .ant-tabs-nav {
        padding: 0 16px;
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

  const tabItems: TabsProps['items'] = [
    {
      key: 'chat',
      label: <TabLabel icon={<VscComment fontSize={16}/>} />,
      children: <ChatMenu />
    },
    {
      key: 'agent',
      label: <TabLabel icon={<VscOctoface fontSize={16}/>} />,
      children: <div>Agents</div>
    },
    {
      key: 'plugin',
      label: <TabLabel icon={<VscExtensions fontSize={16}/>} />,
      children: <PluginsMenu />
    },
    {
      key: 'settings',
      label: <TabLabel icon={<VscSettingsGear fontSize={16}/>} />,
      children: <div>Settings</div>
    },
  ]

  // 由于扩展功能还没上线，所以先隐藏
  return (
    <div className={styles.leftContent}>
      <Tabs items={tabItems} className={styles.tabs} more={moreProps} />
    </div>
  )
}

export default LeftSider;