import { SqliteUserChannel } from '@/types/ipc/sqlite/user';
import { ipcMain } from 'electron';
import { User } from '~/main/ipc/handlers/sqlite/user';

export const register = () => {
  const user = new User();
  ipcMain.handle(SqliteUserChannel.GET_USER, user.get.bind(user));
  ipcMain.handle(SqliteUserChannel.UPDATE_USER, user.update.bind(user));
  ipcMain.handle(SqliteUserChannel.LOGOUT, user.logout.bind(user));
  ipcMain.handle(SqliteUserChannel.GET_LAST_USER, user.getLastUser.bind(user));
};
