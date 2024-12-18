import { SqliteChatChannel, SqliteChatRequest, SqliteChatResponse } from '@/types/ipc/sqlite/chat';

export class ConversionService {
  static clearConversation(userId: string) {
    window.ipcRenderer.invoke(SqliteChatChannel.CLEAR_CONVERSATION, userId);
  }

  static async getConversations(userId: string) {
    return await window.ipcRenderer.invoke(SqliteChatChannel.GET_CONVERSATIONS, userId);
  }

  static async getConversation(userId: string, conversationId: string) {
    return await window.ipcRenderer.invoke(SqliteChatChannel.GET_CONVERSATION, userId, conversationId);
  }

  static deleteConversation(userId: string, conversationId: string) {
    window.ipcRenderer.invoke(SqliteChatChannel.DELETE_CONVERSATION, userId, conversationId);
  }

  static addConversation(conversation: SqliteChatRequest[SqliteChatChannel.ADD_CONVERSATION]) {
    window.ipcRenderer.invoke(SqliteChatChannel.ADD_CONVERSATION, conversation);
  }

  static addMessage(message: SqliteChatRequest[SqliteChatChannel.ADD_MESSAGE]) {
    window.ipcRenderer.invoke(SqliteChatChannel.ADD_MESSAGE, message);
  }

  static updateMessage(message: SqliteChatRequest[SqliteChatChannel.UPDATE_MESSAGE]) {
    console.log('updateMessage', message);
    // 过滤掉thought里的content和icon，这两个内容会在渲染时被重新生成
    for (const item of message.items) {
      if (item.type === 'thought') {
        delete item.content.content;
        delete item.content.icon;
      }
    }
    window.ipcRenderer.invoke(SqliteChatChannel.UPDATE_MESSAGE, message);
  }

  static getMessages(
    userId: string,
    conversationId: string
  ): Promise<SqliteChatResponse[SqliteChatChannel.GET_MESSAGES]> {
    return window.ipcRenderer.invoke(SqliteChatChannel.GET_MESSAGES, userId, conversationId);
  }
}
