import { McpRequestParams, MCPToolChannel } from '@/types/ipc/mcpTool';
import { McpStdioConfig } from '@/types/mcpServerConfig';
import { McpClient } from '@/types/mcpTool';
import { z } from 'zod';

/**
 * 标准输入输出客户端，
 * 由于是标准输入输出，所以需要通过 ipcRenderer 与主进程通信
 */
export class StdioClient implements McpClient {
  private config: McpStdioConfig;

  constructor(config: McpStdioConfig) {
    this.config = config;
  }

  async getServerTools() {
    return await window.ipcRenderer.invoke(MCPToolChannel.MCP_GET_STDIO_SERVER_TOOLS, this.config);
  }

  async callTool(params: McpRequestParams) {
    return await window.ipcRenderer.invoke(MCPToolChannel.MCP_STDIO_TOOLS_CALL, params);
  }

  async methods(
    method: string,
    params: McpRequestParams,
    schema: z.ZodTypeAny,
    options?: Record<string, any>
  ) {
    return await window.ipcRenderer.invoke(MCPToolChannel.MCP_STDIO_TOOLS_METHODS, {
      method,
      params,
      schema,
      options,
    });
  }
}
