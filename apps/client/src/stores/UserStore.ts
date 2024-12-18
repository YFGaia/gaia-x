import { SqliteUserChannel } from '@/types/ipc/sqlite/user';
import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  token: string;
}

interface UserStore {
  userInfo: User;
  setUserInfo: (userInfo: User) => void;
  logout: () => void;
  getUserId: () => string;
}

export const useUserStore = create<
  UserStore & {
    initialize: () => Promise<User>;
  }
>((set, get) => ({
  userInfo: { id: '', username: '', token: '' },
  initialize: async () => {
    const lastUser = await window.ipcRenderer.invoke(SqliteUserChannel.GET_LAST_USER);
    if (lastUser) {
      set({ userInfo: lastUser });
    }
    return lastUser;
  },
  setUserInfo: (userInfo: User) => {
    set({ userInfo });
  },
  logout: () => {
    set({ userInfo: { id: '', username: '', token: '' } });
  },
  getUserId: () => {
    return get().userInfo.id;
  },
  getUserName: () => {
    return get().userInfo.username;
  },
  getToken: () => {
    return get().userInfo.token;
  },
}));
