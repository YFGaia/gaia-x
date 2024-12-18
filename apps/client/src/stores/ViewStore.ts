import { create } from "zustand";

export type ViewType = 'chat' | 'setting' | 'extension';

interface ViewStore {
  currentView: ViewType;
  viewParams: Record<string, any>;
  setView: (view: ViewType, params?: Record<string, any>) => void;
}

export const useViewStore = create<ViewStore>((set) => ({
  currentView: "chat",
  viewParams: {},
  setView: (view, params = {}) =>
    set({ currentView: view, viewParams: params }),
}));
