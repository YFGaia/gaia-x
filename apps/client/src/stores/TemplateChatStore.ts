import { create } from "zustand";
import { Preset } from '@/types/xKey/types'
import { defaultPreset } from "./ToolPresetStore";
import { ChatMessage } from "@/types/xKey/types";

const MAX_WINDOW_HEIGHT = 671;

/** xKey 工具预设 Store */
interface TemplateChatStore {
  preset: Preset | null;
  setPreset: (preset: Preset | null) => void;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string, reasoning?: string) => void;
  windowHeight: number;
  setWindowHeight: (height: number) => void;
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
}

export const useTemplateChatStore = create<TemplateChatStore>((set, get) => ({
  preset: defaultPreset,
  setPreset: (preset: Preset | null) => set({ preset }),
  messages: [],
  setMessages: (messages: ChatMessage[]) => set({ messages }),
  appendMessage: (message: ChatMessage) => set((state) => ({
    messages: [...state.messages, message]
  })),
  updateLastMessage: (content: string, reasoning?: string) => set((state) => {
    const messages = [...state.messages];
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role === 'user') {
      return {
        messages: [...messages, {
          content,
          role: 'assistant' as const,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          reasoning
        }]
      };
    }
    messages[messages.length - 1] = {
      ...lastMessage,
      content,
      reasoning: reasoning || lastMessage.reasoning
    };
    return { messages };
  }),
  windowHeight: MAX_WINDOW_HEIGHT,
  setWindowHeight: (height: number) => set({ windowHeight: height }),
  isPinned: false,
  setIsPinned: (isPinned: boolean) => set({ isPinned }),
  isGenerating: false,
  setIsGenerating: (isGenerating: boolean) => set({ isGenerating }),
}));
