import { PresetConfig } from "./types";

export const isDev = process.env.NODE_ENV === 'development'

/** @Deprecated */
export const DefaultPresets: PresetConfig = {
  toolbarSize: 3,
  presets: [
    {
      id: 'ai-assistant',
      provider: 'openai',
      title: 'AI助理',
      icon: 'RiRobot2Line',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
    },
    {
      id: 'note-taking',
      provider: 'dify',
      title: '笔记',
      icon: 'RiMenuAddFill',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: "gpt-4o-mini",
    },
    {
      id: 'translation',
      provider: 'dify',
      title: '翻译',
      icon: 'RiTranslate',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
    }
  ]
};

