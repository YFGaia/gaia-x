import request from "../request";
import { ApiResponse } from "../types";

export interface AppVersion {
  version: string;
  release_time: string;
  description: string;
  download_url: string;
  force_update: boolean;
}

export const VersionApi = {
  getVersion: async (version: string): Promise<ApiResponse<AppVersion>> =>
    request.get('/v1/version/getVersionInfo', { params: { version } }),
};
