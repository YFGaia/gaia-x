import { requestDify, requestDifyByMain } from '@/api/request';

interface DifyResponse<T> {
  data?: T;
  error?: string;
}

export interface AppTemplate {
  user_input_form: any;
}

export interface InstalledApp {
  id: string;
  app: {
    mode: string;
    [key: string]: any;
  };
}

export interface InstalledAppsResponse {
  installed_apps: InstalledApp[];
}

/**
 * 获取 Dify 单个应用模板
 */
export const getAppTemplate = async (appId: string): Promise<DifyResponse<AppTemplate>> => {
  try {
    const data = await requestDifyByMain.get(`/console/api/installed-apps/${appId}/parameters`);
    if (data.error) {
      return { error: data.error };
    }
    return { data: { user_input_form: data.user_input_form } };
  } catch (err) {
    console.error('Failed to get app template:', err);
    return { error: '请求预设模板失败' };
  }
};

/**
 * 获取已安装的应用列表
 */
export const getInstalledApps = async (): Promise<DifyResponse<InstalledAppsResponse>> => {
  try {
    const data = await requestDifyByMain.get(`/console/api/installed-apps`);
    if (data.error) {
      return { error: data.error };
    }
    return { data: { installed_apps: data.installed_apps } };
  } catch (err) {
    console.error('Failed to get installed apps:', err);
    return { error: '获取已安装应用列表失败' };
  }
}; 