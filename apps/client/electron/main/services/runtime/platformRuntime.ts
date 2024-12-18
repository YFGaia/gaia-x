export abstract class PlatformRuntime {
  abstract installRuntime(): Promise<void>;

  abstract downUrl: string;

  abstract getUvxPath(): string;

  abstract getNpxPath(): string;

  abstract getGitPath(): string;

  abstract getEnvPath(serverId: string): NodeJS.ProcessEnv;
  
  // 新增MCP工具相关抽象方法
  abstract installPythonPackage(packageName: string, options?: {
    usePip?: boolean;
    useUvx?: boolean;
    isolatedDir?: string;
    extraArgs?: string[];
  }): Promise<boolean>;
  
  abstract executeCommand(command: string, args: string[], options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    shell?: boolean;
  }): Promise<{stdout: string; stderr: string; exitCode: number}>;
  
  abstract createIsolatedPythonEnv(envName: string, options?: {
    packages?: string[];
    requirements?: string;
  }): Promise<string>;
  
  abstract getIsolatedEnvPath(envName: string): string;

  abstract getVenvPythonPath(envName: string): string;
  
  abstract runInIsolatedEnv(
    envName: string, 
    command: string, 
    args: string[], 
    options?: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
    }
  ): Promise<{stdout: string; stderr: string; exitCode: number}>;

  abstract createMcpVirtualEnv(mcpName: string): Promise<string>;
}


