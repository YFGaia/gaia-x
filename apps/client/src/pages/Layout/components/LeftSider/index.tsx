import ChatMenu from "@/pages/Chat/components/ChatMenu";
import PluginsMenu from "@/pages/Plugins/components/Menu";
import { Tabs, TabsProps } from "antd";
import { createStyles } from "antd-style";
import { VscExtensions, VscOctoface, VscSettings } from "react-icons/vsc";

const useStyle = createStyles(({ token, css }) => {
  return {
    leftContent: css`
    `,
    tabs: css`
        .ant-tabs-nav {
            margin-left: 32px;
            margin-bottom: 0;
        }
    `,
  };
});

const moreProps: TabsProps['more'] = {
    icon: <VscSettings />,
    trigger: 'click',
    arrow: true,
}

const LeftSider: React.FC = () => {
    const { styles } = useStyle();

    const tabItems: TabsProps['items'] = [
        {
            key: 'chat',
            label: <VscOctoface fontSize={20} className={`mx-2`}/>,
            children: <ChatMenu />
        },
        {
            key: 'plugin',
            label: <VscExtensions fontSize={20} className={`mx-2`}/>,
            children: <PluginsMenu />
        },
    ]

    // 由于扩展功能还没上线，所以先隐藏
    return <div className={styles.leftContent}>
        {/* <Tabs items={tabItems} className={styles.tabs} more={moreProps} /> */}
        <ChatMenu />
    </div>
}

export default LeftSider;