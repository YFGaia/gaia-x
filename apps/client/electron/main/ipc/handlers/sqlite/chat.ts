import { Message, MessageItem } from '@/types/chat';
import { SqliteChatChannel, SqliteChatRequest } from '@/types/ipc/sqlite/chat';
import { ThoughtChainItem } from '@ant-design/x';
import { IpcMainInvokeEvent } from 'electron';
import { SqliteManager } from '~/main/services/sqlite';
import { ChatManager } from '~/main/services/sqlite/modules/chat';

export class Chat {
  private chatManager: ChatManager = new ChatManager(SqliteManager.getInstance().db);

  getConversations(_: IpcMainInvokeEvent, userId: string) {
    return this.chatManager.getConversations(userId);
  }

  createConversation(
    _: IpcMainInvokeEvent,
    request: SqliteChatRequest[SqliteChatChannel.ADD_CONVERSATION]
  ) {
    return this.chatManager.createConversation(request);
  }

  getChats(_: IpcMainInvokeEvent, userId: string, conversationId: string) {
    return this.chatManager.getChats(userId, conversationId);
  }

  createChat(_: IpcMainInvokeEvent, request: SqliteChatRequest[SqliteChatChannel.ADD_CHAT]) {
    return this.chatManager.createChat(request);
  }

  deleteConversation(_: IpcMainInvokeEvent, userId: string, id: string) {
    return this.chatManager.deleteConversation(userId, id);
  }

  clearConversation(_: IpcMainInvokeEvent, userId: string) {
    return this.chatManager.clearConversation(userId);
  }

  createMessage(_: IpcMainInvokeEvent, request: SqliteChatRequest[SqliteChatChannel.ADD_MESSAGE]) {
    return this.chatManager.createMessage(request);
  }

  updateMessage(
    _: IpcMainInvokeEvent,
    request: SqliteChatRequest[SqliteChatChannel.UPDATE_MESSAGE]
  ) {
    return this.chatManager.updateMessage(request);
  }

  getMessages(
    _: IpcMainInvokeEvent,
    userId: string,
    conversationId: string
  ): {
    messages: Message[];
    thoughts: Record<string, ThoughtChainItem>;
  } {
    const messageData = this.chatManager.getMessages(userId, conversationId) as any[];
    let messages: Message[] = [];
    let thoughts: Record<string, ThoughtChainItem> = {};
    for (const message of messageData) {
      message.content = JSON.parse(message.content);
      if (message.role === 'user') {
        messages.push({
          id: message.id,
          role: message.role,
          status: message.status,
          items: [message.content],
        });
        continue;
      }
      const messageItemData: MessageItem[] = [];
      if (Array.isArray(message.content)) {
        for (const messageItem of message.content) {
          messageItemData.push(messageItem);
          if (messageItem.type === 'thought') {
            thoughts[messageItem.id] = messageItem.content;
          }
        }
      }
      messages.push({
        id: message.id,
        role: message.role,
        status: message.status,
        items: messageItemData,
      });
    }
    return { messages, thoughts };
  }

  getConversation(_: IpcMainInvokeEvent, userId: string, conversationId: string) {
    return this.chatManager.getConversation(userId, conversationId);
  }
}
