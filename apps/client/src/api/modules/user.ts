import request from "../request";
import { ApiResponse } from "../types";

export interface Authority {
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  authorityId: number;
  authorityName: string;
  parentId: number;
  dataAuthorityId: number | null;
  children: any | null;
  menus: any | null;
  defaultRouter: string;
}

export interface UserInfo {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  uuid: string;
  userName: string;
  nickName: string;
  headerImg: string;
  authorityId: number;
  authority: Authority;
  authorities: Authority[];
  phone: string;
  email: string;
  enable: number;
  originSetting: any | null;
}

export interface UserInfoResponse {
  userInfo: UserInfo;
}

export const UserApi = {
  getUserInfo: async (token: string): Promise<ApiResponse<UserInfoResponse>> => {
    return request.get('/user/getUserInfo', {
      headers: {
        'x-token': `${token}`,
      },
    });
  },
  uploadInfo: async (data: any): Promise<ApiResponse<void>> => {
    return request.post('/gaia-x/v1/usage-report/createUsageReport', {
      report_data: JSON.stringify(data),
    });
  }
};
