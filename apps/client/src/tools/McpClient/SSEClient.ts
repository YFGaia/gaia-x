import { McpRequestParams } from '@/types/ipc/mcpTool';
import { McpSSEConfig } from '@/types/mcpServerConfig';
import { McpClient } from '@/types/mcpTool';
import { Client } from '@modelcontextprotocol/sdk/client/index';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';
import {
  CompatibilityCallToolResultSchema,
  ListToolsResultSchema,
  Notification,
  Result,
} from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';
import { nanoid } from 'nanoid';

export class SSEClient implements McpClient {
  private config: McpSSEConfig;
  private client: Client;
  private transport: SSEClientTransport;

  constructor(config: McpSSEConfig) {
    this.config = config;
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
    this.transport = new SSEClientTransport(new URL(this.config.url));
  }

  async getServerTools() {
    const tools = await this.makeRequest('tools/list', {}, ListToolsResultSchema, {
      timeout: import.meta.env.VITE_MCP_TOOL_TIMEOUT,
    });
    return tools;
  }

  async callTool(params: McpRequestParams) {
    const result = await this.makeRequest('tools/call', params, CompatibilityCallToolResultSchema, {
      timeout: import.meta.env.VITE_MCP_TOOL_TIMEOUT,
    });
    return result;
  }

  async methods(
    method: string,
    params: McpRequestParams,
    schema: z.ZodTypeAny,
    options?: Record<string, any>
  ) {
    return await this.makeRequest(method, params, schema, options ?? {});
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

  private async close() {
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
