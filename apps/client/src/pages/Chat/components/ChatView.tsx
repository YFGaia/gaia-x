import { useChatContext } from '@/contexts/ChatContext';
import { useConversation } from '@/hooks/Conversion';
import { RequestOptions, useOnChat } from '@/hooks/OnChat';
import { useAppStateStore } from '@/stores/AppStateStore';
import { useConversationStore } from '@/stores/ConversationStore';
import { useRenderConfirmStore } from '@/stores/RenderConfirmStore';
import { useViewStore } from '@/stores/ViewStore';
import { Message, MessageItem, ThoughtChainItemExpand } from '@/types/chat';
import { ChatChannel } from '@/types/ipc/xKey';
import { Preset } from '@/types/xKey/types';
import { SwapOutlined } from '@ant-design/icons';
import { Bubble, useXAgent, useXChat } from '@ant-design/x';
import { THOUGHT_CHAIN_ITEM_STATUS } from '@ant-design/x/es/thought-chain/Item';
import { Button, GetProp, message as messageAntd } from 'antd';
import { createStyles } from 'antd-style';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChatFormRef } from './ChatForm';
import ChatPrompt from './ChatPrompt';
import ChatSender, { ChatSenderRef } from './ChatSender';
import MessageList from './MessageList';

const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      min-width: 100px;
      height: 100%;
      display: flex;
      background: ${token.colorBgContainer};
      font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;
      .ant-prompts {
        color: ${token.colorText};
      }
    `,
    chat: css`
      overflow: hidden;
      height: 100%;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: ${token.paddingLG}px;
      gap: 16px;
      .ant-bubble-list::-webkit-scrollbar {
        display: none;
      }
      .ant-bubble-list {
        padding-bottom: 4rem;
      }
      .ant-bubble::-webkit-scrollbar {
        display: none;
      }
      .ant-bubble {
        scrollbar-width: none;
      }

      /* IE */
      .ant-bubble {
        -ms-overflow-style: none;
      }

      @media (min-width: 900px) {
        max-width: 56rem;
      }

      .ant-collapse > .ant-collapse-item > .ant-collapse-header {
        padding: 0 12px;
        margin: 0;
      }
    `,
    messages: css`
      flex: 1;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
    `,
    logo: css`
      display: flex;
      height: 72px;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;

      img {
        width: 24px;
        height: 24px;
        display: inline-block;
      }

      span {
        display: inline-block;
        margin: 0 8px;
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    responseContent: css`
      margin: 0;
      text-align: left;
      font-size: 15px;
      line-height: 1.6;

      pre {
        margin: 16px 0;
        border-radius: ${token.borderRadiusLG}px;
      }

      p:first-child {
        margin-top: 0;
      }

      p:last-child {
        margin-bottom: 0;
      }
    `,
  };
});

const roles: GetProp<typeof Bubble.List, 'roles'> = {
  ai: {
    placement: 'start',
    typing: { step: 5, interval: 20 },
    styles: {
      content: {
        borderRadius: 8,
      },
    },
  },
  user: {
    placement: 'end',
    variant: 'shadow',
  },
};

interface AgentRequestOptions {
  message?: string;
}

interface AgentCallbacks {
  onSuccess: (message: string) => void;
  onUpdate: (message: string) => void;
  onError: (error: Error) => void;
}

