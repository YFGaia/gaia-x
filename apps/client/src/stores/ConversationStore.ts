import { create } from 'zustand';
import { Conversation } from '@/types/chat';

export type ConversationSource = 'inner' | 'menu';

interface ConversationStore {
  conversations: Conversation[];
  activeKey: string;
  changeSource: ConversationSource;
  movingConversationId: string | null;
  setActiveKey: (key: string, source?: ConversationSource) => void;
  addConversation: (key: string, label: string, presetId: string) => void;
  setConversations: (conversations: Conversation[]) => void;
  updateConversation: (key: string, chatItem: Conversation) => void;
  moveConversationToTop: (conversationId: string) => void;
}

export const useConversationStore = create<ConversationStore>()((set) => ({
  conversations: [],
  activeKey: '-1',
  changeSource: 'menu',
  movingConversationId: null,
  setActiveKey: (key, source: ConversationSource = 'menu') =>
    set({
      activeKey: key,
      changeSource: source,
    }),
  addConversation: (key, label, presetId) =>
    set((state) => ({
      conversations: [{ key, label, presetId, messages: [] }, ...state.conversations],
      activeKey: key,
    })),
  setConversations: (conversations) => set({ conversations }),
  updateConversation: (key, chatItem) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.key === key ? chatItem : c)),
    })),
    moveConversationToTop: (conversationId: string) => {
      set((state) => {
        const conversation = state.conversations.find(c => c.key === conversationId);
        if (!conversation) return state;
        const otherConversations = state.conversations.filter(c => c.key !== conversationId);
        return {
          conversations: [conversation, ...otherConversations],
          movingConversationId: null
        };
      });
    },
}));
