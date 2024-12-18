import { create } from "zustand";

interface RemoteStore {
  url: string;
  setUrl: (url: string) => void;
  loaded: boolean;
  setLoaded: (loaded: boolean) => void;
  waitLoaded: (url: string) => Promise<void>;
}

export const useRemoteStore = create<RemoteStore>((set, get) => ({
  url: "",
  setUrl: (url: string) => set({ url }),
  loaded: false,
  setLoaded: (loaded: boolean) => set({ loaded }),
  waitLoaded: async (url: string) => {
    await get().setUrl(url);
    return new Promise<void>((resolve) => {
      const unsubscribe = useRemoteStore.subscribe((state) => {
        if (state.loaded) {
          unsubscribe();
          resolve();
        }
      });
    });
  },
}));
