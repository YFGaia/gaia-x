// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 检查数据库初始化接口 POST /api/init/checkdb */
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

/** 初始化数据库接口 POST /api/init/initdb */
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
