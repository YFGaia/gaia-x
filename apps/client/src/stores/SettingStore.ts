import { appConfigSchema } from '@/config/schema/app';
import { IpcChannels } from '@/types/ipc/ipc';
import { ToolbarChannel } from '@/types/ipc/xKey';
import { TabsProps } from 'antd';
import { create } from 'zustand';

export interface SettingsState {
  settings: Record<string, any>;
  schema: Record<string, any>;
  isLoading: boolean;
  error: Error | null;
  activeTab: string; // 当前激活的标签页
  tabs: TabsProps['items']; // 配置项的标签页
  // "app.theme": "light" | "dark" | "system";
  // "app.language": "zh-CN" | "en-US";
  // "app.autoUpdate": boolean;
  // "ai-prompt.max_tokens": number;
  // "ai-prompt.temperature": number;
  // "ai-prompt.messages": string[];
  // "ai-prompt.model": "gpt-4o";
  // "ai-prompt.stream": boolean;
  getAll: () => Promise<Record<string, any>>;
  setSetting: (key: string, value: any) => Promise<void>;
  getSetting: (key: string) => any;
  setTabs: (tabs: TabsProps['items']) => void;
  setActiveTab: (tab: string) => void;
}

export const useSettingStore = create<
  SettingsState & {
    initialize: () => Promise<void>;
  }
>((set, get) => ({
  settings: {},
  schema: appConfigSchema,
  isLoading: false,
  error: null,
  activeTab: '',
  tabs: [],


  initialize: async () => {
    const settings = await window.ipcRenderer.invoke(IpcChannels.GET_ALL_SETTING_STATE);
    set({
      settings,
    });
  },
  setSetting: async (key, value) => {
    set({
      settings: {
        ...get().settings,
        [key]: value,
      },
    });
    await window.ipcRenderer.invoke(IpcChannels.SET_SETTING_STATE, { key, value });
    console.log('设置配置', key, value);
    if (key === 'app.theme') {
      await window.ipcRenderer.invoke(IpcChannels.SET_THEME, value);
    }
    if (key === 'app.toolbarTranslucent') {
      console.log('设置工具栏半透明', value);
      await window.ipcRenderer.send?.(ToolbarChannel.SET_TOOLBAR_ALPHA, value);
    }
  },
  getAll: async () => {
    return get().settings;
  },
  getSetting: (key) => {
    try {
      const config = get().settings;

      // 如果是完整键名，直接返回值
      if (key in config) {
        return config[key];
      }

      // 如果是前缀，返回所有匹配的配置项
      if (key.endsWith('.')) {
        key = key.slice(0, -1); // 移除末尾的点号
      }

      const prefix = key + '.';
      const matchingEntries = Object.entries(config)
        .filter(([k]) => k.startsWith(prefix))
        .reduce((acc, [k, v]) => {
          acc[k] = v;
          return acc;
        }, {} as Record<string, any>);

      // 如果找到匹配项，返回匹配的配置对象
      if (Object.keys(matchingEntries).length > 0) {
        return matchingEntries;
      }

      console.log(`[ConfigReader] 配置项 "${key}" 不存在`);
      return undefined;
    } catch (error) {
      console.error(`[ConfigReader] 获取配置 "${key}" 失败:`, error);
      return undefined;
    }
  },
  setTabs: (tabs: TabsProps['items']) => {
    set({ tabs });
  },
  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },
}));
