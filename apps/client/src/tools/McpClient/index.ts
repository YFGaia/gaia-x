import { McpServerConfig } from '@/types/mcpServerConfig';
import { StdioClient } from './StdioClient';
import { SSEClient } from './SSEClient';
import { McpClient } from '@/types/mcpTool';

export class McpClientFactory {
  static createClient(config: McpServerConfig): McpClient {
    if (config.transport === 'stdio') {
      return new StdioClient(config);
    } else {
      return new SSEClient(config);
    }
  }
}
