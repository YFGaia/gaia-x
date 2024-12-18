
import { Preset } from '@/types/xKey/types';

import { ChatAPI, ChatOptions } from '../types';

/** 去除字符串中存在于开头结尾的指定字符 */
export const strip = (text: string, drop: string) => {
  while (text.startsWith(drop)) {
    text = text.slice(drop.length);
  }
  while (text.endsWith(drop)) {
    text = text.slice(0, -drop.length);
  }
  return text;
}


/** 空实现，保留用以开发记笔记功能 */
export class NoneAPI extends ChatAPI {
  constructor(_preset: Preset) {
    super()
  }

  async chat(_options: ChatOptions) {
    console.info('NoneAPI chat')
  }

  abort() {
    console.info('NoneAPI abort')
  }
}