// @ts-ignore
/* eslint-disable */

declare namespace API {
  type LoginResult = {
    status?: string;
    type?: string;
    currentAuthority?: string;
    code?: number;
    msg?: string;
    data?: {
      user?: CurrentUser;
      token?: string;
      expiresAt?: number;
    };
  };

  type LoginParams = {
    username?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
    captcha?: string;
    captchaId?: string;
  };

  type CaptchaResult = {
    captchaId: string;
    picPath: string;
    captchaLength: number;
    openCaptcha: boolean;
  };

  type ErrorResponse = {
    /** 业务约定的错误码 */
    errorCode: string;
    /** 业务上的错误信息 */
    errorMessage?: string;
    /** 业务上的请求是否成功 */
    success?: boolean;
  };

  type UserInfo = {
    ID?: number;
    uuid?: string;
    userName?: string;
    nickName?: string;
    headerImg?: string;
    authorityId?: number;
    authority?: {
      authorityId: number;
      authorityName: string;
      parentId: number;
      defaultRouter: string;
    };
    authorities?: {
      authorityId: number;
      authorityName: string;
      parentId: number;
      defaultRouter: string;
    }[];
    enable?: number;
    phone?: string;
    email?: string;
  };

  type UserListResult = {
    code: number;
    data: {
      list: UserInfo[];
      total: number;
      page: number;
      pageSize: number;
    };
    msg: string;
  };
}
