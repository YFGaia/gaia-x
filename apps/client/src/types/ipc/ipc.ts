/**
 * IPC通道枚举
 * 定义了所有可用的进程间通信通道
 */
export enum IpcChannels {
  GET_APP_STATE = "appState:get", // 获取配置项
  SET_APP_STATE = "appState:set", // 设置配置项
  GET_ALL_APP_STATE = "appState:getAll", // 获取所有配置
  GET_SETTING_STATE = "setting:get", // 获取配置项
  SET_SETTING_STATE = "setting:set", // 设置配置项
  GET_ALL_SETTING_STATE = "setting:getAll", // 获取所有配置
  OPEN_FILE = "file:open", // 打开文件
  SAVE_FILE = "file:save", // 保存文件
  RUN_COMMAND = "command:run", // 运行命令
  SET_THEME = "theme:set", // 设置主题
}

/**
 * IPC响应接口
 * 定义了每个IPC通道的返回值类型
 */
export interface IpcResponse {
  "appState:get": any; // 获取配置的返回值
  "appState:set": boolean; // 设置配置是否成功
  "appState:getAll": any; // 获取所有配置
  "setting:get": any; // 获取配置的返回值
  "setting:set": boolean; // 设置配置是否成功
  "setting:getAll": any; // 获取所有配置
  "file:open": string; // 打开文件的内容
  "file:save": boolean; // 保存文件是否成功
  "command:run": any; // 命令执行的返回结果
}

/**
 * IPC请求接口
 * 定义了每个IPC通道的请求参数类型
 */
export interface IpcRequest {
  "appState:get": {
    key: string; // 配置项的键名
  };
  "appState:set": {
    key: string; // 配置项的键名
    value: any; // 要设置的配置值
  };
  "appState:getAll": {}; // 获取所有配置
  "setting:get": {
    key: string; // 配置项的键名
  };
  "setting:set": {
    key: string; // 配置项的键名
    value: any; // 要设置的配置值
  };
  "setting:getAll": {}; // 获取所有配置
  "file:open": {
    path: string; // 要打开的文件路径
  };
  "file:save": {
    path: string; // 要保存的文件路径
    content: string; // 要保存的文件内容
  };
  "command:run": {
    command: string; // 要执行的命令
  };
}
