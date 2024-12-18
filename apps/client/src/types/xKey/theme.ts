export type Theme = 'light' | 'dark' | 'system';

export const DEFAULT_THEME: Theme = 'system';

export interface ThemeConfig {
  theme: Theme;
  // 可以在这里添加更多主题相关的配置
}

// 主题相关的工具函数
export const isValidTheme = (theme: string): theme is Theme => {
  return theme === 'light' || theme === 'dark' || theme === 'system';
};