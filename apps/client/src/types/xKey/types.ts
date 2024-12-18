
export type Provider = "dify" | "openai" | "gaia" | "none"

export type ToolAction = {
  id: string;
  title: string;
  icon: string;
  greeting?: string; // 欢迎语，各种模板通用，可以为空。Dify 的场景下，欢迎语不会实际发送到后端
  systemPrompt?: string;
};

export type McpServer = {
  key: string;
  config: Record<string, any>;
  tools: McpServerTool[]
}

export type McpServerTool = {
  name: string;
  description: string;
  inputSchema: {
    properties: Record<string, any>;
    required: string[];
    type: string;
    title: string;
  }
}

export type FieldName = 'text-input' | 'paragraph' | 'select' | 'number';
export type TextInput = {
  type?: FieldName | undefined;
  variable: string;
  label: string;
  max_length: number;
  required: boolean;
  options?: any[];
  default: string;
};
export type UserInput = {
  [paramType: string]: TextInput;
};
export type UserInputForm = UserInput[];

/** 具体预设配置。传给前端时可以过滤出 ToolAction 部分单独传 */
export type Preset = ToolAction & {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  disabled?: boolean; // Whether this preset is disabled
  // openai specific config
  model?: string;
  temperature?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_p?: number;
  max_tokens?: number;
  // gaia specific config
  model_provider_id?: string;
  /** Dify 输入模板 */
  userInputForm?: UserInputForm;
  /** Dify 输入模板作为划词填充的入口变量名 */
  inputFormEntryVariable?: string;
  /** Dify 应用类型 */
  difyAppType?:
    | 'chat'
    | 'advanced-chat'
    | 'agent'
    | 'agent-chat'
    | 'completion'
    | 'workflow'
    | null;
  /** 工具列表 */
  servers?: McpServer[]
};

/** 应用预设配置 */
export type PresetConfig = {
  toolbarSize: number; // 工具条显示在一级页面的预设数量
  presets: Preset[];
};

export interface ChatMessage {
  content: string;
  role: 'system' | 'user' | 'assistant';
  timestamp?: string;
  reasoning?: string;
}

export type ResponseData = {
  index: number;
  content?: string;
  reasoning_content?: string;
  error?: string;
  done?: boolean;
};

/** 流式响应的每一段消息 */
export type StreamDelta = {
  content?: string;
  reasoning_content?: string;
  isFinish?: boolean;
  tool_calls?: ToolCall[];
};

type ToolCall = {
  index: number;

  /**
   * The ID of the tool call.
   */
  id?: string;

  function?: {
    name: string;
    arguments: string;
  };

  /**
   * The type of the tool. Currently, only `function` is supported.
   */
  type?: 'function';
};
// export type ToolBarAction = {
//   id: string;
//   title: string;
//   provider: Provider;
//   systemPrompt?: string;
//   greeting?: string;
//   model: string;
//   apiBase: string;
//   apiKey: string;
//   icon: string;
// }
