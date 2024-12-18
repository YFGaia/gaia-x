import { RenderConfirmView } from '@/components/RenderConfirm';
import useAzureOpenAI, { RequestOptions } from '@/components/useXAgent/AzureOpenAI';
import { useConversation } from '@/hooks/Conversion';
import { useOnChat } from '@/hooks/OnChat';
import { useAppStateStore } from '@/stores/AppStateStore';
import { useConversationStore } from '@/stores/ConversationStore';
import { useRenderConfirmStore } from '@/stores/RenderConfirmStore';
import { useUserStore } from '@/stores/UserStore';
import { useViewStore } from '@/stores/ViewStore';
import { isChatError, Message, MessageItem, ThoughtChainItemExpand } from '@/types/chat';
import { ChatChannel, SettingChannel, ToolbarChannel } from '@/types/ipc/xKey';
import { Preset } from '@/types/xKey/types';
import { SwapOutlined, UserOutlined } from '@ant-design/icons';
import { Bubble, BubbleProps, useXAgent, useXChat } from '@ant-design/x';
import { THOUGHT_CHAIN_ITEM_STATUS } from '@ant-design/x/es/thought-chain/Item';
import {
  Button,
  Collapse,
  CollapseProps,
  GetProp,
  Select,
  Typography,
  message as messageAntd,
} from 'antd';
import { createStyles } from 'antd-style';
import markdownit from 'markdown-it';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import ChatPlaceholder from './ChatPlaceholder';
import ChatPrompt from './ChatPrompt';
import ChatSender from './ChatSender';
import ToolThoughtChain from './ToolThoughtChain';
import ContainerUpExpander from '@/components/ContainerUpExpander';
import ChatForm, { ChatFormRef } from './ChatForm';

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
      max-width: 700px;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: ${token.paddingLG}px;
      gap: 16px;
      .ant-bubble-list::-webkit-scrollbar {
        display: none;
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

// 渲染markdown
const md = markdownit({ html: true, breaks: true });
const renderMarkdown: BubbleProps['messageRender'] = (content) => {
  if (isChatError(content)) {
    return <Typography.Text type="danger">{content}</Typography.Text>;
  }
  return (
    <Typography>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
      <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
    </Typography>
  );
};

// 设置头像
const fooAvatar: React.CSSProperties = {
  color: '#f56a00',
  backgroundColor: '#fde3cf',
  marginTop: '7px',
};

const barAvatar: React.CSSProperties = {
  color: '#fff',
  backgroundColor: '#87d068',
  marginTop: '7px',
};

const thinkingItems = (reasoning: string): CollapseProps['items'] => {
  return [
    {
      key: '1',
      label: '推理过程',
      children: (
        <div className="flex flex-row relative">
          <div className="w-[4px] bg-gray-300  rounded-full absolute left-0 top-0 bottom-0 min-h-full"></div>
          <div className="pl-4 flex-1">{renderMarkdown(reasoning)}</div>
        </div>
      ),
    },
  ];
};

const ChatDetail: React.FC<{ params: Record<string, any> }> = ({ params }) => {
  const { activeKey, changeSource, setActiveKey } = useConversationStore();
  const { setView } = useViewStore();
  const { styles } = useStyle();
  const [selectPresetDisabled, setSelectPresetDisabled] = useState(false);
  const { addConversation, addMessage, updateMessage, getMessages, getConversation } =
    useConversation();
  const { setMode, mode, rightPanel } = useAppStateStore();
  const [ifShowForm, setIfShowForm] = useState(true);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const inputTextRef = useRef<string>('');
  const presetIdRef = useRef<string | null>(null);
  const presetsRef = useRef<Preset[]>([]);
  const ifShowFormRef = useRef<boolean>(true);
  const confirms = useRenderConfirmStore(
    useShallow((state) => state.getConversationConfirms(activeKey))
  );
  const chatFormRef = useRef<ChatFormRef>(null);

  const changeModeNormal = async () => {
    setMode('normal');
  };

  const [messageThoughts, setMessageThoughts] = useState<Record<string, ThoughtChainItemExpand>>(
    {}
  );
  /** 输入框内容 */
  const [content, setContent] = React.useState('');
  /** 消息列表 */
  const [messages, setMessages] = useState<Array<Message>>([]);
  /** 使用 onChat 发送消息 */
  const { onChat, setHistoryMessages, clearChatAPI, abortChat } = useOnChat();

  const messagesRef = useRef<Array<Message>>([]);

  const findPreset = (id: string) => {
    console.log('presetsRef.current', presetsRef.current);
    return presetsRef.current.find((preset) => preset.id === id) as Preset;
  };

  const changeChatSenderContent = (content: string) => {
    setContent(content);
    inputTextRef.current = content;
  };

  useEffect(() => {
    if (changeSource === 'inner') {
      return;
    }

    console.log('params', params);
    if (params.mode) {
      setMode(params.mode);
    }

    getMessages(activeKey).then((res) => {
      if (res?.messages?.length > 0) {
        setSelectPresetDisabled(true);
      } else {
        setSelectPresetDisabled(false);
      }
      console.log('res', res);
      setMessages(res.messages);
      setMessageThoughts(res.thoughts);
      clearChatAPI();
      messagesRef.current = res.messages;
      console.log('设置历史消息：', res.messages.slice(-10));
    });

    getConversation(activeKey).then((res) => {
      console.log('getConversation res', res);
      window.ipcRenderer.invoke(SettingChannel.GET_PRESETS).then((presets) => {
        presetsRef.current = presets.presets;
        console.log('presets', presets);
        if (params.presetId) {
          console.log('res', res);
          setPresetId(params.presetId);
          setPreset(findPreset(params.presetId));
          presetIdRef.current = params.presetId;
        } else if (res?.presetId) {
          setPresetId(res.presetId);
          setPreset(findPreset(res.presetId));
          presetIdRef.current = res.presetId;
        } else {
          setPresetId(presets.presets[0]?.id || null);
          setPreset(findPreset(presets.presets[0]?.id || null));
          presetIdRef.current = presets.presets[0]?.id || null;
        }
        console.log('presetId', presetId);
      });
    });
  }, [activeKey, changeSource]);

  useEffect(() => {
    // setMessageThoughts({}); // 清空思维链
    // setMessages([]);
    // azureOpenAI.clearHistory?.();
    const cleanNewChat = window.ipcRenderer.on(
      ChatChannel.NEW_CHAT,
      (_: Electron.IpcRendererEvent, preset: Preset, conversationId: string) => {
        console.log('NEW_CHAT', preset, conversationId);
        setActiveKey(conversationId);
        setView('chat', { chatId: conversationId, presetId: preset.id });
        setPresetId(preset.id);
        setPreset(preset);
        setIfShowForm(true);
        ifShowFormRef.current = true;
        presetIdRef.current = preset.id;
        setMode('mini');
        // 重置消息历史
        setMessageThoughts({}); // 清空思维链
        setMessages([]); // 清空消息
        messagesRef.current = [];
        clearChatAPI(); // 清空历史消息
      }
    );

    const cleanTextSelected = window.ipcRenderer.on(
      ToolbarChannel.TEXT_SELECTED,
      (_: Electron.IpcRendererEvent, { text }: { text: string }) => {
        setContent(text?.trim());
        inputTextRef.current = text?.trim();
      }
    );

    return () => {
      console.log('清理新聊天');
      cleanNewChat();
      cleanTextSelected();
    };
  }, [preset, presetId, mode]);

  const onToolStart = (name: string, args: any, messageItemId?: string) => {
    const thought: ThoughtChainItemExpand = {
      key: Date.now().toString(),
      title: `调用工具: ${name}`,
      description: '执行中',
      requestContent: args,
      responseContent: '等待响应...',
      isError: false,
      status: 'pending',
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
      setSelectPresetDisabled(true);
      console.log('presetId', presetIdRef.current);
      await addConversation(message || '新会话', presetIdRef.current || '', 'inner');

      if (!message) return;

      const userMessage = await addMessage(message, 'user');
      
      const tempMessage: Message = {
        id: userMessage.id,
        role: 'user',
        status: 'success',
        items: [
          {
            id: userMessage.id,
            content: message,
            type: 'message',
          },
        ],
      }

      setMessages((prev) => [
        ...prev,
        tempMessage
      ]);

      // 添加 AI 响应消息（初始状态为 loading）

      const aiMessage = await addMessage('', 'ai');
      console.log('aiMessage', aiMessage);
      aiMessage.status = 'loading';

      setMessages((prev) => [...prev, aiMessage]);

      // 包装回调函数以更新 AI 消息
      const wrappedOnUpdate = (message: Message) => {
        onUpdate(message.items[message.items.length - 1].content);
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

      const wrappedOnSuccess = (massageId: string, msgItem: MessageItem) => {
        setMessages((prev) =>
          prev.map((msg) => {
            console.log('wrappedOnSuccess', msg, massageId, msgItem);
            if (msg.id === massageId) {
              msg.status = 'success';
            }
            return msg;
          })
        );
        updateMessage(aiMessage);
        messagesRef.current.push(tempMessage, aiMessage);
        onSuccess(msgItem?.content || '');
      };

      const presetCurrent = findPreset(presetIdRef.current || '');
      const messageParams: RequestOptions = {
        message: userMessage,
        aiMessage,
        preset: presetCurrent,
        conversationId: useConversationStore.getState().activeKey,
        onSuccess: wrappedOnSuccess,
        onUpdate: wrappedOnUpdate,
        onError: wrappedOnError,
        onToolStart,
        onToolEnd,
        variables: {},
      };
      if (presetCurrent?.userInputForm && presetCurrent?.userInputForm.length > 0) {
        if (ifShowFormRef.current) {
          const values = await chatFormRef.current?.getValues();
          messageParams.variables = values || {};
        } else {
          presetCurrent.userInputForm.map((item) => {
            Object.values(item).forEach((item2) => {
              messageParams.variables[item2.variable] = item2.default;
            });
          });
          presetCurrent?.inputFormEntryVariable &&
            (messageParams.variables[presetCurrent.inputFormEntryVariable] = inputTextRef.current);
        }
      }
      setHistoryMessages(messagesRef.current.slice(-10));

      await onChat(messageParams);
      // await azureOpenAI.sendMessage(messageParams);
    },
    [ messagesRef, presetId, addConversation, addMessage, updateMessage, setMessages, onChat, preset]
  );

  const [agent] = useXAgent({
    request: handleAgentRequest,
  });

  const { onRequest } = useXChat({
    agent,
    defaultMessages: [],
    parser: (message: string) => message,
  });

  // 更新 agent
  useEffect(() => {
    if (agent) {
      setMessages([]); // 清空消息
    }
  }, [agent, setMessages]);

  const items: GetProp<typeof Bubble.List, 'items'> = messages.map(
    ({ id, items, role, status }) => {
      return {
        key: id,
        status,
        role,
        variant: 'filled',
        avatar:
          role === 'user'
            ? { icon: <UserOutlined />, style: fooAvatar }
            : { icon: <UserOutlined />, style: barAvatar },
        content:
          role === 'user' ? (
            items[0].content
          ) : (
            <div className="flex flex-col" key={id}>
              {items.map((item) => {
                if (item.type === 'thought') {
                  return <ToolThoughtChain thought={messageThoughts[item.id]} key={item.id} />;
                } else if (item.type === 'message') {
                  return (
                    <Bubble
                      content={item.content}
                      key={item.id}
                      messageRender={renderMarkdown}
                      variant="borderless"
                      // typing={{ step: 20, interval: 100 }}
                    />
                  );
                } else if (item.type === 'thinking') {
                  return (
                    <Collapse
                      key={`thinking-${item.id}`}
                      ghost
                      items={thinkingItems(item.content)}
                      accordion
                      defaultActiveKey={['1']}
                    />
                  );
                } else if (rightPanel !== 'open' || mode !== 'normal') {
                  const confirmItems = confirms
                    .filter((confirm) => confirm.chatId === id)
                    .map((confirm) => (
                      <div key={confirm.item.id}>
                        <RenderConfirmView {...confirm} />
                      </div>
                    ));

                  // 如果没有确认项，返回null而不是空数组
                  return confirmItems.length > 0 ? (
                    <React.Fragment key={`confirms-${id}-${item.id}`}>
                      {confirmItems}
                    </React.Fragment>
                  ) : null;
                }
                return null;
              })}
            </div>
          ),
      };
    }
  );

  const changePreset = (presetId: string) => {
    setPresetId(presetId);
    presetIdRef.current = presetId;
    const tempPreset = findPreset(presetId);
    setPreset(tempPreset);
    if (tempPreset?.userInputForm && tempPreset?.userInputForm.length > 0) {
      setIfShowForm(true);
      ifShowFormRef.current = true;
      inputTextRef.current = '';
    }
  };

  const onSubmit = (nextContent: string) => {
    if (!nextContent) return;
    console.log('您点击了提交');
    setIfShowForm(false);
    ifShowFormRef.current = false;
    onRequest(nextContent);
    setContent('');
  };

  return (
    <div className={styles.layout}>
      <div className={styles.chat}>
        <div>
          {presetsRef.current.length > 0 && (
            <Select
              style={{ minWidth: 200 }}
              disabled={selectPresetDisabled}
              size="small"
              value={presetId}
              onChange={changePreset}
              options={presetsRef.current.map((preset) => ({
                label: preset.title,
                value: preset.id,
              }))}
            />
          )}
        </div>
        <Bubble.List
          items={
            items.length > 0
              ? items
              : mode === 'normal'
              ? [
                  {
                    key: 'placeholder',
                    content: <ChatPlaceholder onRequest={onRequest} />,
                    variant: 'outlined',
                  },
                ]
              : []
          }
          roles={roles}
          className={styles.messages}
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
        {preset?.userInputForm && preset?.userInputForm.length > 0 && (
          <ContainerUpExpander
            title="查看表单"
            buttonWidth={110}
            buttonAlign="left"
            defaultExpanded={true}
            expanded={ifShowForm}
            onExpandChange={(expanded) => setIfShowForm(expanded)}
          >
            <ChatForm
              preset={preset}
              inputText={inputTextRef.current}
              ref={chatFormRef}
              onEntryVariableChange={(value) => {
                inputTextRef.current = value;
                setContent(value);
              }}
            />
          </ContainerUpExpander>
        )}
        {mode === 'normal' && <ChatPrompt onRequest={onRequest} />}
        {/* 🌟 输入框 */}
        <ChatSender
          value={content}
          onSubmit={onSubmit}
          onChange={changeChatSenderContent}
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
