import { spawn, SpawnOptions } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getOriginalEnv } from '../index';

/**
 * 命令执行选项
 */
export interface ExecuteCommandOptions {
  /** 工作目录 */
  cwd?: string;
  
  /** 自定义环境变量 */
  env?: Record<string, string>;
  
  /** 执行超时(毫秒) */
  timeout?: number;
  
  /** 是否使用shell */
  shell?: boolean;
  
  /** 是否分离子进程 */
  detached?: boolean;
  
  /** Python虚拟环境路径 */
  venvPath?: string;
  
  /** 是否显示输出 */
  silent?: boolean;
  
  /** 输出编码 */
  encoding?: BufferEncoding;
  
  /** 输出前缀 */
  outputPrefix?: string;
  
  /** 错误处理方式 */
  errorHandling?: 'throw' | 'return' | 'ignore';
}

/**
 * 命令执行结果
 */
export interface ExecuteCommandResult {
  /** 标准输出 */
  stdout: string;
  
  /** 标准错误 */
  stderr: string;
  
  /** 退出码 */
  code: number;
  
  /** 执行是否成功 */
  success: boolean;
}

/**
 * 通用跨平台命令执行函数
 * @param command 要执行的命令
 * @param args 命令参数数组
 * @param options 执行选项
 * @returns Promise，解析为命令执行结果
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options: ExecuteCommandOptions = {}
): Promise<ExecuteCommandResult> {
  // 默认选项
  const {
    cwd = process.cwd(),
    timeout = 0,
    shell = true,
    detached = false,
    venvPath = '',
    silent = false,
    encoding = 'utf8',
    outputPrefix = '[CMD]',
    errorHandling = 'throw'
  } = options;

  // 构建环境变量
  const env = buildEnvironment(options.env || {}, venvPath);
  
  // 转换命令路径(适应平台差异)
  const { resolvedCommand, resolvedArgs } = resolveCommand(command, args, venvPath);
  
  if (!silent) {
    console.log(`${outputPrefix} 执行: ${resolvedCommand} ${resolvedArgs.join(' ')}`);
    if (venvPath) console.log(`${outputPrefix} 使用虚拟环境: ${venvPath}`);
  }

  return new Promise<ExecuteCommandResult>((resolve, reject) => {
    // 构建spawn选项
    const spawnOptions: SpawnOptions = {
      cwd,
      env,
      shell,
      detached,
      windowsHide: true
    };

    // 启动进程
    const childProcess = spawn(resolvedCommand, resolvedArgs, spawnOptions);
    
    // 超时处理
    let timeoutId: NodeJS.Timeout | null = null;
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        killProcess(childProcess);
        const error = new Error(`命令执行超时: ${timeout}ms`);
        if (errorHandling === 'throw') {
          reject(error);
        } else {
          resolve({
            stdout: '',
            stderr: error.message,
            code: 124, // UNIX超时退出码
            success: false
          });
        }
      }, timeout);
    }
    
    // 收集输出
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout?.setEncoding(encoding);
    childProcess.stderr?.setEncoding(encoding);
    
    childProcess.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (!silent) console.log(`${outputPrefix} 输出: ${chunk.trim()}`);
    });
    
    childProcess.stderr?.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (!silent) console.error(`${outputPrefix} 错误: ${chunk.trim()}`);
    });
    
    // 处理进程结束
    childProcess.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      const result: ExecuteCommandResult = {
        stdout,
        stderr,
        code: code ?? 0,
        success: code === 0
      };
      
      if (!silent) {
        console.log(`${outputPrefix} 完成: 退出码=${code}`);
      }
      
      if (code !== 0 && errorHandling === 'throw') {
        reject(new Error(`命令执行失败，退出码: ${code}\n${stderr}`));
      } else {
        resolve(result);
      }
    });
    
    // 处理进程错误
    childProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (errorHandling === 'throw') {
        reject(new Error(`启动命令失败: ${error.message}`));
      } else {
        resolve({
          stdout: '',
          stderr: error.message,
          code: 127, // UNIX命令未找到退出码
          success: false
        });
      }
    });
  });
}

/**
 * 构建命令执行环境变量
 */
