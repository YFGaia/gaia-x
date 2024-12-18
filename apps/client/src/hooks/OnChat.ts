import { getChatAPI } from '@/api/chatApi/chat';
import { ChatAPI, ChatMessage, ChatToolOptions, ToolCall } from '@/api/chatApi/types';
import { useUserStore } from '@/stores/UserStore';
import { formatErrorMessage, Message, MessageItem, ThoughtChainItemExpand } from '@/types/chat';
import { McpServer, Preset, StreamDelta } from '@/types/xKey/types';
import { generateUniqueId } from '@/utils/common';
import { useCallback, useRef, useState } from 'react';
import { useMcpToolStore } from '@/stores/McpToolStore';
import { useRenderConfirmStore } from '@/stores/RenderConfirmStore';
import { ThoughtChainItem } from '@ant-design/x';
import { MCPToolChannel } from '@/types/ipc/mcpTool';
import { SessionChannel } from '@/types/ipc/session';
import { useAppStateStore } from '@/stores/AppStateStore';
import { toolCall } from '@/tools/toolsManager';
import { ToolCallParams } from '@/types/core';

const getTools = (servers: McpServer[]) => {
  const tools = [];
}

export interface RequestOptions {
  message: Message;
  aiMessage: Message;
  conversationId: string;
  preset: Preset;
  variables: Record<string, string|number>;
  onSuccess: (massageId: string, messageItem: MessageItem) => void;
  onUpdate: (message: Message) => void;
  onError: (error: Error) => void;
  onToolStart?: (name: string, args: any, messageItemId?: string) => ThoughtChainItemExpand | undefined;
  onToolEnd?: (thought: ThoughtChainItemExpand, args: any, result: any, messageItemId?: string, error?: Error) => ThoughtChainItemExpand | undefined;
}

