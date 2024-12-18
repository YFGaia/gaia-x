import { ipcMain } from "electron";
import { MCPToolChannel } from "@/types/ipc/mcpTool";
import { mcpToolHandler } from "../../ipc/handlers/mcpTool";
import { McpToolManager } from "../../services/mcpTool/McpToolManager";
export async function setupMcp() {
    const mcpManager = await McpToolManager.getInstance();
    const handler = new mcpToolHandler(mcpManager);
    ipcMain.handle(MCPToolChannel.MCP_GET_WORKING_DIR, handler.getWorkingDir.bind(handler))
    ipcMain.handle(MCPToolChannel.MCP_LIST_SERVERS, handler.listServers.bind(handler))
    ipcMain.handle(MCPToolChannel.MCP_RESOLVE_PATH, handler.resolvePath.bind(handler))
    ipcMain.handle(MCPToolChannel.MCP_GET_STDIO_SERVER_TOOLS, handler.getServerTools.bind(handler))
    ipcMain.handle(MCPToolChannel.MCP_STDIO_TOOLS_CALL, handler.stdioToolsCall.bind(handler))
    ipcMain.handle(MCPToolChannel.MCP_GET_SERVER_CONFIG, handler.getServerConfig.bind(handler))
    ipcMain.handle(MCPToolChannel.MCP_INSTALL_TOOL, handler.installTool.bind(handler))
    ipcMain.handle(MCPToolChannel.MCP_INITIALIZE_RUNTIMES, handler.initializeRuntimes.bind(handler))
}