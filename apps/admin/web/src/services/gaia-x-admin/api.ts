// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 登录接口 POST /api/base/login */
export async function login(params: {
  username: string;
  password: string;
  captcha?: string;
  captchaId?: string;
}) {
  return request<API.LoginResult>('/api/base/login', {
    method: 'POST',
    data: params,
  });
}

/** 获取验证码 POST /api/base/captcha */
export async function getCaptcha() {
  return request<{
    code: number;
    data: API.CaptchaResult;
    msg: string;
  }>('/api/base/captcha', {
    method: 'POST',
  });
}
/**
 * 用户相关接口
 */

/** 用户注册 POST /api/user/admin_register */
export async function register(data: {
  username: string;
  password: string;
  nickName?: string;
  headerImg?: string;
  authorityId?: string;
  authorityIds?: string[];
  enable?: number;
  phone?: string;
  email?: string;
}) {
  return request('/api/user/admin_register', {
    method: 'POST',
    data,
  });
}

/** 修改密码 POST /api/user/changePassword */
export async function changePassword(data: { password: string; newPassword: string }) {
  return request('/api/user/changePassword', {
    method: 'POST',
    data,
  });
}

/** 获取用户列表 POST /api/user/getUserList */
export async function getUserList(data: { page: number; pageSize: number }) {
  return request('/api/user/getUserList', {
    method: 'POST',
    data,
  });
}

/** 设置用户权限 POST /api/user/setUserAuthority */
export async function setUserAuthority(data: { uuid: string; authorityId: string }) {
  return request('/api/user/setUserAuthority', {
    method: 'POST',
    data,
  });
}

/** 删除用户 DELETE /api/user/deleteUser */
export async function deleteUser(data: { id: number }) {
  return request('/api/user/deleteUser', {
    method: 'DELETE',
    data,
  });
}

/** 设置用户信息 PUT /api/user/setUserInfo */
export async function setUserInfo(data: {
  id: number;
  nickName?: string;
  headerImg?: string;
  phone?: string;
  email?: string;
  enable?: number;
  authorityIds?: string[];
}) {
  return request('/api/user/setUserInfo', {
    method: 'PUT',
    data,
  });
}

/** 设置自身信息 PUT /api/user/setSelfInfo */
export async function setSelfInfo(data: {
  id: number;
  nickName?: string;
  headerImg?: string;
  phone?: string;
  email?: string;
  enable?: number;
}) {
  return request('/api/user/setSelfInfo', {
    method: 'PUT',
    data,
  });
}

/** 设置自身界面配置 PUT /api/user/setSelfSetting */
export async function setSelfSetting(data: Record<string, any>) {
  return request('/api/user/setSelfSetting', {
    method: 'PUT',
    data,
  });
}

/** 设置用户权限 POST /api/user/setUserAuthorities */
export async function setUserAuthorities(data: { ID: number; authorityIds: string[] }) {
  return request('/api/user/setUserAuthorities', {
    method: 'POST',
    data,
  });
}

/** 获取用户信息 GET /api/user/getUserInfo */
export async function getUserInfo() {
  return request('/api/user/getUserInfo', {
    method: 'GET',
  });
}

/** 重置用户密码 POST /api/user/resetPassword */
export async function resetPassword(data: { id: number }) {
  return request('/api/user/resetPassword', {
    method: 'POST',
    data,
  });
}
