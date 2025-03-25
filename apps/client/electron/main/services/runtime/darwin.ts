import { app } from 'electron';
import path from 'path';
import { PlatformRuntime } from './platformRuntime';
import fs from 'fs';
import { downloadAndExtract } from '~/main/utils/common';
import { executeCommand } from '~/main/utils/execCommand';
import https from 'https';
import { spawn, SpawnOptions } from 'child_process';
import { getOriginalEnv} from '~/main/index'

/**
 * 目前使用在线下载官方包的方式，后续使用自建包的方式
 */
export class DarwinRuntime extends PlatformRuntime {
  downUrl = '';
  downPythonUrl =
    'https://github.com/indygreg/python-build-standalone/releases/download/20250212/cpython-3.13.2+20250212-aarch64-apple-darwin-install_only.tar.gz';
  downNodeUrl = 'https://nodejs.org/download/release/v22.11.0/node-v22.11.0-darwin-arm64.tar.gz';
  nodeVersion = '22.11.0';

  // 保存原始环境变量
  private originalEnv: NodeJS.ProcessEnv;
  
  constructor() {
    super();
    // 保存原始环境变量，以便在需要时获取
    this.originalEnv = { ...process.env };
  }

  async installRuntime() {
    
    try {
      await Promise.all([
        this.installPythonRuntime(),
        this.installNodeRuntime()
      ]);
      console.log('安装运行时成功');
    } catch (error) {
      console.error('安装运行时失败:', error);
      throw error;
    }
  }

