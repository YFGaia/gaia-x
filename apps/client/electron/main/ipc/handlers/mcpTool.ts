import { MCPToolChannel, MCPToolRequest } from '@/types/ipc/mcpTool';
import { McpStdioConfig } from '@/types/mcpServerConfig';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { IpcMainInvokeEvent } from 'electron';
import { McpToolManager } from '~/main/services/mcpTool/McpToolManager';
import { StdioMcpTool } from '~/main/services/mcpTool/StdioMcpTool';
import os from 'os';
import { initializeRuntimes as initRuntimes } from '~/main/services/runtime';

export class mcpToolHandler {
  constructor(private mcpManager: McpToolManager) {}

  /**
   * 获取平台特定的命令配置
   * 处理不同平台（Windows、macOS、Linux）的命令差异
   */
  private getPlatformSpecificCommand(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv
  ): { command: string; args: string[]; env: NodeJS.ProcessEnv } {
    // 获取当前操作系统平台
    const platform = os.platform();
    
    console.log(`当前平台: ${platform}, 命令: ${command}`);
    
    // 针对不同平台进行特殊处理
    if (platform === 'darwin') {
      // macOS平台特殊处理
      console.log(`macOS平台特殊处理: ${command}`);
      
      // 对于特定命令的处理
      if (command === 'sse') {
        // 对于sse命令，可能需要特殊处理
        console.log('macOS平台处理sse命令');
        return { command, args, env };
      }
      
      // 对于Python相关命令的处理
      if (command.includes('python') || command.endsWith('.py')) {
        console.log('macOS平台处理Python命令');
        // 确保使用正确的Python路径
        return { command, args, env: { ...env, PYTHONIOENCODING: 'utf-8' } };
      }
      
      // 对于Node.js相关命令的处理
      if (command.includes('node') || command.includes('npm') || command.includes('npx')) {
        console.log('macOS平台处理Node.js命令');
        // 确保使用正确的Node.js环境
        return { command, args, env: { ...env, NODE_OPTIONS: '--no-warnings' } };
      }
      
    } else if (platform === 'win32') {
      // Windows平台特殊处理
      console.log(`Windows平台特殊处理: ${command}`);
      
      // 对于.cmd文件的处理
      if (command.endsWith('.cmd')) {
        console.log('Windows平台处理.cmd文件');
        return {
          command: 'cmd.exe',
          args: ['/c', command, ...args],
          env,
        };
      }
      
      // 对于.bat文件的处理
      if (command.endsWith('.bat')) {
        console.log('Windows平台处理.bat文件');
        return {
          command: 'cmd.exe',
          args: ['/c', command, ...args],
          env,
        };
      }
      
    } else if (platform === 'linux') {
      // Linux平台特殊处理
      console.log(`Linux平台特殊处理: ${command}`);
      
      // 对于shell脚本的处理
      if (command.endsWith('.sh')) {
        console.log('Linux平台处理shell脚本');
        return {
          command: '/bin/bash',
          args: ['-c', `${command} ${args.join(' ')}`],
          env,
        };
      }
    }
    
    // 默认情况下返回原始命令
    return { command, args, env };
  }

  getWorkingDir(_: IpcMainInvokeEvent) {
    return this.mcpManager.getWorkingDir();
  }

  listServers() {
    return this.mcpManager.listServers();
  }

  resolvePath(_: IpcMainInvokeEvent, basePath: string, relativePath: string) {
    const request: MCPToolRequest[MCPToolChannel.MCP_RESOLVE_PATH] = { basePath, relativePath };
    return this.mcpManager.resolvePath(request.basePath, request.relativePath);
  }

