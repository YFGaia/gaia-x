/**
 * 工具调用结果类型
 */
export interface ToolCallResult {
  type: 'success' | 'error';
  result?: string;
  error?: string;
  _meta?: {
    thoughtId?: string;
  };
}

export interface ToolListResult {
  type: 'success' | 'error';
  result: any[];
  error?: string;
}

/**
 * 工具调用参数类型
 */
export interface ToolCallParams {
  serverId: string;
  name: string;
  arguments: any;
  _meta?: {
    thoughtId?: string;
  };
}

export interface ToolListParams {
  serverId: string;
}

/**
 * 基础工具接口
 */
export interface BaseTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
} 