// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  return request<{
    data: API.CurrentUser;
  }>('/api/currentUser', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/login/outLogin', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/login/account */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<API.LoginResult>('/api/login/account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 GET /api/notices */
export async function getNotices(options?: { [key: string]: any }) {
  return request<API.NoticeIconList>('/api/notices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取规则列表 GET /api/rule */
export async function rule(
  params: {
    // query
    /** 当前的页码 */
    current?: number;
    /** 页面的容量 */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.RuleList>('/api/rule', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 更新规则 PUT /api/rule */
export async function updateRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'update',
      ...(options || {}),
    },
  });
}

/** 新建规则 POST /api/rule */
export async function addRule(options?: { [key: string]: any }) {
  return request<API.RuleListItem>('/api/rule', {
    method: 'POST',
    data: {
      method: 'post',
      ...(options || {}),
    },
  });
}

/** 删除规则 DELETE /api/rule */
export async function removeRule(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/rule', {
    method: 'POST',
    data: {
      method: 'delete',
      ...(options || {}),
    },
  });
}

// GVA框架的登录接口
export async function gvaLogin(params: {
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

// GVA框架的验证码接口
export async function getCaptcha() {
  return request<{
    code: number;
    data: {
      captchaId: string;
      picPath: string;
      captchaLength: number;
      openCaptcha: boolean;
    };
    msg: string;
  }>('/api/base/captcha', {
    method: 'POST',
  });
}

// 检查数据库初始化接口
export async function checkDBInit() {
  return request<{
    code: number;
    data: {
      needInit: boolean;
    };
    msg: string;
  }>('/api/init/checkdb', {
    method: 'POST',
  });
}

// 初始化数据库接口
export async function initDatabase(params: {
  dbtype?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  dbname?: string;
  autoCreate?: boolean;
  adminPassword?: string;
  confirmAdminPassword?: string;
}) {
  return request<{
    code: number;
    data: boolean;
    msg: string;
  }>('/api/init/initdb', {
    method: 'POST',
    data: params,
  });
}
