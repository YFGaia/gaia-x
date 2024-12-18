import { Preset } from '@/types/xKey/types'
import { DifyChatAPI } from './providers/dify-chat'
import { DifyFormAPI } from './providers/dify-form'
import { NoneAPI } from './providers/none'
import { OpenAIChatAPI } from './providers/openai'
import { ChatAPI } from './types'

export const getChatAPI = (preset: Preset): ChatAPI => {
  if (preset.provider === "none") {
    return new NoneAPI(preset)
  }
  if (preset.provider === "dify") {
    if (preset.difyAppType === 'workflow' || preset.difyAppType === 'completion') {
      // console.log('[getChatAPI] difyAppType', preset.difyAppType)
      return new DifyFormAPI(preset)
    }
    return new DifyChatAPI(preset)
  }
  return new OpenAIChatAPI(preset)  // default to openai
}
