import { IpcMainInvokeEvent } from 'electron';
import { SqliteManager } from '~/main/services/sqlite';
import { UserManager } from '~/main/services/sqlite/modules/user';

export class User {
  private userManager: UserManager;

  constructor() {
    this.userManager = new UserManager(SqliteManager.getInstance().db);
  }

  get(_: IpcMainInvokeEvent, userId: string) {
    return this.userManager.getUser(userId);
  }

  update(_: IpcMainInvokeEvent, userId: string, name: string, token: string) {
    return this.userManager.updateUser(userId, name, token);
  }

  logout(_: IpcMainInvokeEvent, userId: string) {
    return this.userManager.logout(userId);
  }

  getLastUser(_: IpcMainInvokeEvent) {
    return this.userManager.getLastUser();
  }
}
