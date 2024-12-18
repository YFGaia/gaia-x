import { toolList } from '@/tools/toolsManager';
import { MCPToolChannel } from '@/types/ipc/mcpTool';
import { McpServerConfig } from '@/types/mcpServerConfig';
import { mcpToolSchedule } from '@/types/schedule';
import { create } from 'zustand';
import { useScheduleStore } from './ScheduleStore';
import { message } from 'antd';
import { McpServer } from '@/types/xKey/types';
import { SettingFilled } from '@ant-design/icons';

interface MCPServer {
  error: Error | null;
  tools: any[];
  config: McpServerConfig;
}

export interface McpFunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: {
        [key: string]: Record<string, any>;
        serverId: {
          type: 'string';
          description: 'MCP server ID';
          default: string;
        };
      };
      required: string[];
    };
  };
}

interface McpToolStore {
  servers: Map<string, MCPServer>;
  getServer: (serverId: string) => MCPServer | null;
  workingDir: string;
  tools: McpFunctionTool[];
  installTool: (packageName: string, serverId: string) => Promise<boolean>;
  getTools: (servers: McpServer[]) => McpFunctionTool[];
  getAllTools: () => McpFunctionTool[];
}

export const useMcpToolStore = create<
  McpToolStore & {
    initialize: () => Promise<void>;
  }
>((_, get) => ({
  servers: new Map(),
  workingDir: '',
  initialize: async () => {
    // 清空现有数据
    get().servers.clear();
    get().tools = [];
    
    const servers = await window.ipcRenderer.invoke(MCPToolChannel.MCP_LIST_SERVERS);
    console.log('获取到的服务器', servers);
    get().workingDir = await window.ipcRenderer.invoke(MCPToolChannel.MCP_GET_WORKING_DIR);
    
    // 创建一个新的Map实例，确保引用变化
    const newServers = new Map();
    
    // 创建一个Promise数组，用于等待所有工具加载完成
    const toolLoadPromises = [];

    // 初始化运行时环境
    useScheduleStore.getState().addSchedule({
      id: 'initialize-runtimes',
      code: 'initialize-runtimes',
      name: '初始化运行环境',
      description: '初始化运行环境',
      icon: SettingFilled,
    });

    await window.ipcRenderer.invoke(MCPToolChannel.MCP_INITIALIZE_RUNTIMES);
    
    useScheduleStore.getState().removeSchedule('initialize-runtimes');

    // 先一次性设置空的服务器列表，确保UI可以立即更新
    for (const server of servers) {
      const config = await window.ipcRenderer.invoke(MCPToolChannel.MCP_GET_SERVER_CONFIG, server);
      newServers.set(server, { error: null, tools: [], config });
    }
    
    // 先设置基本信息，让UI可以快速显示
    get().servers = new Map(newServers);

    // 然后异步加载每个服务器的工具
    for (const server of servers) {
      useScheduleStore.getState().addSchedule({
        ...mcpToolSchedule,
        id: server,
      });
      
      // 创建一个Promise，用于等待当前服务器的工具加载完成
      const toolLoadPromise = toolList({ serverId: server })
        .then((tools) => {
          console.log('获取到的工具', server, tools);
          
          // 创建一个全新的Map实例，确保引用变化触发UI更新
          const updatedServers = new Map(get().servers);
          const config = updatedServers.get(server)?.config || newServers.get(server)?.config;
          updatedServers.set(server, { error: null, tools: tools.result, config });
          
          // 直接更新状态
          get().servers = updatedServers;
          
          // 更新工具列表
          const existingTools = [...get().tools];
          const newTools = [...existingTools];
          for (const tool of tools.result) {
            // 检查工具是否已存在，避免重复添加
            const exists = existingTools.some(t => 
              t.function.name === tool.name && 
              t.function.parameters.properties.serverId.default === server
            );
            
            if (!exists) {
              newTools.push({
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: {
                    type: tool.inputSchema.type,
                    properties: {
                      ...tool.inputSchema.properties,
                      serverId: {
                        type: 'string',
                        description: 'MCP server ID',
                        default: server,
                      },
                    },
                    required: [...(tool.inputSchema.required || [])],
                  },
                },
              });
            }
          }
          get().tools = newTools;
          
          useScheduleStore.getState().removeSchedule(server);
        })
        .catch((error) => {
          console.error('获取工具失败', error);
          // 错误处理时也创建新的Map实例
          const updatedServers = new Map(get().servers);
          const config = updatedServers.get(server)?.config || newServers.get(server)?.config;
          updatedServers.set(server, { error, tools: [], config });
          get().servers = updatedServers;
        });
      
      // 将Promise添加到数组中
      toolLoadPromises.push(toolLoadPromise);
    }
    
    // 等待所有工具加载完成
    await Promise.all(toolLoadPromises);
    console.log('所有MCP工具加载完成');
  },
  getServer: (serverId: string) => {
    return get().servers.get(serverId) || null;
  },
  tools: [],
  installTool: async (packageName: string, serverId: string) => {
    try {
      message.loading({ content: `正在安装 ${packageName}...`, key: 'install-tool' });

      // 验证参数
      if (!packageName || !packageName.trim()) {
        throw new Error('安装命令不能为空');
      }
      
      if (!serverId || !serverId.trim()) {
        throw new Error('MCP名称不能为空');
      }

      const success = await window.ipcRenderer.invoke(
        MCPToolChannel.MCP_INSTALL_TOOL,
        packageName,
        serverId
      );

      if (success) {
        message.success({ content: `安装 ${packageName} 成功!`, key: 'install-tool' });
        
        // 先立即更新UI，显示新服务器（但没有工具）
        if (!get().servers.has(serverId)) {
          // 如果是新服务器，先创建一个空壳
          const config = await window.ipcRenderer.invoke(
            MCPToolChannel.MCP_GET_SERVER_CONFIG, 
            serverId
          );
          
          // 创建新的Map实例以确保状态更新
          const updatedServers = new Map(get().servers);
          updatedServers.set(serverId, { error: null, tools: [], config });
          get().servers = updatedServers;
        }
        
        // 然后重新初始化以获取完整信息
        await get().initialize();
      } else {
        message.error({ content: `安装 ${packageName} 失败!`, key: 'install-tool' });
      }

      return success;
    } catch (error: any) {
      console.error('安装MCP工具失败:', error);
      message.error({ content: `安装失败: ${error.message}`, key: 'install-tool' });
      return false;
    }
  },
  getTools: (servers: McpServer[]) => {
    const tools = [];
    for (const server of servers) {
      const funNames: string[] = [];
      for (const tool of server.tools) {
        funNames.push(tool.name);
      }
      tools.push(...get().tools.filter((tempTool) => funNames.includes(tempTool.function.name)));
    }
    return tools;
  },
  getAllTools: () => {
    return get().tools;
  },
}));
