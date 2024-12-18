
export type McpTransportType = 'stdio' | 'sse';

export interface McpBaseConfig {
  transport: McpTransportType;
}

export interface McpStdioConfig extends McpBaseConfig {
  transport: 'stdio';
  command: string;
  args: string[];
}

export interface McpSSEConfig extends McpBaseConfig {
  transport: 'sse';
  url: string;
}

export type McpServerConfig = McpStdioConfig | McpSSEConfig;

export interface McpServersConfig {
  mcpServers: Record<string, McpServerConfig>;
}

