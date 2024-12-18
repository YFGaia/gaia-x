import { Preset } from '@/types/xKey/types'
import { stream } from '../stream'
import { ChatAPI, ChatOptions } from '../types'
import { strip } from './none'

/** Dify 实现，可以处理 dify-chat 和 dify-agent */
export class DifyChatAPI extends ChatAPI {
  private baseUrl: string
  private apiKey: string
  private conversationId: string = ""
  private lastMsgId: string | null = null
  private controller: AbortController | null = null
  private taskId: string = ""

  constructor(preset: Preset) {
    super()
    this.baseUrl = preset.baseUrl
    this.apiKey = preset.apiKey
  }

  /**
   * Safely extracts content from Dify response
   */
  private extractContent(response: any): { content: string, conversationId?: string, messageId?: string, taskId?: string } {
    try {
      if (!response) {
        return { content: '' };
      }

      return {
        content: response.answer || '',
        conversationId: response.conversation_id,
        messageId: response.message_id,
        taskId: response.task_id
      };
    } catch (error) {
      console.error('Error extracting content:', error);
      return { content: '' };
    }
  }

  async chat(options: ChatOptions) {
    const requestPayload = {
      query: options.query,
      response_mode: 'streaming',
      inputs: options.variables,
      user: "gaia-x-key",
      conversation_id: this.conversationId,
      parent_message_id: this.lastMsgId || undefined
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
      console.info('[Request] chat path:', chatPath)
      console.info('[Request] chat headers:', headers)
      console.info('[Request] chat payload:', requestPayload)

      stream(
        chatPath,
        requestPayload,
        headers,
        this.controller,
        // parseMsg
        (msg: any) => {
          try {
            // Handle empty messages
            if (!msg?.data) {
              return {};
            }

            // Parse the JSON message
            const response = JSON.parse(msg.data);
            
            // Check if this is a completion message
            if (response.event === "message_end") {
              console.info('Received completion message with finish_reason: message_end');
              console.info(msg.data);
              return {
                isFinish: true,
              };
            }
  
            // Extract content and metadata
            const { content, conversationId, messageId, taskId } = this.extractContent(response);
            
            // Update conversation state
            if (conversationId) this.conversationId = conversationId;
            if (messageId) this.lastMsgId = messageId;
            if (taskId) this.taskId = taskId;

            return {
              content,
              reasoning_content: response.reasoning_content || '',
            };
          } catch (error) {
            console.error(`Failed to parse SSE message: ${error}`);
            // Don't propagate parsing errors to maintain stream
            return {};
          }
        },
        {
          onUpdate: options.onUpdate,
          onFinish: options.onFinish,
          onError: options.onError,
        }
      );
    } catch (error) {
      console.error('[Request] Failed to make chat request:', error);
      options.onError?.(0, error as Error);
    }
  }

  async abort() {
    console.info('aborting chat');
    if (this.controller) {
      try {
        const baseUrl = strip(this.baseUrl, '/');
        const task = strip(this.taskId, '/');
        await fetch(`${baseUrl}/${task}/stop`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });
      } catch (error) {
        console.error('Error stopping chat:', error);
      } finally {
        this.controller.abort();
        this.controller = null;
      }
    }
  }
} 