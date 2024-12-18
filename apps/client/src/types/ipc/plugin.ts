export enum PluginChannel {
  PLUGIN_RUN = "plugin:run", // 运行插件
  INSTALL_PLUGIN = "plugin:install", // 安装插件
  UNINSTALL_PLUGIN = "plugin:uninstall", // 卸载插件
  GET_PLUGIN_SCHEMA = "plugin:getSchema", // 获取插件配置
}

export interface PluginRequest {
  "plugin:run": {
    plugin: string; // 要运行的插件名称
    args: any[]; // 插件的参数列表
  };
  "plugin:install": {
    pluginId: string; // 要安装的插件名称
    downloadUrl: string; // 要下载的插件地址
  };
  "plugin:uninstall": {
    plugin: string; // 要卸载的插件名称
  };
}

export interface PluginResponse {
  "plugin:run": any; // 插件执行的返回结果
  "plugin:install": void; // 安装插件是否成功
  "plugin:uninstall": void; // 卸载插件是否成功
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  autoUpdate: boolean;
  detail: string;
  changelog: string;
  installed: boolean;
  icon?: string;
  permissions?: string[];
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  autoUpdate: boolean;
  detail: string;
  changelog: string;
  downloadUrl: string;
  icon?: string;
}
