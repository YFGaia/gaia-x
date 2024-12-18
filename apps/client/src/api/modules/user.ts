import request from "../request";
import { ApiResponse } from "../types";

export interface UserInfo {
  user_id: string;
  username: string;
  name: string;
  email: string;
  jwt_token: string;
}

export const UserApi = {
  getUserInfo: async (code: string): Promise<ApiResponse<UserInfo>> => {
    return request.get('/v1/user/getUserInfo', {
      headers: {
        'Authorization': `${code}`,
      },
    });
  },
  uploadInfo: async (data: any): Promise<ApiResponse<void>> => {
    return request.post('/v1/usage-report/createUsageReport', {
      report_data: JSON.stringify(data),
    });
  }
};