  async getServerTools(
    _: IpcMainInvokeEvent,
    request: MCPToolRequest[MCPToolChannel.MCP_GET_STDIO_SERVER_TOOLS]
  ) {
    let transport: StdioClientTransport | null = null;
    let manager: StdioMcpTool | null = null;
    
    try {
      console.log('开始获取服务器工具', request);

      // 使用工具包名或默认标识符
      const toolId = request.args?.[0] || 'default';
      // 解析命令，支持隔离环境
      let resolvedCommand;
      
      // 检查是否是特殊命令类型（如npx）
      if (request.command?.startsWith('npx ') || request.command === 'npx') {
        console.log(`检测到特殊命令类型: npx`);
        console.log(request)
        console.log('request.command', request.command === 'npx' ? (request.args || []) : [...request.command.split(' ').slice(1), ...(request.args || [])]);
        // 使用resolveCommand解析逻辑命令名称
        resolvedCommand = this.mcpManager.resolveCommand(
          'npx',
          request.command === 'npx' ? (request.args || []) : [...request.command.split(' ').slice(1), ...(request.args || [])]
        );
      } else if (request.command?.startsWith('sse ') || request.command === 'sse') {
        console.log(`检测到特殊命令类型: sse`);
        // 对于sse命令，直接使用sse服务
        resolvedCommand = {
          command: 'sse',
          args: request.command === 'sse' ? (request.args || []) : [...request.command.split(' ').slice(1), ...(request.args || [])],
          env: { ...process.env } as NodeJS.ProcessEnv,
        };
      } else {
        // 使用parseCommand解析普通命令
        resolvedCommand = this.mcpManager.parseCommand(
          toolId,
          request.command,
          request.args || []
        );
      }
      
      const { command, args, env } = resolvedCommand;

      console.log('解析命令', command, args, env);

      // 应用平台特定的命令处理
      const platformSpecific = this.getPlatformSpecificCommand(command, args, env);
      const platformCommand = platformSpecific.command;
      const platformArgs = platformSpecific.args;
      const platformEnv = platformSpecific.env;

      console.log('平台特定命令', platformCommand, platformArgs,platformEnv);

      
      // 使用隔离环境创建transport
      transport = new StdioClientTransport({
        command: platformCommand,
        args: platformArgs,
        env: {
          ...platformEnv,
          PYTHONUNBUFFERED: '1',
        },
        stderr: 'pipe',
      });

      // 创建manager并获取工具
      manager = new StdioMcpTool(transport);
      const dd = await manager.getServerTools();
      console.log('获取到的工具', dd);
      return dd;
    } catch (error: any) {
      console.error('创建transport失败', error);
      return {
        type: 'error',
        message: `创建transport失败: ${error.message || error}`,
      };
    } finally {
      // 确保关闭 transport 和 manager
      if (manager) {
        try {
          await manager.close();
        } catch (error) {
          console.error('关闭manager失败:', error);
        }
      }
      if (transport) {
        try {
          await transport.close();
        } catch (error) {
          console.error('关闭transport失败:', error);
        }
      }
    }
  }

  async stdioToolsCall(
    _: IpcMainInvokeEvent,
    request: MCPToolRequest[MCPToolChannel.MCP_STDIO_TOOLS_CALL]
  ) {
    let transport: StdioClientTransport | null = null;
    let manager: StdioMcpTool | null = null;

    try {
      console.log('开始调用工具', request);

      // 获取服务器配置
      const serverConfig = (await this.mcpManager.getServerConfig(
        request.serverId
      )) as McpStdioConfig;

      // 解析命令，支持隔离环境
      let resolvedCommand;
      
      // 检查是否是特殊命令类型（如npx或sse）
      if (serverConfig.command === 'npx' || serverConfig.command === 'sse') {
        console.log(`检测到特殊命令类型: ${serverConfig.command}`);
        // 使用resolveCommand解析逻辑命令名称
        resolvedCommand = this.mcpManager.resolveCommand(
          serverConfig.command,
          [...(serverConfig.args || []), ...(request.args || [])]
        );
      } else {
        // 使用parseCommand解析普通命令
        resolvedCommand = this.mcpManager.parseCommand(
          request.serverId,
          serverConfig.command,
          [...(serverConfig.args || []), ...(request.args || [])]
        );
      }
      
      const { command, args, env } = resolvedCommand;

      console.log(`执行命令: ${command} ${args.join(' ')}`);

      // 应用平台特定的命令处理
      const platformSpecific = this.getPlatformSpecificCommand(command, args, env);
      const platformCommand = platformSpecific.command;
      const platformArgs = platformSpecific.args;
      const platformEnv = platformSpecific.env;

      console.log('平台特定命令', platformCommand, platformArgs);
      
      // 使用隔离环境创建transport
      transport = new StdioClientTransport({
        command: platformCommand,
        args: platformArgs,
        env: {
          ...platformEnv,
          PYTHONUNBUFFERED: '1',
        },
        stderr: 'pipe',
      });

      // 创建manager并调用工具
      manager = new StdioMcpTool(transport);
      return await manager.callTool(request);
    } catch (error: any) {
      console.error('创建transport失败', error);
      return {
        type: 'error',
        message: `创建transport失败: ${error.message || error}`,
      };
    } finally {
      // 确保关闭 transport 和 manager
      if (manager) {
        try {
          await manager.close();
        } catch (error) {
          console.error('关闭manager失败:', error);
        }
      }
      if (transport) {
        try {
          await transport.close();
        } catch (error) {
          console.error('关闭transport失败:', error);
        }
      }
    }
  }

  async getServerConfig(_: IpcMainInvokeEvent, serverId: string) {
    return await this.mcpManager.getServerConfig(serverId);
  }

  /**
   * 安装MCP工具
   * @param _ IPC事件
   * @param packageName 工具包名或安装命令
   * @param serverId 服务ID（必填）
   */
  async installTool(_: IpcMainInvokeEvent, packageName: string, serverId: string) {
    // 验证参数
    if (!packageName || !packageName.trim()) {
      console.error('安装MCP工具失败: 包名不能为空');
      return false;
    }
    
    if (!serverId || !serverId.trim()) {
      console.error('安装MCP工具失败: 服务ID不能为空');
      return false;
    }
    
    console.log(`开始安装MCP工具: ${packageName}, 服务ID: ${serverId}`);
    return await this.mcpManager.installTool(packageName, serverId);
  }

  async initializeRuntimes(_: IpcMainInvokeEvent) {
    return await initRuntimes();
  }
}
