import { useSettingStore } from '@/stores/SettingStore';
import { Tabs, TabsProps } from 'antd';
import SettingItem from './SettingItem';
import UserProfile from './UserProfile';
import PresetEditor from '@/pages/Settings/Components/PresetEditor';
import About from './About';
import McpService from './McpService';

const SettingView: React.FC = () => {
  const { settings, schema } = useSettingStore();
  console.log(settings, schema);

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

  const tabs: TabsProps['items'] = []

  tabs.push({
    key: 'userInfo',
    label: '个人信息',
    children: <UserProfile />
  })

  Object.entries(schema).map(([key, value]) => {
    tabs.push({
      key: key,
      label: value.title,
      children: <SettingItem schema={value.properties} settings={getSettingItem(key)}/>
    })
  })

  tabs.push({
    key: 'chatPreset',
    label: '对话预设',
    children: <PresetEditor />
  })

  tabs.push({
    key: 'mcpService',
    label: 'MCP服务',
    children: <McpService />
  })

  tabs.push({
    key: 'about',
    label: '关于',
    children: <About />
  })


  return <Tabs tabPosition='left' className='pr-6 h-full pt-6 select-none' items={tabs} />;
};

export default SettingView;
