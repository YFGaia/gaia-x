import { request } from '@umijs/max';
import type { GeographicItemType } from './data';
import { getUserInfo } from '@/services/gaia-x-admin/api';

export async function queryCurrent(): Promise<{ data: API.UserInfo }> {
  const response = await getUserInfo();
  return { data: response.data.userInfo };
}

export async function queryProvince(): Promise<{ data: GeographicItemType[] }> {
  return request('/api/geographic/province');
}

export async function queryCity(province: string): Promise<{ data: GeographicItemType[] }> {
  return request(`/api/geographic/city/${province}`);
}

export async function query() {
  return request('/api/users');
}
