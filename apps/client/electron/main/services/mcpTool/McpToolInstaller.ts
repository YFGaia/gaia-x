import { app } from 'electron';
import fs from 'fs-extra';
import path from 'path';
import { PlatformRuntime } from '~/main/services/runtime/platformRuntime';
import { getRuntime } from '../runtime';

interface McpToolStdioConfig {
  transport: 'stdio';
  command: string;
  args: string[];
  type?: string;
}

interface McpToolSSEConfig {
  transport: 'sse';
  url: string;
  type?: string;
}

type McpToolConfig = McpToolStdioConfig | McpToolSSEConfig;

interface MCP_CONFIG {
  mcpServers: Record<string, McpToolConfig>;
}

/**
 * MCP工具安装管理类
 * 负责安装、配置和管理MCP工具
 */
export class McpToolInstaller {
  private runtime: PlatformRuntime;
  private configPath: string;
  public envDir: string;

  constructor() {

    const tempRuntime = getRuntime();

    if (!tempRuntime) {
      throw new Error('无法获取运行时环境');
    }

    this.runtime = tempRuntime;


    // 配置文件路径
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'extensions', 'mcp_servers.config.json');
    // MCP环境目录
    this.envDir = path.join(userDataPath, 'extensions');

    console.log(`McpToolInstaller初始化完成`);
  }

  /**
   * 安装MCP工具
   * @param packageName 工具包名或安装命令
   * @param serverId 服务ID
   */
  public async installTool(packageName: string, serverId: string): Promise<boolean> {
    try {
      console.log(`开始安装MCP工具: ${packageName}, MCP名称: ${serverId}`);

      // 验证服务ID
      if (!serverId || !serverId.trim()) {
        throw new Error('MCP名称不能为空');
      }

      // 解析命令和参数
      const { command, args } = this.parseInstallCommand(packageName);

      // 使用提供的服务ID
      const finalServerId = serverId.trim();
      console.log(`使用服务ID: ${finalServerId}`);

      let success = false;

      // 根据命令类型选择不同的安装方案
      switch (command) {
        case 'npx':
          // 对于npx命令，直接更新配置而不执行安装
          console.log(`检测到npx命令，直接更新配置而不执行安装`);
          success = true;
          break;

        case 'sse':
          // 对于SSE命令，直接更新配置而不执行安装
          console.log(`检测到SSE命令，直接更新配置而不执行安装`);
          success = true;
          break;

        case 'uvx':
          // 创建隔离环境
          await this.runtime.createMcpVirtualEnv(serverId);
          success = true;
          break;

        default:
          // 默认使用uvx配置
          console.log(`使用默认命令类型(uvx)，直接更新配置而不执行安装`);
          success = true;
          break;
      }

      if (!success) {
        throw new Error(`安装MCP工具失败: ${packageName}`);
      }

      // 更新配置
      await this.updateConfig(serverId, finalServerId, command, args);

      console.log(`MCP工具 ${packageName} 安装完成，服务ID: ${finalServerId}`);
      return true;
    } catch (error) {
      console.error(`安装MCP工具失败: ${packageName}`, error);
      return false;
    }
  }

  /**
   * 解析安装命令
   * 将命令字符串解析为命令类型、参数和包ID
   */
  private parseInstallCommand(commandStr: string): {
    command: string;
    args: string[];
    packageId: string;
  } {
    // 分割命令字符串
    const parts = commandStr.trim().split(/\s+/);

    // 检查是否是特定命令
    if (parts[0] === 'npx' || parts[0] === 'uvx') {
      const command = parts[0];
      const args = parts.slice(1);
      const packageId = this.extractPackageId(command, args);
      return { command, args, packageId };
    }

    // 检查是否是URL格式（SSE命令）
    const urlPattern = /^(https?|wss?):\/\/.+/;
    if (urlPattern.test(parts[0])) {
      console.log(`检测到SSE URL: ${parts[0]}`);
      const command = 'sse';
      const args = [parts[0], ...parts.slice(1)];
      // 从URL中提取域名作为packageId
      let packageId = 'sse-default';
      try {
        const url = new URL(parts[0]);
        packageId = `sse-${url.hostname}`;
      } catch (e) {
        console.warn(`无法解析URL: ${parts[0]}`, e);
      }

      return { command, args, packageId };
    }

    // 检查是否是旧格式的SSE命令
    if (parts[0].startsWith('sse-') || parts[0] === 'sse') {
      const command = 'sse';
      const args = parts[0] === 'sse' ? parts.slice(1) : [parts[0].substring(4), ...parts.slice(1)];
      const packageId = args[0] || 'sse-default';

      return { command, args, packageId };
    }

    // 如果不是特定命令，则视为包名
    return {
      command: 'default',
      args: [commandStr],
      packageId: commandStr,
    };
  }

  /**
   * 从命令参数中提取包ID
   */
  private extractPackageId(command: string, args: string[]): string {
    // 提取主要包名，忽略参数和选项
    const packageArg = args.find((arg) => !arg.startsWith('-'));

    if (!packageArg) {
      return args.join('_').replace(/[^\w-]/g, '_');
    }

    // 处理特殊情况
    if (command === 'npx' && packageArg.includes('@')) {
      // 处理npm包的作用域和版本
      const parts = packageArg.split('@');
      if (parts[0].startsWith('@')) {
        // 作用域包，如@scope/package@version
        return `${parts[0]}/${parts[1]}`.replace(/[^\w/-]/g, '_');
      }
      // 普通包带版本，如package@version
      return parts[0];
    }

    return packageArg;
  }

  /**
   * 更新配置文件
   */
  private async updateConfig(
    packageName: string,
    serverId: string,
    commandType: string = 'default',
    args: string[] = []
  ): Promise<void> {
    try {
      // 读取现有配置
      let config: MCP_CONFIG = { mcpServers: {} };

      if (await fs.pathExists(this.configPath)) {
        try {
          const content = await fs.readFile(this.configPath, 'utf-8');
          config = JSON.parse(content);

          if (!config.mcpServers) {
            config.mcpServers = {};
          }
        } catch (error) {
          console.warn('读取配置文件失败，将创建新配置', error);
        }
      }

      // 处理参数，移除--verbose选项（如果有），因为它是npx的选项而不是命令的选项
      const hasVerbose = args.includes('--verbose');
      const filteredArgs = hasVerbose ? args.filter((arg) => arg !== '--verbose') : args;

      console.log(`原始参数: ${args.join(' ')}`);
      console.log(`处理后参数: ${filteredArgs.join(' ')}`);
      console.log(`详细模式: ${hasVerbose ? '开启' : '关闭'}`);

      // 根据命令类型生成配置
      let toolCommand: string;
      let toolArgs: string[] = [];

      switch (commandType) {
        case 'npx':
          console.log(`配置npx命令: ${args}`);
          toolCommand = 'npx';
          toolArgs = filteredArgs;
          break;

        case 'sse':
          // 对于SSE命令，配置为sse服务
          console.log(`配置SSE命令，使用sse服务`);

          // 检查第一个参数是否是URL
          const urlPattern = /^(https?|wss?):\/\/.+/;
          if (filteredArgs.length > 0 && urlPattern.test(filteredArgs[0])) {
            console.log(`检测到SSE URL: ${filteredArgs[0]}`);

            // 添加新工具配置，使用SSE传输类型
            config.mcpServers[serverId] = {
              transport: 'sse' as const,
              url: filteredArgs[0],
            };

            console.log(`更新SSE配置: serverId=${serverId}, url=${filteredArgs[0]}`);

            // 保存配置
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
            console.log(`更新配置文件成功: ${this.configPath}`);
            return;
          } else {
            console.warn(`SSE命令缺少有效的URL参数: ${filteredArgs.join(' ')}`);
            // 使用sse命令
            toolCommand = 'sse';
            toolArgs = filteredArgs;

            console.log(`配置SSE命令: ${toolCommand} ${toolArgs.join(' ')}`);
          }
          break;

        case 'uvx':
          toolCommand = 'uvx';
          toolArgs = filteredArgs;
          break;

        default:
          toolCommand = 'uvx';
          toolArgs = [packageName];
          break;
      }

      // 添加新工具配置
      config.mcpServers[serverId] = {
        type: 'normal',
        transport: 'stdio' as const,
        command: toolCommand,
        args: toolArgs,
      };

      console.log(
        `更新配置: serverId=${serverId}, command=${toolCommand}, args=${toolArgs.join(' ')}`
      );

      // 保存配置
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`更新配置文件成功: ${this.configPath}`);
    } catch (error) {
      console.error('更新配置文件失败', error);
      throw error;
    }
  }

  /**
   * 解析uvx命令
   * 将"uvx mcp-server-xxx"解析为适合隔离环境的命令和参数
   */
  public parseUvxCommand(
    serverId: string,
    command: string
  ): {
    command: string;
    args: string[];
    envName: string;
  } {
    // 提取包名
    const parts = command.split(' ');
    const packageName = parts[1];
    const args = parts.slice(2);

    // 返回解析结果
    return {
      command: 'uvx',
      args: [packageName, ...args],
      envName: packageName,
    };
  }

  /**
   * 获取隔离环境路径
   */
  public getIsolatedEnvPath(envName: string): string {
    return this.runtime.getIsolatedEnvPath(envName);
  }

  getVenvPythonPath(serverId: string): string {
    return this.runtime.getVenvPythonPath(serverId);
  }
}
