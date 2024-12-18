import { Message, ThoughtChainItemExpand } from '@/types/chat';

export enum SqliteChatChannel {
  GET_CHATS = 'sqlite:chats:get',
  GET_CONVERSATIONS = 'sqlite:conversations:get',
  GET_MESSAGES = 'sqlite:messages:get',
  ADD_CONVERSATION = 'sqlite:conversation:add',
  UPDATE_CONVERSATION = 'sqlite:conversation:update',
  ADD_CHAT = 'sqlite:chat:add',
  ADD_MESSAGE = 'sqlite:message:add',
  DELETE_CONVERSATION = 'sqlite:conversation:delete',
  CLEAR_CONVERSATION = 'sqlite:conversation:clear',
  DELETE_CHAT = 'sqlite:chat:delete',
  DELETE_MESSAGE = 'sqlite:message:delete',
  UPDATE_CHAT = 'sqlite:chat:update',
  UPDATE_MESSAGE = 'sqlite:message:update',
  GET_CONVERSATION = 'sqlite:conversation:get',
}

export interface SqliteChatRequest {
  'sqlite:conversation:add': {
    id: string;
    userId: string;
    label: string;
    presetId: string;
  };
  'sqlite:conversation:update': {
    id: string;
    userId: string;
  };
  'sqlite:chat:add': {
    id: string;
    userId: string;
    conversationId: string;
    title: string;
  };
  'sqlite:message:add': {
    id: string;
    userId: string;
    role: string;
    conversationId: string;
    chatId: string;
    content: string;
  };
  'sqlite:conversation:clear': {
    userId: string;
  };
  'sqlite:message:update': Message;
  'sqlite:messages:get': {
    userId: string;
    conversationId: string;
  };
  'sqlite:conversation:get': {
    userId: string;
    conversationId: string;
  };
}

export interface SqliteChatResponse {
  'sqlite:messages:get': {
    messages: Message[];
    thoughts: Record<string, ThoughtChainItemExpand>;
  };
}
