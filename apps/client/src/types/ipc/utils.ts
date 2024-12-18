import { AppVersion } from "@/api";


export enum UtilsChannel {
  APP_VERSION = 'utils:appVersion',
  SHOW_UPDATE = 'utils:showUpdate',
}

export interface VersionResponse {
  'utils:showUpdate': AppVersion;
}
