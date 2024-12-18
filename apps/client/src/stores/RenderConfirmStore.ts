import { ConfirmProps } from '@/components/RenderConfirm';
import { create } from 'zustand';

export interface RenderConfirm {
  conversationId: string;
  chatId: string;
  item: ConfirmProps;
}

interface RenderConfirmStore {
  confirms: RenderConfirm[];
  getConversationConfirms: (conversationId: string) => RenderConfirm[];
  addConfirm: (confirm: RenderConfirm) => void;
  clearConfirm: () => void;
  removeConfirm: (conversationId: string, chatId: string, itemId: string) => void;
  setResult: (confirm: RenderConfirm) => void;
  waitResult: (confirm: RenderConfirm) => Promise<RenderConfirm>;
}

export const useRenderConfirmStore = create<RenderConfirmStore>((set, get) => ({
  confirms: [],
  getConversationConfirms: (conversationId) => {
    return get().confirms.filter(item => item.conversationId === conversationId);
  },
  addConfirm: (confirm: RenderConfirm) => {
    set((state) => ({
      confirms: [...state.confirms, confirm],
    }));
  },
  clearConfirm: () => {
    set({ confirms: [] });
  },
  removeConfirm: (conversationId: string, chatId: string, itemId: string) => {
    set((state) => ({
      confirms: state.confirms.filter(
        (item) =>
          item.conversationId !== conversationId ||
          item.chatId !== chatId ||
          item.item.id !== itemId
      ),
    }));
  },
  setResult: (confirm: RenderConfirm) => {
    set((state) => ({
      confirms: state.confirms.map((item) =>
        item.conversationId === confirm.conversationId &&
        item.chatId === confirm.chatId &&
        item.item.id === confirm.item.id
          ? confirm
          : item
      ),
    }));
  },
  waitResult: async (confirm: RenderConfirm) => {
    await get().addConfirm(confirm);
    return new Promise<RenderConfirm>((resolve) => {
      const unsubscribe = useRenderConfirmStore.subscribe((state) => {
        const result = state.confirms.find(
          (item) =>
            item.conversationId === confirm.conversationId &&
            item.chatId === confirm.chatId &&
            item.item.id === confirm.item.id
        );
        if (result) {
          unsubscribe();
          resolve(result);
        }
      });
    });
  },
}));
