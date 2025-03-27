// @ts-ignore
/* eslint-disable */

declare namespace API {
  type CurrentUser = {
    name?: string;
    avatar?: string;
    userid?: string;
    email?: string;
    signature?: string;
    title?: string;
    group?: string;
    tags?: { key?: string; label?: string }[];
    notifyCount?: number;
    unreadCount?: number;
    country?: string;
    access?: string;
    geographic?: {
      province?: { label?: string; key?: string };
      city?: { label?: string; key?: string };
    };
    address?: string;
    phone?: string;
    username?: string;
    uuid?: string;
    nickName?: string;
    headerImg?: string;
    authorityId?: string;
    authorities?: { authorityId?: string }[];
    enable?: number;
  };

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
    id?: number;
    uuid?: string;
    username?: string;
    nickName?: string;
    headerImg?: string;
    authorityId?: string;
    authorityIds?: string[];
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
