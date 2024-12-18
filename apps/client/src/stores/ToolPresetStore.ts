import { create } from "zustand";
import { Preset, Provider, UserInput } from '@/types/xKey/types'
import { getAppTemplate, getInstalledApps } from '@/api/modules/difyApp';

/** xKey 工具预设 Store */
interface ToolPresetStore {
  formData: Preset | null;
  setFormData: (formData: Preset | null) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  handleFieldChange: (field: keyof Preset, value: string | number | UserInput[] | undefined) => void;
  handleBaseUrlChange: (url: string) => void;
}

const DIFY_BASE_URL = import.meta.env.VITE_DIFY_BASE_URL;

export const defaultPreset: Preset = {
  id: '',
  title: '',
  icon: 'RiRobot2Line',
  provider: 'none' as Provider,
  baseUrl: '',
  apiKey: ''
}

/** 提供商匹配规则 */
const providerPatterns: Array<{ pattern: RegExp; provider: Provider }> = [
  { pattern: /openai\.com/, provider: 'openai' },
  { pattern: /deepseek\.com/, provider: 'openai' },
  { pattern: /gaia-x\.cn/, provider: 'dify' },
]

let debounceTimer: NodeJS.Timeout | null = null;

export const useToolPresetStore = create<ToolPresetStore>((set, get) => ({
  formData: defaultPreset,
  setFormData: (formData: Preset | null) => set({ formData }),
  errors: {},
  setErrors: (errors: Record<string, string>) => set({ errors }),
  handleBaseUrlChange: (url: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    console.log("url", url);
    // 处理 Dify 应用模板获取
    if (url.startsWith(DIFY_BASE_URL)) {
      const appId = url.split('/').pop();
      if (appId && appId.length === 36) {  // 确保 appId 是有效长度
        console.log("appId", appId);
        debounceTimer = setTimeout(async () => {
          const templateRes = await getAppTemplate(appId);
          if (templateRes.data?.user_input_form) {
            get().handleFieldChange('userInputForm', templateRes.data.user_input_form);
            const appsRes = await getInstalledApps();
            if (appsRes.data?.installed_apps) {
              const appMeta = appsRes.data.installed_apps.find(app => app.id === appId);
              if (appMeta) {
                console.log("appMeta", appMeta);
                console.log("appMeta.app.mode: ", appMeta.app.mode);
                get().handleFieldChange('difyAppType', appMeta.app.mode);
              }
            }
          } else if (templateRes.error) {
            console.error(templateRes.error);
          }
        }, 500);
      }
    }

    // 处理 provider 匹配
    const matchedPattern = providerPatterns.find(p => p.pattern.test(url));
    if (matchedPattern) {
      const { formData } = get();
      if (formData) {
        set({ formData: { ...formData, provider: matchedPattern.provider } });
      }
    }
  },
  handleFieldChange: (field: keyof Preset, value: string | number | UserInput[] | undefined) => {
    const { formData, errors } = get();
    if (!formData) return;
    
    // Update form data
    set({ formData: { ...formData, [field]: value } });
    
    // 如果是 baseUrl 字段变更，调用 handleBaseUrlChange
    if (field === 'baseUrl' && typeof value === 'string') {
      get().handleBaseUrlChange(value);
    }
    
    // Clear error if exists for the field
    if (errors[field]) {
      set({ errors: { ...errors, [field]: '' } });
    }
  },
}));