  // 获取Electron内置Node路径
  private getNodePath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'runtime', 'nodejs', 'bin', 'node');
  };

  getUvxPath = () => {
    return path.join(path.dirname(this.getPythonPath()), 'uvx');
  };

  getGitPath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'runtime', 'git', '2.37.3', 'bin', 'git');
  };

  private getPythonPath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'runtime', 'python', 'bin', 'python3');
  };

  getEnvPath = (serverId: string) => {
    const mcpRuntimePath = path.join(app.getPath('userData'), 'runtime');
    const pathsToAdd = [
      path.join(mcpRuntimePath, 'python'),
      path.join(mcpRuntimePath, 'python/bin'),
      path.join(mcpRuntimePath, 'node'),
      path.join(mcpRuntimePath, 'node/bin'),
      path.join(mcpRuntimePath, 'git'),
      path.join(mcpRuntimePath, 'git/bin'),
      path.join(mcpRuntimePath, 'uv'),
      path.join(mcpRuntimePath, 'uv/bin'),
    ];
    return {
      ...getOriginalEnv(),
      PATH: pathsToAdd.join(':') + ':' + getOriginalEnv().PATH,
      UV_PYTHON: this.getVenvPythonPath(serverId),
      GIT_PYTHON_GIT_EXECUTABLE: this.getGitPath(),
      NODE_PATH: path.join(mcpRuntimePath, 'node', 'lib', 'node_modules'),
    };
  };

  /**
   * 获取npx路径
   */
  getNpxPath(): string {
    return path.join(path.dirname(this.getNodePath()), 'npx');
  }

  async installNodeRuntime() {
    const nodePath = path.join(app.getPath('userData'), 'runtime', 'nodejs');
    // 检查是否已下载
    if (fs.existsSync(this.getNodePath())) {
      console.log('Node运行时已安装');
      return;
    }
    // 下载并解压Node
    await downloadAndExtract(this.downNodeUrl, nodePath);
    await executeCommand('chmod', ['+x', `"${this.getNodePath()}"`]);
  }

  async installPythonRuntime() {
    const runtimePath = path.join(app.getPath('userData'), 'runtime');

    // 检查是否已安装
    if (fs.existsSync(this.getPythonPath())) {
      console.log('Python运行时已安装');
      return;
    }

    // 下载并解压Python
    await downloadAndExtract(this.downPythonUrl, runtimePath);
    await executeCommand('chmod', ['+x', `"${this.getPythonPath()}"`]);
    
    // 解压后需要配置Python环境
    await this.setupPythonConfig(path.join(runtimePath, 'python'));
  }
  
  /**
   * 配置Python环境
   */
  private async setupPythonConfig(pythonPath: string): Promise<void> {
    try {
      // 创建site-packages目录
      const sitePackages = path.join(pythonPath, 'lib', 'python3.13', 'site-packages');
      fs.mkdirSync(sitePackages, { recursive: true });
      
      // 创建虚拟环境目录
      const envsDir = path.join(pythonPath, 'envs');
      fs.mkdirSync(envsDir, { recursive: true });
      
      // 安装pip
      await this.installPip(pythonPath);
      
    } catch (error) {
      console.error('配置Python环境失败:', error);
      throw error;
    }
  }
  
  /**
   * 安装pip
   */
  private async installPip(pythonPath: string): Promise<void> {
    try {
      // 下载get-pip.py
      const getPipUrl = 'https://bootstrap.pypa.io/get-pip.py';
      const getPipPath = path.join(pythonPath, 'get-pip.py');
      
      console.log('开始下载pip安装脚本...');
      
      // 下载get-pip.py (添加进度显示)
      await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(getPipPath);
        https.get(getPipUrl, (response: any) => {
          const totalSize = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedSize = 0;
          let lastPercentage = 0;
          
          response.on('data', (chunk: Buffer) => {
            downloadedSize += chunk.length;
            if (totalSize > 0) {
              const percentage = Math.round((downloadedSize / totalSize) * 100);
              if (percentage > lastPercentage + 9) { // 每增加10%显示一次
                lastPercentage = percentage;
                console.log(`⏳ 下载pip安装脚本进度: ${percentage}%`);
              }
            }
          });
          
          response.pipe(file);
          file.on('finish', () => {
            console.log('✅ pip安装脚本下载完成');
            file.close();
            resolve();
          });
        }).on('error', (err: any) => {
          fs.unlink(getPipPath, () => {});
          console.error('❌ 下载pip安装脚本失败:', err.message);
          reject(err);
        });
      });
      
      // 安装pip (添加命令进度显示)
      console.log('🔧 开始安装pip...');
      const pipResult = await this.executeCommand(this.getPythonPath(), [getPipPath], {
        cwd: pythonPath
      });
      
      if (pipResult.exitCode === 0) {
        console.log('✅ pip安装成功');
      } else {
        console.error('❌ pip安装失败:', pipResult.stderr);
      }
      
      // 清理
      fs.unlinkSync(getPipPath);
      console.log('🧹 清理临时文件完成');
      
      // 安装uvx
      console.log('🔧 开始安装uv工具...');
      await this.installPythonPackage('uv', { usePip: true });
      console.log('✅ uv工具安装完成');
      
    } catch (error) {
      console.error('❌ 安装pip流程失败:', error);
      throw error;
    }
  }
  
  /**
   * 安装Python包
   */
  async installPythonPackage(packageName: string, options: {
    usePip?: boolean;
    useUvx?: boolean;
    isolatedDir?: string;
    extraArgs?: string[];
  } = {}): Promise<boolean> {
    const {
      usePip = false,
      useUvx = false,
      isolatedDir,
      extraArgs = []
    } = options;
    
    try {
      console.log(`开始安装Python包: ${packageName}`);
      
      let command: string;
      let args: string[] = [];
      // 创建一个新的环境变量对象，不修改全局 process.env
      let childEnv: NodeJS.ProcessEnv = getOriginalEnv();  // 使用干净的环境变量副本
      
      if (useUvx) {
        // 使用uvx安装
        const uvxPath = path.join(path.dirname(this.getPythonPath()), 'uvx');
        command = uvxPath;
        args = ['--verbose', packageName, ...extraArgs];
      } else if (usePip) {
        // 使用pip安装
        const pipPath = path.join(path.dirname(this.getPythonPath()), 'pip3');
        command = pipPath;
        args = ['install', packageName, ...extraArgs];
      } else {
        // 默认使用runtime中的python -m pip
        command = this.getPythonPath();
        args = ['-m', 'pip', 'install', packageName, ...extraArgs];
      }
      
      // 如果指定了隔离目录
      if (isolatedDir) {
        // 确保目录存在
        fs.mkdirSync(isolatedDir, { recursive: true });
        
        // 设置UV_PYTHON指向虚拟环境中的Python解释器
        if (fs.existsSync(path.join(isolatedDir, 'bin', 'python3'))) {
          childEnv.UV_PYTHON = path.join(isolatedDir, 'bin', 'python3');
        } else {
          childEnv.UV_PYTHON = this.getPythonPath();
        }
        
        // 设置PYTHONPATH环境变量
        const pythonPath = childEnv.PYTHONPATH || '';
        childEnv.PYTHONPATH = isolatedDir + (pythonPath ? `:${pythonPath}` : '');
      }
      
      // 执行安装命令
      const result = await this.executeCommand(command, args, { env: childEnv });
      
      if (result.exitCode === 0) {
        console.log(`安装Python包成功: ${packageName}`);
        return true;
      } else {
        console.error(`安装Python包失败: ${packageName}`, result.stderr);
        return false;
      }
      
    } catch (error) {
      console.error(`安装Python包异常: ${packageName}`, error);
      return false;
    }
  }
  
  /**
   * 执行命令
   */
  async executeCommand(command: string, args: string[] = [], options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    shell?: boolean;
  } = {}): Promise<{stdout: string; stderr: string; exitCode: number}> {
    return new Promise((resolve) => {
      console.log(`执行命令: ${command} ${args.join(' ')}`);
      
      // 创建一个新的环境变量对象，而不是修改全局的 process.env
      const childEnv = getOriginalEnv();
      
      // 将传入的环境变量合并到子进程环境中，而不是全局环境
      if (options.env) {
        Object.assign(childEnv, options.env);
      }
      
      const spawnOptions: SpawnOptions = {
        cwd: options.cwd,
        env: childEnv, // 使用隔离的环境变量
        shell: options.shell,
        stdio: 'pipe'
      };
      
      const childProcess = spawn(command, args, spawnOptions);
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[命令输出] ${output.trim()}`);
      });
      
      childProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[命令错误] ${output.trim()}`);
      });
      
      childProcess.on('close', (code) => {
        console.log(`命令执行完成，退出码: ${code}`);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });
    });
  }
  
  /**
   * 创建隔离的Python环境
   * 只创建工具特定目录，复用主Python环境中的基础工具
   */
  async createIsolatedPythonEnv(envName: string, options: {
    packages?: string[];
    requirements?: string;
  } = {}): Promise<string> {
    const { packages = [], requirements } = options;
    // 获取工具特定目录路径
    const userDataPath = app.getPath('userData');
    const envPath = path.join(userDataPath, 'extensions', envName);
    
    try {
      console.log(`创建隔离环境: ${envName}`);
      
      // 如果环境已存在，直接返回
      if (fs.existsSync(envPath)) {
        console.log(`隔离环境已存在: ${envPath}`);
        return envPath;
      }
      
      // 创建隔离环境目录结构
      fs.mkdirSync(envPath, { recursive: true });
      console.log(packages);
      
      // 安装指定的包 - 直接使用主Python环境中的pip/uvx
      for (const pkg of packages) {
        // 使用主Python环境中的pip/uvx安装到工具特定目录
        await this.installPythonPackage(pkg, { 
          isolatedDir: envPath,
          // 优先使用uvx
          useUvx: true
        });
      }
      
      // 如果提供了requirements文件路径
      if (requirements && fs.existsSync(requirements)) {
        await this.installPythonPackage('-r ' + requirements, { 
          isolatedDir: envPath,
          useUvx: true
        });
      }
      
      console.log(`隔离环境创建完成: ${envPath}`);
      return envPath;
      
    } catch (error) {
      console.error(`创建隔离环境失败: ${envName}`, error);
      fs.rmSync(envPath, { recursive: true, force: true });
      throw error;
    }
  }
  
  /**
   * 获取隔离环境目录
   */
  getIsolatedEnvPath(envName: string): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'extensions', envName);
  }

  getVenvPythonPath(envName: string): string {
    const envPath = this.getIsolatedEnvPath(envName);
    return path.join(envPath, '.venv', 'bin', 'python3');
  }
  
  /**
   * 在隔离环境中运行命令
   * 运行时同时使用主Python环境和工具特定目录
   */
  async runInIsolatedEnv(
    envName: string, 
    command: string, 
    args: string[] = [], 
    options: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
    } = {}
  ): Promise<{stdout: string; stderr: string; exitCode: number}> {
    try {
      // 获取工具特定目录
      const userDataPath = app.getPath('userData');
      const envPath = path.join(userDataPath, 'extensions', envName);
      
      // 检查环境是否存在
      if (!fs.existsSync(envPath)) {
        throw new Error(`隔离环境不存在: ${envName}`);
      }
      
      // 获取主Python环境目录
      const pythonDir = path.dirname(this.getPythonPath());
      const sitePackages = path.join(pythonDir, '..', 'lib', 'python3.13', 'site-packages');
      
      // 创建一个新的环境变量对象，不修改全局 process.env
      const childEnv = {
        ...getOriginalEnv(),  // 使用干净的环境变量副本
        ...options.env
      } as NodeJS.ProcessEnv;
      
      // 设置PYTHONPATH包含工具特定目录和主Python环境
      // 工具特定目录放在前面，这样优先使用工具特定依赖
      const pythonPath = childEnv.PYTHONPATH || '';
      childEnv.PYTHONPATH = [
        envPath,           // 工具特定目录
        sitePackages,      // 主Python环境的site-packages
        pythonPath         // 原有的PYTHONPATH
      ].filter(p => p).join(':');
      
      // 命令替换
      let actualCommand = command;
      let actualArgs = [...args];
      
      // 如果是uvx命令，使用主Python环境中的uvx
      if (command === 'uvx') {
        actualCommand = this.getPythonPath();
        actualArgs = ['-m', 'uv', ...args];
      }
      
      // 执行命令，传递隔离的环境变量
      return await this.executeCommand(actualCommand, actualArgs, {
        cwd: options.cwd,
        env: childEnv
      });
      
    } catch (error) {
      console.error(`在隔离环境中运行命令失败: ${envName}`, error);
      throw error;
    }
  }

  /**
   * 为MCP服务器创建虚拟环境
   * @param mcpName MCP服务器名称
   */
  async createMcpVirtualEnv(mcpName: string): Promise<string> {
    // MCP服务器目录
    const mcpServerDir = path.join(app.getPath('userData'), 'extensions', mcpName);
    
    // 确保目录存在
    fs.mkdirSync(mcpServerDir, { recursive: true });
    
    // 虚拟环境路径
    const venvPath = path.join(mcpServerDir, '.venv');
    
    // 如果虚拟环境已存在，直接返回
    if (fs.existsSync(venvPath)) {
      console.log(`MCP服务器虚拟环境已存在: ${venvPath}`);
      return venvPath;
    }
    
    // 创建虚拟环境
    console.log(`创建MCP服务器虚拟环境: ${venvPath}`);
    const result = await this.executeCommand(
      this.getPythonPath(),
      ['-m', 'virtualenv', venvPath],
      { cwd: mcpServerDir }
    );
    
    if (result.exitCode !== 0) {
      throw new Error(`创建虚拟环境失败: ${result.stderr}`);
    }
    
    console.log(`MCP服务器虚拟环境创建成功: ${venvPath}`);
    return venvPath;
  }

  /**
   * 在虚拟环境中安装包
   * @param venvPath 虚拟环境路径
   * @param packageName 包名
   */
  async installPackageInVenv(venvPath: string, packageName: string): Promise<boolean> {
    // 获取虚拟环境中的Python解释器路径
    const venvPythonPath = path.join(venvPath, 'bin', 'python3');
    
    if (!fs.existsSync(venvPythonPath)) {
      console.error(`虚拟环境中的Python解释器不存在: ${venvPythonPath}`);
      return false;
    }
    
    console.log(`在虚拟环境中安装包: ${packageName}`);
    
    // 使用虚拟环境中的pip安装包
    const result = await this.executeCommand(
      venvPythonPath,
      ['-m', 'pip', 'install', packageName],
      { env: getOriginalEnv() }
    );
    
    if (result.exitCode === 0) {
      console.log(`在虚拟环境中安装包成功: ${packageName}`);
      return true;
    } else {
      console.error(`在虚拟环境中安装包失败: ${packageName}`, result.stderr);
      return false;
    }
  }

  /**
   * 列出虚拟环境中已安装的包
   * @param venvPath 虚拟环境路径
   */
  async listVenvPackages(venvPath: string): Promise<string[]> {
    // 获取虚拟环境中的Python解释器路径
    const venvPythonPath = path.join(venvPath, 'bin', 'python3');
    
    if (!fs.existsSync(venvPythonPath)) {
      console.error(`虚拟环境中的Python解释器不存在: ${venvPythonPath}`);
      return [];
    }
    
    // 使用pip list命令列出已安装的包
    const result = await this.executeCommand(
      venvPythonPath,
      ['-m', 'pip', 'list'],
      { env: getOriginalEnv() }
    );
    
    if (result.exitCode === 0) {
      // 解析pip list的输出，提取包名
      const lines = result.stdout.split('\n').slice(2); // 跳过标题行
      const packages = lines
        .map(line => line.trim())
        .filter(line => line)
        .map(line => line.split(/\s+/)[0]); // 提取包名
      
      return packages;
    } else {
      console.error(`列出虚拟环境中的包失败:`, result.stderr);
      return [];
    }
  }
}
