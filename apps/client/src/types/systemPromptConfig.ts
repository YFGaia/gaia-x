export interface SystemPromptConfig {
    max_tokens?: number;
    temperature?: number;
    messages: Array<{
      content: string;
      role: 'system' | 'user' | 'assistant';
    }>;
    model?: string;
    stream?: boolean;
  }
  
  export interface SaveSystemPromptResult {
    success: boolean;
    error?: string;
  }