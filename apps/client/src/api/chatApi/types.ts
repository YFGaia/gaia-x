import { McpFunctionTool } from "@/stores/McpToolStore";
import { Message, ThoughtChainItemExpand } from "@/types/chat"
import { Preset, StreamDelta } from "@/types/xKey/types"

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_call_id?:  string
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface ChatOptions {
  messages?: Message[]
  query?: string
  preset: Preset
  tools?: McpFunctionTool[]
  variables?: Record<string, string|number>  // Dify Chat 输入变量
  apiKey?: string
  onUpdate?: (index: number, text: string, delta: StreamDelta) => void
  onFinish?: (index: number, text: string) => void
  onError?: (index: number, error: Error) => void
  onController?: (controller: AbortController) => void
}

export interface ChatPayload {
  messages: ChatMessage[]
  stream?: boolean
  model?: string
  temperature?: number
  max_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
  top_p?: number
  tools?: McpFunctionTool[]
  tool_choice?: 'auto' | 'none' | 'required'
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ChatToolOptions {
  onToolStart?: (name: string, args: any, messageItemId?: string) => ThoughtChainItemExpand | undefined;
  onToolEnd?: (thought: ThoughtChainItemExpand, args: any, result: any, messageItemId?: string, error?: Error) => ThoughtChainItemExpand | undefined;
}

export abstract class ChatAPI {
  abstract chat(options: ChatOptions): Promise<void>
  abstract abort(): void
}
