import { ToolCall } from '@/api/chatApi/types';
import { RenderConfirm } from '@/stores/RenderConfirmStore';
import { ThoughtChainItem } from '@ant-design/x';
import { THOUGHT_CHAIN_ITEM_STATUS } from '@ant-design/x/es/thought-chain/Item';

type MessageItemType = 'message' | 'thought' | 'render' | 'thinking' | 'tool' | 'callTools';

type MessageStatus = 'loading' | 'success' | 'error';

export type MessageRole = 'user' | 'ai' | 'system';

export interface Conversation {
  id?: string;
  key: string;
  label: string;
  presetId: string;
  messages: Message[];
}

export interface Message {
  id: string;
  role: MessageRole;
  status: MessageStatus;
  items: MessageItem[];
}

export interface MessageItem {
  id: string;
  type: MessageItemType;
  content: string | any;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ThoughtChainItemExpand extends ThoughtChainItem {
  requestContent: string | any;
  responseContent: string | any;
  isError: boolean;
  iconStr: THOUGHT_CHAIN_ITEM_STATUS;
}

export const CHAT_ERROR_PREFIX = '对话出错：' as const;

export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return `${CHAT_ERROR_PREFIX}${error.message}`;
  }
  if (typeof error === 'string') {
    return `${CHAT_ERROR_PREFIX}${error}`;
  }
  return `${CHAT_ERROR_PREFIX}未知错误`;
};

export const isChatError = (message: string): boolean => {
  return message.startsWith(CHAT_ERROR_PREFIX);
};
