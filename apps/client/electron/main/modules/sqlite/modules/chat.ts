import { SqliteChatChannel } from '@/types/ipc/sqlite/chat';
import { ipcMain } from 'electron';
import { Chat } from '~/main/ipc/handlers/sqlite/chat';

export const register = () => {
  const chat = new Chat();
  ipcMain.handle(SqliteChatChannel.GET_CONVERSATIONS, chat.getConversations.bind(chat));
  ipcMain.handle(SqliteChatChannel.ADD_CONVERSATION, chat.createConversation.bind(chat));
  ipcMain.handle(SqliteChatChannel.GET_CHATS, chat.getChats.bind(chat));
  ipcMain.handle(SqliteChatChannel.ADD_CHAT, chat.createChat.bind(chat));
  ipcMain.handle(SqliteChatChannel.DELETE_CONVERSATION, chat.deleteConversation.bind(chat));
  ipcMain.handle(SqliteChatChannel.CLEAR_CONVERSATION, chat.clearConversation.bind(chat));
  ipcMain.handle(SqliteChatChannel.ADD_MESSAGE, chat.createMessage.bind(chat));
  ipcMain.handle(SqliteChatChannel.UPDATE_MESSAGE, chat.updateMessage.bind(chat));
  ipcMain.handle(SqliteChatChannel.GET_MESSAGES, chat.getMessages.bind(chat));
  ipcMain.handle(SqliteChatChannel.GET_CONVERSATION, chat.getConversation.bind(chat));
};