const ChatDetail: React.FC<{ params: Record<string, any> }> = ({ params }) => {
  const { activeKey, changeSource, setActiveKey } = useConversationStore();
  const { setView } = useViewStore();
  const { styles } = useStyle();
  const { addMessage, updateMessage } = useConversation();
  const { setMode, mode, rightPanel } = useAppStateStore();
  const confirms = useRenderConfirmStore(
    useShallow((state) => state.getConversationConfirms(activeKey))
  );
  const chatSenderRef = useRef<ChatSenderRef>(null);

  const {
    messages,
    messageThoughts,
    addMessage: addChatMessage,
    setMessageThoughts,
    updateMessage: updateChatMessage,
    currentPreset,
    addConversation,
    messageSuccess,
    getFormData,
  } = useChatContext();

  const changeModeNormal = async () => {
    setMode('normal');
  };

  /** 使用 onChat 发送消息 */
  const { onChat, setHistoryMessages, clearChatAPI, abortChat } = useOnChat();

  const messagesRef = useRef<Array<Message>>([]);

  const currentPresetRef = useRef(currentPreset);

  useEffect(() => {
    currentPresetRef.current = currentPreset;
  }, [currentPreset]);

  useEffect(() => {
    if (changeSource === 'inner') {
      return;
    }
    console.log('params', params);
    if (params.mode) {
      setMode(params.mode);
    }
  }, [activeKey, changeSource]);

  useEffect(() => {
    const cleanNewChat = window.ipcRenderer.on(
      ChatChannel.NEW_CHAT,
      (_: Electron.IpcRendererEvent, preset: Preset, conversationId: string) => {
        console.log('NEW_CHAT', preset, conversationId);
        setView('chat', { chatId: conversationId, presetId: preset.id });
        setMode('mini');
      }
    );

    return () => {
      console.log('清理新聊天');
      cleanNewChat();
    };
  }, [mode]);

  const onToolStart = (name: string, args: any, messageItemId?: string) => {
    const thought: ThoughtChainItemExpand = {
      key: Date.now().toString(),
      title: `调用工具: ${name}`,
      description: '执行中',
      requestContent: args,
      responseContent: '等待响应...',
      isError: false,
      status: THOUGHT_CHAIN_ITEM_STATUS.PENDING,
      extra: '',
      iconStr: THOUGHT_CHAIN_ITEM_STATUS.PENDING,
    };

    // 更新特定消息的 thoughts
    setMessageThoughts((prev) => ({
      ...prev,
      [messageItemId || '']: thought,
    }));

    return thought;
  };
  const onToolEnd = (
    thought: ThoughtChainItemExpand,
    args: any,
    result: any,
    messageItemId?: string,
    error?: Error
  ) => {
    const item = {
      ...thought,
      status: error ? THOUGHT_CHAIN_ITEM_STATUS.ERROR : THOUGHT_CHAIN_ITEM_STATUS.SUCCESS,
      description: error ? '执行失败' : '执行成功',
      requestContent: args,
      responseContent: error ? error.message : result.content,
      isError: !!error,
      extra: '',
      iconStr: error ? THOUGHT_CHAIN_ITEM_STATUS.ERROR : THOUGHT_CHAIN_ITEM_STATUS.SUCCESS,
    };
    // 只更新特定消息的 thought 状态
    setMessageThoughts((prev) => ({
      ...prev,
      [messageItemId || '']: item,
    }));
    return item;
  };

  const handleAgentRequest = useCallback(
    async (
      { message }: AgentRequestOptions,
      { onSuccess, onUpdate, onError }: AgentCallbacks
    ): Promise<void> => {
      await addConversation(message || '新会话', currentPresetRef.current?.id || '', 'inner');

      if (!message) return;

      const userMessage = await addChatMessage(message, 'user');

      // 添加 AI 响应消息（初始状态为 loading）

      const aiMessage = await addChatMessage('', 'ai');

      // 包装回调函数以更新 AI 消息
      const wrappedOnUpdate = (message: Message) => {
        onUpdate(message.items[message.items.length - 1].content);
        updateChatMessage(message.id, message)
      };

      const wrappedOnError = (error: Error) => {
        console.log('wrappedOnError', error);
        try {
          messageAntd.error(JSON.parse(error.message).message);
        } catch (error2) {
          // json 解析失败，直接显示错误信息
          messageAntd.error(error?.message || '未知错误');
        }
        onError(error);
      };

      const wrappedOnSuccess = (messageId: string, msgItem: MessageItem) => {
        messageSuccess(messageId, aiMessage);
        messagesRef.current.push(userMessage, aiMessage);
        onSuccess(msgItem?.content || '');
      };

      if (!currentPresetRef.current?.id) {
        messageAntd.error('当前没有预设');
        return;
      }

      const messageParams: RequestOptions = {
        message: userMessage,
        aiMessage,
        preset: currentPresetRef.current,
        conversationId: useConversationStore.getState().activeKey,
        onSuccess: wrappedOnSuccess,
        onUpdate: wrappedOnUpdate,
        onError: wrappedOnError,
        onToolStart,
        onToolEnd,
        variables: {},
      };

      if (currentPresetRef.current?.userInputForm && currentPresetRef.current?.userInputForm.length > 0) {
        // 直接从 context 获取表单数据
        const formValues = getFormData();
        messageParams.variables = formValues;

        // 如果有输入框变量，添加到 variables 中
        if (currentPresetRef.current?.inputFormEntryVariable) {
          messageParams.variables[currentPresetRef.current.inputFormEntryVariable] = 
            chatSenderRef.current?.getContent() || '';
        }
      }

      setHistoryMessages(messagesRef.current.slice(-10));
      await onChat(messageParams);
    },
    [getFormData, messagesRef, addConversation, addMessage, onChat]
  );

  const [agent] = useXAgent({
    request: handleAgentRequest,
  });

  const { onRequest } = useXChat({
    agent,
    defaultMessages: [],
    parser: (message: string) => message,
  });

  // 处理提交
  const handleSubmit = useCallback(
    (nextContent: string) => {
      if (!nextContent) return;
      onRequest(nextContent);
    },
    [onRequest]
  );

  return (
      <div className={styles.layout}>
        <div className={styles.chat}>
          <MessageList
            messages={messages}
            messageThoughts={messageThoughts}
            roles={roles}
            mode={mode}
            onRequest={onRequest}
          />
          {mode === 'remote' && (
            <Button
              icon={<SwapOutlined />}
              onClick={changeModeNormal}
              title="切换回正常模式"
              className="mb-4"
            >
              切换回正常模式
            </Button>
          )}
          {mode === 'normal' && <ChatPrompt onRequest={onRequest} />}
          <ChatSender
            ref={chatSenderRef}
            onSubmit={handleSubmit}
            onCancel={() => {
              console.log('您点击了取消');
              abortChat();
            }}
            loading={agent.isRequesting()}
            className={styles.sender}
          />
        </div>
      </div>
  );
};

export default ChatDetail;
