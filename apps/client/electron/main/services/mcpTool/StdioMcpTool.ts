import { McpRequestParams } from '@/types/ipc/mcpTool';
import { McpClient } from '@/types/mcpTool';
import { Client } from '@modelcontextprotocol/sdk/client/index';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import {
  CompatibilityCallToolResultSchema,
  ListToolsResultSchema,
  Notification,
  Result,
} from '@modelcontextprotocol/sdk/types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export class StdioMcpTool implements McpClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor(transport: StdioClientTransport) {
    this.client = new Client<Request, Notification, Result>(
      {
        name: 'gaia-x-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          sampling: {},
          roots: {
            listChanged: true,
          },
        },
      }
    );
    this.transport = transport;
  }

  async getServerTools() {
    const tools = await this.makeRequest('tools/list', {}, ListToolsResultSchema, {
      timeout: import.meta.env.VITE_MCP_TOOL_TIMEOUT,
    });
    return tools;
  }

  async methods(
    method: string,
    params: McpRequestParams,
    schema: z.ZodTypeAny,
    options?: Record<string, any>
  ) {
    return await this.makeRequest(method, params, schema, options ?? {});
  }

  async callTool(params: McpRequestParams) {
    const result = await this.makeRequest('tools/call', params, CompatibilityCallToolResultSchema, {
      timeout: import.meta.env.VITE_MCP_TOOL_TIMEOUT,
    });
    return result;
  }

  private async makeRequest(
    method: string,
    params: McpRequestParams,
    schema: z.ZodTypeAny,
    options: Record<string, any>
  ) {
    await this.client.connect(this.transport);
    try {
      let response;
      try {
        response = await this.client.request(
          {
            method: method,
            params: {
              ...params,
              _meta: {
                progressToken: params._meta?.progressToken || nanoid(),
              },
            },
          },
          schema,
          options
        );
      } catch (error) {
        console.log('request history', method, params, error);
        throw error;
      } finally {
        await this.close();
      }

      return response;
    } catch (e: unknown) {
      const errorString = (e as Error).message ?? String(e);
      console.error(errorString);

      throw e;
    }
  }

  /**
   * 关闭连接和transport
   */
  public async close() {
    try {
      // 关闭 client 连接
      if (this.client) {
        await this.client.close();
      }
      // 关闭 transport
      if (this.transport) {
        await this.transport.close();
      }
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }
}
