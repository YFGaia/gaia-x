import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { McpStdioConfig } from '../mcpServerConfig';

export enum MCPToolChannel {
  MCP_GET_WORKING_DIR = 'mcp:get-working-directory',
  MCP_LIST_SERVERS = 'mcp:list-servers',
  MCP_RESOLVE_PATH = 'mcp:resolve-path',
  MCP_GET_STDIO_SERVER_TOOLS = 'mcp:get-stdio-server-tools',
  MCP_STDIO_TOOLS_CALL = 'mcp:stdio-tools-call',
  MCP_STDIO_TOOLS_METHODS = 'mcp:stdio-tools-methods',
  MCP_GET_SERVER_CONFIG = 'mcp:get-server-config',
  MCP_INSTALL_TOOL = 'mcp:install-tool',
  MCP_INITIALIZE_RUNTIMES = 'mcp:initialize-runtimes',
}

export interface MCPToolResponse {
  'mcp:get-working-directory': string;
  'mcp:list-servers': string[];
  'mcp:resolve-path': string;
  'mcp:get-stdio-server-tools': any[];
  'mcp:get-server-config': any;
  'mcp:stdio-tools-call': any;
  'mcp:stdio-tools-methods': any;
  'mcp:install-tool': boolean;
}

export interface MCPToolRequest {
  'mcp:list-servers': {};
  'mcp:resolve-path': {
    basePath: string;
    relativePath: string;
  };
  'mcp:get-stdio-server-tools': McpStdioConfig;
  'mcp:get-server-config': {
    serverId: string;
  };
  'mcp:stdio-tools-call': any;
  'mcp:stdio-tools-methods': any;
  'mcp:install-tool': {
    packageName: string;
    serverId: string;
  };
  'mcp:initialize-runtimes': {};
}

export interface McpRequestParams {
  name?: string;
  arguments?: Record<string, any>;
  _meta?: {
    progressToken: string | number;
  };
  [key: string]: unknown;
}