export const useOnChat = (options?: ChatToolOptions) => {
  const { userInfo } = useUserStore();
  const { tools, getTools, getAllTools } = useMcpToolStore();
  const { waitResult } = useRenderConfirmStore();
  const { setMode } = useAppStateStore();

  // 使用 React 的 useState 替代普通变量
  const historyMessagesRef = useRef<Message[]>([]);

  const ChatAPI = useRef<ChatAPI | null>(null);

  const isFinishRef = useRef(false);

  const abortChat = () => {
    ChatAPI.current?.abort();
  };

  const refreshGetChatAPI = (preset: Preset) => {
    if (!preset) {
      return null;
    }
    // 转换 preset.baseUrl 为 dify 应用的 api 路径
    if (preset.provider === 'dify') {
      const appId = preset.baseUrl.split('/').pop();
      if (appId && appId.length === 36) {
        // 如果 appId 没有了，说明已经改写过一次
        // rewrite baseUrl
        if (
          preset.difyAppType === 'chat' ||
          preset.difyAppType === 'advanced-chat' ||
          preset.difyAppType === 'agent-chat'
        ) {
          preset.baseUrl =
            import.meta.env.VITE_DIFY_BASE_URL +
            `/console/api/installed-apps/${appId}/chat-messages-extend`;
        } else if (preset.difyAppType === 'workflow') {
          preset.baseUrl =
            import.meta.env.VITE_DIFY_BASE_URL +
            `/console/api/installed-apps/${appId}/workflows-extend/run`;
        } else if (preset.difyAppType === 'completion') {
          preset.baseUrl =
            import.meta.env.VITE_DIFY_BASE_URL +
            `/console/api/installed-apps/${appId}/completion-messages-extend`;
        } else {
          console.error('[unkown] preset.difyAppType', preset.difyAppType);
        }
      }
    }
    ChatAPI.current = getChatAPI(preset);
    return ChatAPI.current;
  };

  const clearChatAPI = () => {
    ChatAPI.current = null;
    historyMessagesRef.current = [];
  };

  // 处理单个工具调用
  const handleToolCall = useCallback(async (call: any, thought?: ThoughtChainItem) => {
    try {
      const args = JSON.parse(call.function.arguments || '{}');

      const tools = getAllTools();
      console.log('解析后的参数:', args, call, tools);
      // 查找对应的工具定义以获取默认的 serverId
      const toolDef = tools.find((tool) => tool.function.name === call.function.name);
      if (!toolDef) {
        throw new Error(`未找到工具定义: ${call.function.name}`);
      }

      // 使用工具定义中的默认 serverId 或参数中的 serverId
      const serverId =
        args?.serverId ||
        ((toolDef.function.parameters as any)?.properties?.serverId?.default as string);

      if (!serverId) {
        throw new Error(`未找到 serverId: ${call.function.name}`);
      }

      const serverConfig = await window.ipcRenderer.invoke(
        MCPToolChannel.MCP_GET_SERVER_CONFIG,
        serverId
      );

      // 如果是远程类型的工具，切换到远程模式
      if (serverConfig?.type === 'remote') {
        const cookies = [
          {
            url: '',
            name: 'sessionid',
            value: 'ah7iu8azuwk4k89rsts0rj3zy2a6fkyz',
            domain: '',
          },
        ];
        await window.ipcRenderer.invoke(SessionChannel.SET_SESSION, {
          partition: '',
          cookies: cookies,
        });
        await setMode('remote', 'https://gaia-x.cn/terminal/info?type=1&id=4141');
      }
      console.log(`使用 serverId: ${serverId} 调用工具: ${call.function.name}`);

      // 移除 args 中的 serverId，因为它已经在外层指定了
      const { serverId: _, ...toolArgs } = args;

      // 使用通用工具处理器处理所有工具调用
      const result = await toolCall({
        serverId,
        name: call.function.name,
        arguments: toolArgs,
        _meta: thought?.key || undefined,
      } as ToolCallParams);

      console.log('result', result);

      if (result.type === 'error') {
        throw new Error(result.error);
      }

      return {
        name: call.function.name,
        content: result.result || '',
      };
    } catch (error) {
      console.error(`${call.function.name} 调用失败:`, error);
      throw error;
    }
  }, [tools]);

  const onChat = useCallback(
    async ({
      message,
      aiMessage,
      conversationId,
      preset,
      variables,
      onSuccess,
      onUpdate,
      onError,
      onToolStart,
      onToolEnd,
    }: RequestOptions) => {
      if (!ChatAPI.current) {
        ChatAPI.current = refreshGetChatAPI(preset);

        if (!ChatAPI.current) {
          onError?.(new Error('未找到应用，请尝试重新打开'));
          return null;
        }
      }
      isFinishRef.current = false;
      // 使用当前的 historyMessages 值创建新数组

      console.log('historyMessages', historyMessagesRef.current);
      console.log('message', message);
      console.log('preset', preset.servers, tools);

      let messageContent = '';
      let thinkingContent = '';
      const toolCalls: ToolCall[] = [];
      try {
        ChatAPI.current?.chat({
          messages: [...historyMessagesRef.current, message, aiMessage], // 使用最新的消息数组
          query: message.items[0].content || '', // 当前聊天内容, 仅在 provider 兼容 openai 时有效
          preset,
          variables: variables || {},
          apiKey: preset?.provider === 'dify' ? userInfo.token : preset.apiKey,
          tools: getTools(preset.servers || []),
          onUpdate: (index: number, _text: string, delta: StreamDelta) => {
            if (!thinkingContent && delta.reasoning_content) {
              thinkingContent = delta.reasoning_content;
              aiMessage.items.push({
                id: generateUniqueId('msg-item'),
                content: delta.reasoning_content,
                type: 'thinking',
              });
              onUpdate?.(aiMessage);
            } else if (thinkingContent && delta.reasoning_content) {
              thinkingContent += delta.reasoning_content;
              aiMessage.items[aiMessage.items.length - 1].content += delta.reasoning_content;
              onUpdate?.(aiMessage);
            } else if (delta.tool_calls) {
              console.log('delta.tool_calls', delta.tool_calls);
              for (const call of delta.tool_calls) {
                if (call.index === undefined) continue;

                if (toolCalls.length === 0) {
                  aiMessage.items.push({
                    id: generateUniqueId('msg-item-2-'),
                    content: '',
                    tool_calls: toolCalls,
                    type: 'callTools',
                  });
                }

                if (!toolCalls[call.index]) {
                  toolCalls[call.index] = {
                    id: call.id || '',
                    type: 'function',
                    function: {
                      name: '',
                      arguments: '',
                    },
                  };
                }
                if (call.id) {
                  toolCalls[call.index].id = call.id;
                }
                if (call.function?.name) {
                  toolCalls[call.index].function.name = call.function.name;
                }
                if (call.function?.arguments) {
                  toolCalls[call.index].function.arguments += call.function.arguments;
                }
                aiMessage.items[aiMessage.items.length - 1].tool_calls = toolCalls;
              }
            } else if (!messageContent && delta.content) {
              messageContent = delta.content;
              aiMessage.items.push({
                id: generateUniqueId('msg-item'),
                content: delta.content,
                type: 'message',
              });
              onUpdate?.(aiMessage);
            } else if (messageContent && delta.content) {
              aiMessage.items[aiMessage.items.length - 1].content += delta.content;
              onUpdate?.(aiMessage);
            }
          },
          onFinish: async (index: number, text: string) => {
            console.log('onFinish', index, text);
            console.log('toolCalls', toolCalls);
            text && (aiMessage.items[aiMessage.items.length - 1].content = text);
            console.log('aiMessage', aiMessage);
            if (toolCalls.length == 0) {
              isFinishRef.current = true;
              onSuccess?.(aiMessage.id, aiMessage.items[aiMessage.items.length - 1]);
            } else {
              console.log('toolCalls', toolCalls);
              if (toolCalls.length > 0) {
                 await handleToolCalls(
                  {
                    message,
                    aiMessage,
                    conversationId,
                    preset,
                    variables,
                    onSuccess,
                    onUpdate,
                    onError,
                    onToolStart,
                    onToolEnd,
                  },
                  toolCalls,
                  messageContent
                );
                if (!isFinishRef.current) {
                  onChat({
                    message,
                    aiMessage,
                    conversationId,
                    preset,
                    variables,
                    onSuccess,
                    onUpdate,
                    onError,
                    onToolStart,
                    onToolEnd,
                  });
                }
              }
            }
          },
          onError: (index: number, error: Error) => {
            onError?.(error);
          },
        });
      } catch (error) {
        console.error('api error', error);
        onError?.(error as Error);
      }
    },
    [historyMessagesRef, userInfo.token]
  ); // 添加 userInfo.token 作为依赖

  const handleToolCalls = async (
    {
      message,
      aiMessage,
      conversationId,
      onSuccess,
      onUpdate,
      onError,
      onToolStart,
      onToolEnd,
    }: RequestOptions,
    toolCalls: ToolCall[],
    content: string
  ) => {
    console.log('handleToolCalls', toolCalls);
    console.log('=== 开始处理工具调用 ===');

    let hasError = false;
    let toolResults: string[] = [];

    for (const call of toolCalls) {
      let thought: ThoughtChainItemExpand | undefined;
      console.log('call', call);
      let args = {}
      if (call.function.arguments.length != 0) {
        args = JSON.parse(call.function.arguments);
      }
      const aiMessageItemId = generateUniqueId('msg-item');
      try {
        thought = onToolStart?.(call.function.name, args, aiMessageItemId);
        aiMessage.items.push({
          id: aiMessageItemId,
          content: thought,
          type: 'thought',
        });
        // 新功能，看情况取消注释
        onUpdate(aiMessage);
        console.log('onToolStart', thought);
        //进行确定
        // const confirm = await waitResult({
        //   conversationId: conversationId,
        //   chatId: message.id,
        //   item: {
        //     id: aiMessageItemId,
        //     type: 'markdown',
        //     result: '',
        //     title: '确定要使用' + call.function.name + '工具吗？',
        //     content: '调用参数 \n ```json \n' + JSON.stringify(args, null, 2) + '\n ```',
        //   },
        // });
        const confirm = {
          item: {
            result: 'ok',
          },
        };
        if (confirm.item.result === 'ok') {
          aiMessage.items[aiMessage.items.length - 1].content.content = '工具执行中....';
          onUpdate(aiMessage);
        } else {
          if (thought) {
            onToolEnd?.(thought, args, null, aiMessageItemId, {
              message: '用户取消',
            } as Error);
          }
          aiMessage.items[aiMessage.items.length - 1].content.content = '用户取消使用工具';
          onUpdate(aiMessage);
          isFinishRef.current = true;
        }

        const result = await handleToolCall(call, thought);
        console.log('result', result);

        if (thought) {
          thought = onToolEnd?.(thought, args, result, aiMessageItemId);
        }

        toolResults.push(result.content);
        aiMessage.items[aiMessage.items.length - 1].content = thought;
        console.log('aiMessage', aiMessage);
        aiMessage.items.push({
          type: 'tool',
          id: generateUniqueId('msg-item'),
          content: result.content,
          tool_call_id: call.id,
        })
        onUpdate(aiMessage);
      } catch (error) {
        hasError = true;
        console.error(`工具调用失败:`, error);
        if (thought) {
          thought = onToolEnd?.(thought, args, null, aiMessageItemId, error as Error);
        }
        const errorMessage = formatErrorMessage(error instanceof Error ? error.message : error);

        toolResults.push(errorMessage);
        aiMessage.items[aiMessage.items.length - 1].content = thought;
        
        aiMessage.items.push({
          type: 'tool',
          id: generateUniqueId('msg-item'),
          content: errorMessage,
          tool_call_id: call.id,
        })
        onUpdate(aiMessage);
      }
    }
  };

  const setHistoryMessages = (messages: Message[]) => {
    historyMessagesRef.current = messages;
  };

  return {
    onChat,
    abortChat,
    setHistoryMessages,
    clearChatAPI,
  };
};
