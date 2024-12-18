import { DEFAULT_THEME } from '@/types/xKey/theme';
import { getDefaultPresets } from '@/utils/xKey';

import Store from './FileStore';

export const settingsStore = new Store('settings', {
    theme: DEFAULT_THEME,
    presets: getDefaultPresets(),
    toolbarSize: 3,
    toolbarAlpha: false
  }
)