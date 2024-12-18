import { Preset } from '@/types/xKey/types'
import { stream } from '../stream'
import { ChatAPI, ChatOptions } from '../types'
import { strip } from './none'

/** Dify 实现，可以处理 dify-chat 和 dify-agent */
export class DifyFormAPI extends ChatAPI {
  private baseUrl: string
  private apiKey: string
  // private conversationId: string = ""
  private controller: AbortController | null = null
  private taskId: string = ""
  private appType: string = ""
  constructor(preset: Preset) {
    super()
    this.baseUrl = preset.baseUrl
    this.apiKey = preset.apiKey
    this.appType = preset.difyAppType || ""
  }

  async chat(options: ChatOptions) {
    const requestPayload = {
      query: options.query,
      response_mode: 'streaming',
      inputs: options.variables,
      user: "gaia-x-key",
      // conversation_id: this.conversationId
    }

    console.info('[Request] chat payload:', requestPayload)

    this.controller = new AbortController()
    options.onController?.(this.controller)
    if(options.apiKey) {  // 如果用户传入了 apiKey，则使用用户的 apiKey
      this.apiKey = options.apiKey;
    }
    try {
      const chatPath = this.baseUrl
      const headers = {
        'Authorization': `Bearer ${options.apiKey || this.apiKey}`,
        'Content-Type': 'application/json',
      }
      console.log('[Request] chat path:', chatPath)
      console.log('[Request] chat headers:', headers)
      console.log('[Request] chat payload:', requestPayload)
      // temp disable blocking mode
      stream(
        chatPath,
        requestPayload,
        headers,
        this.controller,
        // parseMsg
        (msg: any) => {
          try {
            // Parse the JSON message
            const response = JSON.parse(msg.data);
            
            // Check if this is a completion message
            if (response.event === "message_end") {
              console.info('Received completion message with finish_reason: message_end');
              console.info(msg.data)
              return {
                isFinish: true,
              }
            }
  
            // Extract the content delta if it exists
            let content = ""
            if(response.event === "workflow_finished") {
              content = "[DONE]"
            } else if(response.answer) {
              content = response.answer;
            } else if(response.data?.text) {
              content = response.data.text;
            } else if(response.data?.outputs) {
              content = response.data.outputs ? JSON.stringify(response.data.outputs) : "";
            }
            // logger.info('content////////////////', content)
            // this.conversationId = response.conversation_id
            this.taskId = response.task_id
            return {
              content: content,
              reasoning_content: "",  // TODO: 需要根据 dify-agent 的深度思考输出进行处理
            }
          } catch (e) {
            console.error(`Failed to parse SSE message: ${e}`);
            options.onError?.(-1, e as Error);
            return {} // Return empty string for error cases
          }
        },
        {
          onUpdate: options.onUpdate,
          onFinish: options.onFinish,
          onError: options.onError,
        }
      )
    } catch (e) {
      console.error('[Request] Failed to make chat request:', e)
      options.onError?.(0, e as Error)
    }
  }

  async abort() {
    console.info('aborting chat')
    if (this.controller) {
      const baseUrl = strip(this.baseUrl, '/').replace("/workflows/run", "/workflows/tasks");
      const task = strip(this.taskId, '/');
      await fetch(`${baseUrl}/${task}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })
      this.controller.abort()
      this.controller = null
    }
  }
} 