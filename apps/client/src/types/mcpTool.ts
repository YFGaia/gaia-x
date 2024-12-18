import { z } from "zod";
import { McpRequestParams } from "./ipc/mcpTool";

export interface McpClient {
    getServerTools(): Promise<any>;
    callTool(params: McpRequestParams): Promise<any>;
    methods(method: string, params: McpRequestParams, schema: z.ZodTypeAny, options?: Record<string, any>): Promise<any>;
}