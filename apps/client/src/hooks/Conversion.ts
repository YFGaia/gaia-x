import { useUserStore } from '@/stores/UserStore';
import { ConversionService } from '@/services/ConversionService';
import { useViewStore } from '@/stores/ViewStore';
import { ConversationSource, useConversationStore } from '@/stores/ConversationStore';
import { SqliteChatChannel, SqliteChatRequest } from '@/types/ipc/sqlite/chat';
import { useCallback } from 'react';
import { generateUniqueId } from '@/utils/common';
import { Conversation, Message, MessageItem, MessageRole } from '@/types/chat';
import { SettingChannel } from '@/types/ipc/xKey';

export const useConversation = () => {
  const { getUserId } = useUserStore();
  const { setView } = useViewStore();
  const {
    setConversations,
    setActiveKey,
    activeKey,
    addConversation: addConversationStore,
    moveConversationToTop
  } = useConversationStore();

  const clearConversation = () => {
    ConversionService.clearConversation(getUserId());
    setConversations([]);
    setActiveKey('-1');
    setView('chat', { chatId: '-1' });
  };

  const newConversation = () => {
    setActiveKey('-1');
    setView('chat', { chatId: '-1' });
  };

  const fetchConversations = async () => {
    setConversations(await ConversionService.getConversations(getUserId()));
  };
  const getConversation = async (conversationId: string) => {
    return await ConversionService.getConversation(getUserId(), conversationId);
  };
  const deleteConversation = async (conversationId: string) => {
    await ConversionService.deleteConversation(getUserId(), conversationId);
    fetchConversations();
    if (activeKey === conversationId) {
      newConversation();
    }
  };
  const changeConversation = (conversationId: string) => {
    setActiveKey(conversationId);
    setView('chat');
  };

  const addConversation = useCallback(
    async (message: string, presetId: string, source: ConversationSource = 'menu'): Promise<void> => {
      if (useConversationStore.getState().activeKey !== '-1') {
        return;
      }
      const conversationKey = generateUniqueId('conversation');
      const conversation: SqliteChatRequest[SqliteChatChannel.ADD_CONVERSATION] = {
        id: conversationKey,
        userId: getUserId(),
        label: message,
        presetId,
      };
      await ConversionService.addConversation(conversation);
      addConversationStore(conversationKey, message, presetId);
      setActiveKey(conversationKey, source);
    },
    [getUserId]
  );

  const addMessage = useCallback(
    async (message: string, role: MessageRole): Promise<Message> => {
      const messageId = generateUniqueId();
      const conversationId = useConversationStore.getState().activeKey;
      moveConversationToTop(conversationId);
      const messageItem: MessageItem = {
        id: messageId,
        content: message,
        type: 'message',
      };
      await ConversionService.addMessage({
        id: messageId,
        userId: getUserId(),
        role,
        conversationId,
        chatId: conversationId,
        content: JSON.stringify(messageItem),
      });
      if (message.length > 0) {
        return {
          id: messageId,
          role,
          status: 'success',
          items: [messageItem],
        };
      }
      return {
        id: messageId,
        role,
        status: 'success',
        items: [],
      };
    },
    [getUserId]
  );

  const updateMessage = useCallback(
    async (message: Message) => {
      await ConversionService.updateMessage(message);
    },
    [getUserId]
  );

  const getMessages = useCallback(async (conversationId: string) => {
    return await ConversionService.getMessages(getUserId(), conversationId);
  }, [getUserId]);

  return {
    clearConversation,
    newConversation,
    fetchConversations,
    changeConversation,
    deleteConversation,
    addConversation,
    addMessage,
    updateMessage,
    getMessages,
    getConversation,
  };
};
