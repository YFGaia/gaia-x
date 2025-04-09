import {
  Conversation,
  Message,
  MessageItem,
  MessageRole,
  ThoughtChainItemExpand,
} from '@/types/chat';
import { Preset } from '@/types/xKey/types';
import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import { ChatChannel, SettingChannel } from '@/types/ipc/xKey';
import { ConversationSource, useConversationStore } from '@/stores/ConversationStore';
import { useConversation } from '@/hooks/Conversion';
import { ConversionService } from '@/services/ConversionService';
import { useUserStore } from '@/stores/UserStore';
import { useOnChat } from '@/hooks/OnChat';

interface ChatContextType {
  // 消息相关
  messages: Message[];
  messageThoughts: Record<string, ThoughtChainItemExpand>;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: string, role: MessageRole) => Promise<Message>;
  addConversation: (message: string, presetId: string, source: ConversationSource) => void;
  updateMessage: (messageId: string, update: Message) => void;
  messageSuccess: (messageId: string, aiMessage: Message) => void;
  clearMessages: () => void;
  setMessageThoughts: React.Dispatch<React.SetStateAction<Record<string, ThoughtChainItemExpand>>>;
  // Preset 相关
  currentPreset: Preset | null;
  presets: Preset[];
  isPresetDisabled: boolean;
  // Preset 方法
  setCurrentPreset: (preset: Preset) => void;
  loadPresets: () => Promise<void>;
  findPreset: (id: string) => Preset | undefined;
  // 会话相关
  activeConversationId: string;
  updateConversationPreset: (conversationId: string, presetId: string) => Promise<void>;

  // 表单相关
  getFormData: () => Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}

export const ChatContext = createContext<ChatContextType>({
  messages: [],
  messageThoughts: {},
  setMessages: () => {},
  addMessage: async (message: string, role: MessageRole) => {
    // 返回一个默认的 Message 对象的 Promise
    return Promise.resolve({
      id: '',
      role: role,
      status: 'success',
      items: [
        {
          id: '',
          content: message,
          type: 'message',
        },
      ],
    });
  },
  addConversation: () => {},
  updateMessage: () => {},
  messageSuccess: () => {},
  clearMessages: () => {},
  setMessageThoughts: () => {},
  currentPreset: {} as Preset,
  presets: [],
  isPresetDisabled: false,
  setCurrentPreset: () => {},
  loadPresets: async () => {},
  findPreset: () => undefined,
  activeConversationId: '',
  updateConversationPreset: async () => {},
  getFormData: () => [],
  setFormData: () => {},
});

export const useChatContext = () => {
  return useContext(ChatContext);
};