function buildEnvironment(
  customEnv: Record<string, string>,
  venvPath: string
): NodeJS.ProcessEnv {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isArm64 = process.arch === 'arm64';
  
  // 基础环境变量 - 使用干净的环境变量副本
  const env: NodeJS.ProcessEnv = { 
    ...getOriginalEnv(),  // 使用干净的环境变量副本
    ...customEnv
  };
  
  // 平台特定PATH处理
  if (isWindows) {
    // Windows PATH处理
    const pathSep = ';';
    const extraPaths = [
      // 常用Windows工具路径
      'C:\\Windows\\System32',
      'C:\\Program Files\\Git\\bin'
    ];
    
    env.Path = [...(extraPaths as any), env.Path || env.PATH || ''].join(pathSep);
  } else {
    // Unix PATH处理
    const pathSep = ':';
    const extraPaths = [
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin'
    ];
    
    // MacOS特定路径
    if (isMac) {
      if (isArm64) {
        // M1/M2 Mac
        extraPaths.unshift('/opt/homebrew/bin');
      } else {
        // Intel Mac
        extraPaths.unshift('/usr/local/bin');
      }
    }
    
    env.PATH = [...extraPaths, env.PATH || ''].join(pathSep);
  }
  
  // 虚拟环境处理
  if (venvPath && fs.existsSync(venvPath)) {
    if (isWindows) {
      const binPath = path.join(venvPath, 'Scripts');
      env.Path = `${binPath}${path.delimiter}${env.Path || ''}`;
      // 设置激活变量
      env.VIRTUAL_ENV = venvPath;
    } else {
      const binPath = path.join(venvPath, 'bin');
      env.PATH = `${binPath}${path.delimiter}${env.PATH || ''}`;
      env.VIRTUAL_ENV = venvPath;
      
      // macOS上处理Python路径
      if (isMac) {
        if (isArm64) {
          // M1/M2 Mac上设置库路径
          env.DYLD_LIBRARY_PATH = `/usr/local/lib:/usr/lib:/opt/homebrew/lib:${env.DYLD_LIBRARY_PATH || ''}`;
        }
      }
    }
  }
  
  return env;
}

/**
 * 解析命令和参数（处理平台差异）
 */
function resolveCommand(
  command: string,
  args: string[],
  venvPath: string
): { resolvedCommand: string; resolvedArgs: string[] } {
  const isWindows = process.platform === 'win32';
  let resolvedCommand = command;
  let resolvedArgs = [...args];
  
  // 检查是否是Python相关命令，且提供了虚拟环境
  if (venvPath && 
      (command === 'python' || command === 'python3' || 
       command === 'pip' || command === 'pip3')) {
    
    if (isWindows) {
      // Windows: 使用Scripts目录下的可执行文件
      const scriptExt = '.exe';
      const scriptDir = path.join(venvPath, 'Scripts');
      
      if (command === 'python' || command === 'python3') {
        resolvedCommand = path.join(scriptDir, `python${scriptExt}`);
      } else if (command === 'pip' || command === 'pip3') {
        resolvedCommand = path.join(scriptDir, `pip${scriptExt}`);
      }
    } else {
      // macOS/Linux: 使用bin目录下的可执行文件
      const binDir = path.join(venvPath, 'bin');
      
      if (command === 'python' || command === 'python3') {
        resolvedCommand = path.join(binDir, 'python3');
      } else if (command === 'pip' || command === 'pip3') {
        resolvedCommand = path.join(binDir, 'pip3');
      }
    }
  }
  
  // 处理不带扩展名的Windows可执行文件
  if (isWindows && !resolvedCommand.endsWith('.exe') && 
      !resolvedCommand.includes('\\') && !resolvedCommand.includes('/')) {
    
    // 如果是单个命令名，需要依赖shell解析
    // 这里不修改命令，依赖shell: true来处理
  }
  
  return { resolvedCommand, resolvedArgs };
}

/**
 * 安全终止进程
 */
function killProcess(process: any): void {
  try {
    if (process.platform === 'win32') {
      // Windows需要强制杀死子进程树
      const { execSync } = require('child_process');
      execSync(`taskkill /pid ${process.pid} /T /F`);
    } else {
      // Unix平台使用SIGTERM
      process.kill('SIGTERM');
      
      // 如果进程没有在1秒内终止，发送SIGKILL
      setTimeout(() => {
        try {
          process.kill('SIGKILL');
        } catch (e) {
          // 进程可能已经终止
        }
      }, 1000);
    }
  } catch (error) {
    console.error('终止进程失败:', error);
  }
}

