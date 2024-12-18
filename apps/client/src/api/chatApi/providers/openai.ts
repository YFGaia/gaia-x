import { Message } from '@/types/chat';
import { Preset } from '@/types/xKey/types';
import { stream } from '../stream';
import { ChatAPI, ChatMessage, ChatOptions, ChatPayload } from '../types';
export class OpenAIChatAPI extends ChatAPI {
  private baseUrl: string;
  private apiKey: string;
  private controller: AbortController | null = null;
  private systemPrompt: string | undefined;

  constructor(preset: Preset) {
    super();
    this.baseUrl = preset.baseUrl;
    this.apiKey = preset.apiKey;
    this.systemPrompt = preset.systemPrompt;
  }

  async chat(options: ChatOptions) {
    if (!options.messages) {
      console.error('[Request] no messages');
      return;
    }
    console.log('formatMessage', this.formatMessage(options.messages));

    const requestPayload: ChatPayload = {
      messages: this.formatMessage(options.messages),
      stream: true,
      model: options.preset.model ?? 'gpt-4o-mini',
      temperature: options.preset.temperature ?? 1,
      presence_penalty: options.preset.presence_penalty ?? 0,
      frequency_penalty: options.preset.frequency_penalty ?? 0,
      top_p: options.preset.top_p ?? 1,
      max_tokens: options.preset.max_tokens ?? 2000,
      tools: options.tools,
    };
    if (this.systemPrompt) {
      requestPayload.messages.unshift({
        role: 'system',
        content: this.systemPrompt,
      });
    }
    let isFinish = false;
    console.info('[Request] chat payload:', {
      ...requestPayload,
    });

    if (options?.tools && options.tools.length > 0) {
      requestPayload.tools = options.tools;
      requestPayload.tool_choice = 'auto';
    }

    this.controller = new AbortController();
    options.onController?.(this.controller);

    try {
      const chatPath = this.baseUrl;
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      stream(
        chatPath,
        requestPayload,
        headers,
        this.controller,
        // parseMsg
        (msg: any) => {
          if (msg.data === '[DONE]') {
            console.info('Received stream completion signal');
            isFinish = true;
            return {
              isFinish: true,
            };
          }
          try {
            // Parse the JSON message
            const response = JSON.parse(msg.data);
            console.log('response', response);

            // Check if this is a completion message
            if (response.choices?.[0]?.finish_reason === 'stop') {
              console.info('Received completion message with finish_reason: stop');
              console.info(msg.data);
              return {
                isFinish: true,
              };
            }
            // Check if this is a completion message
            if (response.choices?.[0]?.finish_reason === 'tool_calls') {
              console.info('Received completion message with finish_reason: tool_calls');
              console.info(msg.data);
              return {
                isFinish: true,
              };
            }
            const delta = response.choices?.[0]?.delta;
            // console.log('delta', delta)
            // Extract the content delta if it exists
            return {
              content: delta?.content,
              reasoning_content: delta?.reasoning_content,
              tool_calls: delta?.tool_calls,
            };
          } catch (e) {
            console.error(`Failed to parse SSE message: ${e}`);
            options.onError?.(-1, e as Error);
            return {
              isFinish: true,
            };
          }
        },
        {
          onUpdate: options.onUpdate,
          onFinish: options.onFinish,
          onError: options.onError,
        }
      );
    } catch (e) {
      console.error('[Request] Failed to make chat request:', e);
      options.onError?.(0, e as Error);
    }
  }

  formatMessage(messages: Message[]) {
    console.log('formatMessage 1111', messages);
    const formattedMessages: ChatMessage[] = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        formattedMessages.push({
          role: 'user',
          content: msg.items[0].content,
        });
      } else if (msg.role === 'ai') {
        msg.items.forEach((item) => {
          switch (item.type) {
            case 'message':
              if (item.content) {
                formattedMessages.push({
                  role: 'assistant',
                  content: item.content,
                });
              }
              break;
            case 'tool':
              formattedMessages.push({
                role: 'tool',
                content: item.content,
                tool_call_id: item.tool_call_id || '',
              });
              break;
            case 'callTools':
              formattedMessages.push({
                role: 'assistant',
                content: item.content,
                ...(item.tool_calls && { tool_calls: item.tool_calls }),
              });
              break;
          }
        })
      }
    }
    return formattedMessages;
  }

  async abort() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}