interface ChatProviderProps {
  children: React.ReactNode;
  onPresetChange?: (preset: Preset) => void;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children, onPresetChange }) => {
  const { activeKey: activeConversationId, changeSource, setActiveKey } = useConversationStore();
  console.log('activeConversationId', activeConversationId);
  const { getUserId } = useUserStore();
  const {
    getConversation,
    getMessages: getConversationMessages,
    addConversation,
    addMessage: addConversationMessage,
    updateMessage: updateConversationMessage,
  } = useConversation();
  const { clearChatAPI } = useOnChat();

  // 消息相关状态
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [messageThoughts, setMessageThoughtsState] = useState<
    Record<string, ThoughtChainItemExpand>
  >({});
  const messagesRef = useRef<Message[]>([]);

  // Preset 相关状态
  const [currentPreset, setCurrentPresetState] = useState<Preset | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const presetsRef = useRef<Preset[]>([]);
  const [formData, setFormDataState] = useState<Record<string, any>>({});

  // 根据消息状态决定是否禁用preset选择
  const isPresetDisabled = messages.length > 0;

  // 消息相关方法
  const setMessages = useCallback((newMessages: Message[]) => {
    setMessagesState(newMessages);
    messagesRef.current = newMessages;
  }, []);

  const addMessage = useCallback(async (message: string, role: MessageRole) => {
    let dbMessage = await addConversationMessage(message, role);
    if (role == 'user') {
      dbMessage = {
        id: dbMessage.id,
        role: 'user',
        status: 'success',
        items: [
          {
            id: dbMessage.id,
            content: message,
            type: 'message',
          },
        ],
      };
    } else if (role == 'ai') {
      dbMessage.status = 'loading';
    }
    setMessagesState((prev) => [...prev, dbMessage]);
    messagesRef.current = [...messagesRef.current, dbMessage];
    console.log('messagesRef.current', messagesRef.current);
    return dbMessage;
  }, []);

  const updateMessage = useCallback((messageId: string, update: Message) => {
    setMessagesState((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, update } : msg))
    );
    messagesRef.current = messagesRef.current.map((msg) =>
      msg.id === messageId ? { ...msg, ...update } : msg
    );
    updateConversationMessage(update);
  }, []);

  const clearMessages = () => {
    setMessagesState([]);
    setMessageThoughtsState({});
    messagesRef.current = [];
  };

  const setMessageThoughts = setMessageThoughtsState;

  const messageSuccess = useCallback((messageId: string, aiMessage: Message) => {
    setMessagesState((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, status: 'success' } : msg))
    );

    updateConversationMessage(aiMessage);
  }, []);

  // Preset 相关方法
  const findPreset = (id: string) => {
    return presetsRef.current.find((preset) => preset.id === id);
  };

  // 更新会话的preset
  const updateConversationPreset = useCallback(
    async (conversationId: string, presetId: string) => {
      try {
        const conversation = await getConversation(conversationId);
      } catch (error) {
        console.error('Failed to update conversation preset:', error);
      }
    },
    [getConversation, getUserId]
  );

  const setCurrentPreset = useCallback(
    async (preset: Preset) => {
      console.log('activeConversationId', activeConversationId);
      if (activeConversationId != '-1') {
        return;
      }
      console.log('setCurrentPreset', preset);
      setCurrentPresetState(preset);
      onPresetChange?.(preset);
    },
    [updateConversationPreset, onPresetChange]
  );

  // 加载presets
  const loadPresets = useCallback(async () => {
    console.log('loadPresets', activeConversationId);
    try {
      const response = await window.ipcRenderer.invoke(SettingChannel.GET_PRESETS);
      const presetList = response.presets;
      setPresets(presetList);
      presetsRef.current = presetList;

      if (activeConversationId != '-1') {
        const conversation = await getConversation(activeConversationId);
        console.log('conversation', conversation);
        if (conversation?.presetId) {
          const conversationPreset = findPreset(conversation.presetId);
          console.log('conversationPreset', conversationPreset);
          if (conversationPreset) {
            setCurrentPresetState(conversationPreset);
            return;
          }
        }
      } else {
        console.log('presetList', presetList);
        if (presetList.length > 0) {
          const defaultPreset = presetList[0];
          setCurrentPresetState(defaultPreset);
        }
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  }, [activeConversationId]);

  // 加载会话消息
  const loadConversationMessages = useCallback(async () => {
    console.log('loadConversationMessages', activeConversationId);
    if (!activeConversationId) return;
    try {
      const result = await getConversationMessages(activeConversationId);
      console.log('activeConversationId', activeConversationId);
      console.log('result', result);
      if (result) {
        setMessagesState(result.messages);
        setMessageThoughtsState(result.thoughts);
        messagesRef.current = result.messages;
        console.log('messagesRef.current', messagesRef.current);
        clearChatAPI();
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    }
  }, [activeConversationId]);

  // 监听会话变化
  useEffect(() => {
    console.log('activeConversationId 变化了，触发', activeConversationId);
    loadPresets();
    if (changeSource != 'inner') {
      loadConversationMessages();
    }
    if (activeConversationId == '-1') {
      clearMessages();
    }
  }, [activeConversationId]);
  

  useEffect(() => {
    const cleanNewChat = window.ipcRenderer.on(
      ChatChannel.NEW_CHAT,
      (_: Electron.IpcRendererEvent, preset: Preset, conversationId: string) => {
        console.log('NEW_CHAT', preset, conversationId);
        setActiveKey(conversationId);
        setCurrentPresetState(preset);
        // 重置消息历史
        setMessageThoughts({}); // 清空思维链
        setMessagesState([]); // 清空消息
        messagesRef.current = [];
        clearChatAPI(); // 清空历史消息
      }
    );

    return () => {
      console.log('清理新聊天');
      cleanNewChat();
    };
  }, []);

  // 获取表单数据的方法
  const getFormData = useCallback(() => {
    return formData;
  }, [formData]);

  // 设置表单数据的方法
  const setFormData = useCallback((data: Record<string, any>) => {
    setFormDataState(data);
  }, []);

  const contextValue: ChatContextType = {
    // 消息相关
    messages,
    messageThoughts,
    setMessages,
    addMessage,
    addConversation,
    updateMessage,
    clearMessages,
    setMessageThoughts,
    // Preset 相关
    currentPreset,
    presets,
    isPresetDisabled,
    messageSuccess,
    setCurrentPreset,
    loadPresets,
    findPreset,
    // 会话相关
    activeConversationId,
    updateConversationPreset,
    // 表单相关
    getFormData,
    setFormData,
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};
