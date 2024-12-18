import { Preset, PresetConfig, ToolAction } from "@/types/xKey/types";

/** 默认预设文档字符串，先写死，后续可以迁移到专门配置的地方 */
const DEFAULT_PRESET_DOC_STR = `
[
  {
    "id": "preset-1742628162601-1f04c",
    "title": "V3-deepseek",
    "icon": "RiRobot2Line",
    "provider": "openai",
    "baseUrl": "https://api.deepseek.com/chat/completions",
    "apiKey": "",
    "servers": [],
    "model": "deepseek-chat"
  },
  {
    "id": "preset-1742628863394-jki4t",
    "title": "R1-deeoseek",
    "icon": "RiRobot2Line",
    "provider": "openai",
    "baseUrl": "https://api.deepseek.com/chat/completions",
    "apiKey": "",
    "servers": [],
    "model": "deepseek-reasoner"
  }
]
`

export const getDefaultPresets = (): PresetConfig => {
  try {
    const presets: Preset[] = JSON.parse(DEFAULT_PRESET_DOC_STR) as Preset[];
    // check select type and set first selection as default
    presets.forEach(preset => {
      preset.userInputForm?.forEach(form => {
        const formField = Object.values(form)[0];
        if (formField?.type === 'select' && Array.isArray(formField.options) && formField.options.length > 0) {
          formField.default = formField.options[0];
        }
      });
    });
  
    return {
      toolbarSize: 3,
      presets: presets
    };
  } catch (error) {
    console.error('getDefaultPresets', error);
    return {
      toolbarSize: 3,
      presets: []
    };
  }
}

export const parseActions = (appPresets: PresetConfig): ToolAction[] => {
  return appPresets.presets.slice(0, appPresets.toolbarSize).map(preset => ({
    title: preset.title,
    icon: preset.icon,
    id: preset.id
  }));
}
