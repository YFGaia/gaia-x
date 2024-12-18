import { useMcpToolStore } from '@/stores/McpToolStore';
import { ToolCallParams, ToolCallResult, ToolListParams, ToolListResult } from '@/types/core/tool';
import { MCPToolChannel } from '@/types/ipc/mcpTool';
import { McpClientFactory } from './McpClient';

type RequestType = 'tools/call' | 'tools/list' | any;

async function makeRequest(serverId: string, type: RequestType, params?: any) {
  const { getServer } = useMcpToolStore.getState();
  const serverConfig = getServer(serverId)?.config;
  if (!serverConfig) {
    throw new Error(`No server config found for server ${serverId}`);
  }
  const client = McpClientFactory.createClient(serverConfig);
  if (type === 'tools/call') {
    return await client.callTool(params);
  } else if (type === 'tools/list') {
    return await client.getServerTools();
  }
  throw new Error(`Invalid request type: ${type}`);
}

export async function getAvailableServers(): Promise<string[]> {
  console.log('开始获取服务器列表');
  const servers = await window.ipcRenderer.invoke(MCPToolChannel.MCP_LIST_SERVERS);
  console.log('[toolsManager] Available servers:', servers);
  return servers;
}

export const toolCall = async (params: ToolCallParams): Promise<ToolCallResult> => {
  try {
    console.log('[toolsManager] Received tools/call:', params);
    const result = await makeRequest(params.serverId, 'tools/call', params);
    console.log('[toolsManager] tools/call result:', result);

    return {
      type: 'success',
      result: typeof result === 'string' ? result : JSON.stringify(result),
      _meta: params._meta,
    };
  } catch (error) {
    console.error('[toolsManager] tools/call error:', error);
    return {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      _meta: params._meta,
    };
  }
};

export const toolList = async (params: ToolListParams): Promise<ToolListResult> => {
  console.log(`[toolsManager] Getting tools for server ${params.serverId}...`);
  const tools = await makeRequest(params.serverId, 'tools/list');
  return {
    type: 'success',
    result: tools.tools,
  };
};
