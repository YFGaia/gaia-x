import { useUserStore } from '@/stores/UserStore';
import { SettingChannel } from '@/types/ipc/xKey';
import { SqliteUserChannel } from '@/types/ipc/sqlite/user';
import axios, { AxiosInstance } from 'axios';
import { WindowService } from '@/services/WindowService';

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = useUserStore.getState().userInfo.token;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 添加 token 等逻辑
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response.status === 401) {
      const id = useUserStore.getState().userInfo.id;
      WindowService.logout(id);
    }
    return Promise.reject(error);
  }
);

export default request;

/** 在渲染进程直接请求接口，然而会遇到问题：Content Security Policy 限制请求 */
const requestDify: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_DIFY_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
requestDify.interceptors.request.use(
  (config) => {
    // 添加 token 等逻辑
    window.ipcRenderer.invoke(SqliteUserChannel.GET_LAST_USER).then((user) => {
      console.log("user", user);
      config.headers['Authorization'] = `Bearer ${user.token}`;
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
requestDify.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export { requestDify };


const DIFY_BASE_URL = import.meta.env.VITE_DIFY_BASE_URL;

/** 在主进程请求的接口，绕开浏览器限制 */
const requestDifyByMain = {
  get: async (url: string, options?: { headers: any }) => {
    const user = await window.ipcRenderer.invoke(SqliteUserChannel.GET_LAST_USER);
    console.log("token", user.token);
    if (!options) {
      options = {
        headers: {} // 初始化 headers
      };
    }
    options.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`
    };
    
    const resp = await window.ipcRenderer.invoke(SettingChannel.DO_REQUEST, DIFY_BASE_URL + url, options);
    console.log("resp", resp);
    return resp;
  },
  post: async (url: string, data: any, options?: { headers: any }) => {
    const user = await window.ipcRenderer.invoke(SqliteUserChannel.GET_LAST_USER);
    console.log("token", user.token);
    if (!options) {
      options = {
        headers: {} // 初始化 headers
      };
    }
    options.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`
    };

    const resp = await window.ipcRenderer.invoke(SettingChannel.DO_REQUEST, DIFY_BASE_URL + url, data, options);
    console.log("resp", resp);
    return resp;
  }
}

export { requestDifyByMain };
