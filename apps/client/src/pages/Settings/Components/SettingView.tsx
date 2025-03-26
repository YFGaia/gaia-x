import { useSettingStore } from '@/stores/SettingStore';
import SettingItem from './SettingItem';
import UserProfile from './UserProfile';
import PresetEditor from '@/pages/Settings/Components/PresetEditor';
import About from './About';
import { useEffect } from 'react';
import { createStyles } from "antd-style";

const useStyle = createStyles(({ token, css }) => {
  return {
    tabContainer: css`
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    `,
    tabItem: css`
      cursor: pointer;
      padding: 8px 16px;
      &:hover {
        background-color: ${token.colorBgTextHover};
      }
      &[aria-selected="true"] {
        background-color: ${token.colorPrimary};
        color: ${token.colorTextLightSolid};
        font-weight: 500;
      }
    `,
  }
})


export const SettingsRouter = () => {
  const { tabs, activeTab, setActiveTab, setTabs } = useSettingStore();
  const { settings, schema } = useSettingStore();
  console.log(settings, schema);
  const { styles } = useStyle();

  // 获取配置里所有键以key开头的值的列表
  const getSettingItem = (key: string):Record<string, any> => {
    let res = {} as Record<string, any>
    Object.entries(settings).map(([key1, value]) => {
      if (key1.startsWith(key)) {
        res[key1] = value
      }
    })
    return res
  }
  useEffect(() => {
    setTabs([
      ...Object.entries(schema).map(([key, value]) => {
        return {
          key: key,
          label: value.title,
          children: <SettingItem schema={value.properties} settings={getSettingItem(key)}/>
        }
      }),
      {
        key: 'chatPreset',
        label: '对话预设',
        children: <PresetEditor />
      },
      {
        key: 'userInfo',
        label: '个人信息',
        children: <UserProfile />
      },
      {
        key: 'about',
        label: '关于',
        children: <About />
      }
    ])
    setActiveTab('userInfo')
  }, [])

  return (
    <div className={styles.tabContainer}>
      {tabs && tabs.map((tab) => (
        <div 
          key={tab.key} 
          onClick={() => setActiveTab(tab.key)}
          aria-selected={activeTab === tab.key}
          className={styles.tabItem}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}

const SettingView: React.FC = () => {
  const { tabs, activeTab } = useSettingStore();
  return (
    <div className="p-4">
      {tabs && tabs.find((tab) => tab.key === activeTab)?.children}
    </div>
  )
};

export default SettingView;