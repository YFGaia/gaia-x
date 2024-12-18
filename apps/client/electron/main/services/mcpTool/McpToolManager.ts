import type { McpServerConfig, McpServersConfig } from '@/types/mcpServerConfig';
import { app } from 'electron';
import path from 'path';
import { ConfigReader } from '~/main/utils/ConfigReader';
import { getOriginalEnv } from '../../index';
import { getRuntime } from '../runtime';
import { PlatformRuntime } from '../runtime/platformRuntime';
import { McpToolInstaller } from './McpToolInstaller';

const defaultConfig = {
  mcpServers: {},
};

//TODO 这里临时写死配置位置，后面要修改为自动生成配置
export class McpToolManager {
  private workingDir: string;
  private config: Record<string, McpServerConfig> = {};
  private installer: McpToolInstaller;
  private runtime: PlatformRuntime;

  constructor() {
    // 使用 app.getPath('userData') 作为配置文件存储位置
    this.workingDir = app.getPath('userData');
    this.installer = new McpToolInstaller();
    const tempRuntime = getRuntime();
    if (!tempRuntime) {
      throw new Error('无法获取运行时环境');
    }
    this.runtime = tempRuntime;
  }

  public static async getInstance(): Promise<McpToolManager> {
    const instance = new McpToolManager();
    instance.config = await instance.loadConfig();
    return instance;
  }

  private async loadConfig(): Promise<Record<string, McpServerConfig>> {
    try {
      // 首先尝试从用户数据目录加载配置
      const userConfigPath = this.installer.envDir;
      const reader = new ConfigReader({
        fileName: path.join('extensions', 'mcp_servers.config.json'),
        defaults: defaultConfig,
      });
      const config = (await reader.read()) as McpServersConfig;
      // 读取配置文件
      console.log('成功加载MCP配置:', userConfigPath);
      return config.mcpServers || {};
    } catch (error) {
      console.error('加载MCP配置失败', error);
      return {};
    }
  }

  getWorkingDir() {
    return this.workingDir;
  }

  resolvePath(basePath: string, relativePath: string): string {
    return path.join(basePath, relativePath);
  }

  listServers(): string[] {
    return Object.keys(this.config);
  }

  async getServerConfig(serverId: string): Promise<McpServerConfig> {
    return this.config[serverId];
  }

  /**
   * 解析命令
   * 对于uvx命令，将其转换为在隔离环境中执行的命令
   * 对于npx命令，使用runtime中的npx
   * 对于sse命令，直接使用sse服务
   */
  parseCommand(
    serverId: string,
    command: string,
    args: string[] = []
  ): {
    command: string;
    args: string[];
    env: NodeJS.ProcessEnv;
  } {
    try {
      // 检查是否是uvx命令
      if (command === 'uvx' || (command && command.startsWith('uvx '))) {
        // 获取完整命令
        const fullCommand = command === 'uvx' ? `uvx ${args[0]}` : command;

        // 使用installer解析命令
        const parsed = this.installer.parseUvxCommand(serverId, fullCommand);

        const pythonPath = this.runtime.getVenvPythonPath(serverId);

        const gitPythonPath = this.runtime.getGitPath();
        // 准备执行环境
        const uvxPath = this.runtime.getUvxPath();

        return {
          command: uvxPath,
          args: ['--verbose', ...parsed.args, ...args.slice(command === 'uvx' ? 1 : 0)],
          env: this.runtime.getEnvPath(serverId),
        };
      }

      // 检查是否是npx命令
      if (command === 'npx' || (command && command.startsWith('npx '))) {
        console.log(`解析npx命令: ${command} ${args.join(' ')}`);

        // 获取npx路径
        const npxPath = this.runtime.getNpxPath();
        console.log(`使用runtime中的npx路径: ${npxPath}`);

        return {
          command: npxPath,
          args: command === 'npx' ? args : [...command.split(' ').slice(1), ...args],
          env: getOriginalEnv(),
        };
      }

      // 检查是否是sse命令
      if (command === 'sse' || (command && command.startsWith('sse '))) {
        console.log(`解析sse命令: ${command} ${args.join(' ')}`);

        // 对于sse命令，直接使用sse服务
        return {
          command: 'sse',
          args: command === 'sse' ? args : [...command.split(' ').slice(1), ...args],
          env: getOriginalEnv() as NodeJS.ProcessEnv,
        };
      }

      // 其他命令原样返回
      return {
        command,
        args,
        env: getOriginalEnv() as NodeJS.ProcessEnv,
      };
    } catch (error) {
      console.error(`解析命令失败: ${command}`, error);
      return { command, args, env: getOriginalEnv() as NodeJS.ProcessEnv };
    }
  }

  /**
   * 解析配置中的命令
   * 将逻辑命令名称（如npx）解析为实际可执行文件路径
   */
  resolveCommand(
    command: string,
    args: string[] = []
  ): {
    command: string;
    args: string[];
    env: NodeJS.ProcessEnv;
  } {
    try {
      // 检查是否是npx命令
      if (command === 'npx') {
        console.log(`解析配置中的npx命令`);

        // 获取npx路径
        const npxPath = this.runtime.getNpxPath();
        console.log(`使用runtime中的npx路径: ${npxPath}`);

        // 对于npx命令，使用runtime中的npx
        return {
          command: npxPath,
          args,
          env: getOriginalEnv(),
        };
      }

      // 其他命令原样返回
      return {
        command,
        args,
        env: getOriginalEnv() as NodeJS.ProcessEnv,
      };
    } catch (error) {
      console.error(`解析配置命令失败: ${command}`, error);
      return { command, args, env: getOriginalEnv() as NodeJS.ProcessEnv };
    }
  }

  /**
   * 安装MCP工具
   * @param packageName 工具包名或安装命令
   * @param serverId 服务ID（必填）
   */
  async installTool(packageName: string, serverId: string): Promise<boolean> {
    // 验证参数
    if (!packageName || !packageName.trim()) {
      console.error('安装MCP工具失败: 包名不能为空');
      return false;
    }

    if (!serverId || !serverId.trim()) {
      console.error('安装MCP工具失败: MCP名称不能为空');
      return false;
    }

    console.log(`开始安装MCP工具: ${packageName}, 服务ID: ${serverId}`);
    const success = await this.installer.installTool(packageName, serverId);

    if (success) {
      // 重新加载配置
      this.config = await this.loadConfig();
    }

    return success;
  }
}
