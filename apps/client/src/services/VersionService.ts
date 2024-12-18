import { VersionApi } from '@/api/modules/version';
import { UtilsChannel } from '@/types/ipc/utils';

export class VersionService {
  private static compareVersions(v1: string, v2: string): number {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }

    return 0;
  }
  static async checkUpdate(needShow: boolean = true): Promise<Boolean> {
    const appVersion: string = await window.ipcRenderer.invoke(UtilsChannel.APP_VERSION);
    const response = await VersionApi.getVersion(appVersion);
    console.log(response, appVersion);
    if (response.code !== 0 || !response.data) {
      return false;
    }
   
    if (this.compareVersions(response.data.version, appVersion) > 0) {
      if (response.data.force_update || needShow) {
        console.log('show-update', response.data)
        window.ipcRenderer.send(UtilsChannel.SHOW_UPDATE, response.data);
      }
      return true;
    } else {
      return false;
    }
  }
}
