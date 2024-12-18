import { spawn, SpawnOptions } from 'child_process';
import { app } from 'electron';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { getOriginalEnv } from '~/main/index';
import { downloadAndExtract } from '~/main/utils/common';
import { PlatformRuntime } from './platformRuntime';

export class Win32Runtime extends PlatformRuntime {
  downUrl = '';

  async installRuntime() {
    try {
      const runtimePath = path.join(app.getPath('userData'), 'runtime');
      console.log(fs.existsSync(this.getPythonPath()), fs.existsSync(this.getNodePath()));
      // 检查是否已安装
      if (fs.existsSync(this.getPythonPath()) && fs.existsSync(this.getNodePath())) {
        console.log('Python、Node运行时已安装');
        return;
      }

      // 下载并解压Python
      await downloadAndExtract(this.downUrl, runtimePath);

      await this.setupNpmAndNpx();
      console.log('安装运行时成功');
    } catch (error) {
      console.error('安装运行时失败:', error);
      throw error;
    }
  }

  getUvxPath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'runtime', 'uv', 'uvx.exe');
  };

  getGitPath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'runtime', 'git', 'cmd', 'git.exe');
  };

  // 获取Electron内置Node路径
  private getNodePath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(
      userDataPath,
      'runtime',
      'nodejs',
      'node.exe'
    );
  };

  // 获取npm路径
  private getNpmPath = () => {
    const nodeDir = path.dirname(this.getNodePath());

    // 首先检查是否有直接的npm.cmd文件
    const directNpmCmd = path.join(nodeDir, 'npm.cmd');
    if (fs.existsSync(directNpmCmd)) {
      return directNpmCmd;
    }

    // 然后检查node_modules中的npm
    const npmInNodeModules = path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (fs.existsSync(npmInNodeModules)) {
      // 如果存在npm-cli.js但没有npm.cmd，创建npm.cmd
      this.createNpmCmdFile(nodeDir, npmInNodeModules);
      return path.join(nodeDir, 'npm.cmd');
    }

    // 最后返回默认路径
    return path.join(nodeDir, 'npm.cmd');
  };

  // 获取npx路径
  getNpxPath = () => {
    try {
      const nodeDir = path.dirname(this.getNodePath());

      console.log(`获取npx路径，nodeDir: ${nodeDir}`);

      // 首先检查是否有直接的npx.cmd文件
      const directNpxCmd = path.join(nodeDir, 'npx.cmd');
      console.log(`检查npx.cmd: ${directNpxCmd}, 存在: ${fs.existsSync(directNpxCmd)}`);

      if (fs.existsSync(directNpxCmd)) {
        console.log(`使用现有npx.cmd: ${directNpxCmd}`);
        return directNpxCmd;
      }

      // 然后检查node_modules中的npm/bin目录
      const npmBinDir = path.join(nodeDir, 'node_modules', 'npm', 'bin');
      console.log(`检查npm/bin目录: ${npmBinDir}, 存在: ${fs.existsSync(npmBinDir)}`);

      if (fs.existsSync(npmBinDir)) {
        // 检查是否有npx-cli.js或npm-cli.js
        const npxCliJs = path.join(npmBinDir, 'npx-cli.js');
        const npmCliJs = path.join(npmBinDir, 'npm-cli.js');

        console.log(`检查npx-cli.js: ${npxCliJs}, 存在: ${fs.existsSync(npxCliJs)}`);
        console.log(`检查npm-cli.js: ${npmCliJs}, 存在: ${fs.existsSync(npmCliJs)}`);

        if (fs.existsSync(npxCliJs) || fs.existsSync(npmCliJs)) {
          // 如果存在npm目录但没有npx.cmd，创建npx.cmd
          console.log(`创建npx.cmd文件`);
          this.createNpxCmdFile(nodeDir, npmBinDir);

          const createdNpxCmd = path.join(nodeDir, 'npx.cmd');
          console.log(`返回创建的npx.cmd: ${createdNpxCmd}`);
          return createdNpxCmd;
        }
      }

      // 最后返回默认路径
      console.log(`返回默认npx.cmd路径: ${path.join(nodeDir, 'npx.cmd')}`);
      return path.join(nodeDir, 'npx.cmd');
    } catch (error) {
      console.error(`获取npx路径失败:`, error);

      // 出错时返回一个基本路径
      const defaultPath = path.join(path.dirname(this.getNodePath()), 'npx.cmd');
      console.log(`返回错误处理的默认路径: ${defaultPath}`);
      return defaultPath;
    }
  };

  private getPythonPath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'runtime', 'python', 'python.exe');
  };

  // 设置npm和npx
  async setupNpmAndNpx() {
    try {
      const nodeDir = path.dirname(this.getNodePath());

      // 检查node_modules/npm是否存在
      const npmModulePath = path.join(nodeDir, 'node_modules', 'npm');
      if (fs.existsSync(npmModulePath)) {
        console.log('找到npm模块，创建命令文件...');

        // 创建npm.cmd和npx.cmd
        const npmCliJs = path.join(npmModulePath, 'bin', 'npm-cli.js');
        if (fs.existsSync(npmCliJs)) {
          this.createNpmCmdFile(nodeDir, npmCliJs);
          this.createNpxCmdFile(nodeDir, path.dirname(npmCliJs));
          console.log('npm和npx命令文件创建成功');
          return true;
        }
      }

    } catch (error) {
      console.error('设置npm和npx失败:', error);
      return false;
    }
  }

  // 创建npm.cmd文件
  private createNpmCmdFile(nodeDir: string, npmCliJsPath: string) {
    try {
      console.log(`创建npm.cmd，nodeDir: ${nodeDir}, npmCliJsPath: ${npmCliJsPath}`);

      // 使用简单的相对路径
      const relativePath = path.relative(nodeDir, npmCliJsPath).replace(/\\/g, '\\\\');
      console.log(`npm-cli.js相对路径: ${relativePath}`);

      // 获取node.exe的绝对路径
      const nodeExePath = this.getNodePath().replace(/\\/g, '\\\\');
      console.log(`Node.exe路径: ${nodeExePath}`);

      // 使用简单的cmd文件格式，避免复杂的语法
      const npmCmdContent = `@echo off
set NODE_EXE=${nodeExePath}
if not exist "%NODE_EXE%" set NODE_EXE=node

"%NODE_EXE%" "${npmCliJsPath}" %*
`;

      const npmCmdPath = path.join(nodeDir, 'npm.cmd');
      console.log(`写入npm.cmd到: ${npmCmdPath}`);
      console.log(`npm.cmd内容:\n${npmCmdContent}`);

      // 使用ascii编码写入文件
      fs.writeFileSync(npmCmdPath, npmCmdContent, { encoding: 'ascii' });

      // 验证文件是否成功创建
      if (fs.existsSync(npmCmdPath)) {
        // 读取文件内容并打印，用于验证
        const fileContent = fs.readFileSync(npmCmdPath, 'utf8');
        console.log(`验证npm.cmd内容:\n${fileContent}`);
        console.log('创建npm.cmd成功');
      } else {
        console.error('创建npm.cmd失败: 文件未创建');
      }
    } catch (error) {
      console.error('创建npm.cmd失败:', error);
      throw error;
    }
  }

  // 创建npx.cmd文件
  private createNpxCmdFile(nodeDir: string, npmBinDir: string) {
    try {
      console.log(`创建npx.cmd，nodeDir: ${nodeDir}, npmBinDir: ${npmBinDir}`);

      // 检查是否存在专门的npx-cli.js
      const npxCliJs = path.join(npmBinDir, 'npx-cli.js');
      const npmCliJs = path.join(npmBinDir, 'npm-cli.js');

      console.log(`检查npx-cli.js: ${npxCliJs}, 存在: ${fs.existsSync(npxCliJs)}`);
      console.log(`检查npm-cli.js: ${npmCliJs}, 存在: ${fs.existsSync(npmCliJs)}`);

      // 确保至少有一个脚本文件存在
      if (!fs.existsSync(npxCliJs) && !fs.existsSync(npmCliJs)) {
        throw new Error(`在 ${npmBinDir} 中找不到npx-cli.js或npm-cli.js`);
      }

      // 使用存在的脚本文件的绝对路径
      const scriptPath = fs.existsSync(npxCliJs) ? npxCliJs : npmCliJs;

      console.log(`使用脚本: ${scriptPath}`);

      // 获取node.exe的绝对路径
      const nodeExePath = this.getNodePath().replace(/\\/g, '\\\\');
      console.log(`Node.exe路径: ${nodeExePath}`);

      // 使用简单的cmd文件格式，避免复杂的语法，并使用绝对路径
      const npxCmdContent = `@echo off
set NODE_EXE=${nodeExePath}
if not exist "%NODE_EXE%" set NODE_EXE=node

rem 执行${scriptPath}
${
  fs.existsSync(npxCliJs)
    ? `"%NODE_EXE%" "${scriptPath}" %*`
    : `"%NODE_EXE%" "${scriptPath}" exec -- %*`
}
`;

      const npxCmdPath = path.join(nodeDir, 'npx.cmd');
      console.log(`写入npx.cmd到: ${npxCmdPath}`);
      console.log(`npx.cmd内容:\n${npxCmdContent}`);

      // 使用ascii编码写入文件
      fs.writeFileSync(npxCmdPath, npxCmdContent, { encoding: 'ascii' });

      // 验证文件是否成功创建
      if (fs.existsSync(npxCmdPath)) {
        // 读取文件内容并打印，用于验证
        const fileContent = fs.readFileSync(npxCmdPath, 'utf8');
        console.log(`验证npx.cmd内容:\n${fileContent}`);
        console.log('创建npx.cmd成功');
      } else {
        console.error('创建npx.cmd失败: 文件未创建');
      }
    } catch (error) {
      console.error('创建npx.cmd失败:', error);
      throw error;
    }
  }

  async installPythonRuntime() {
    const pythonPath = path.join(app.getPath('userData'), 'runtime');

    // 检查是否已安装
    if (fs.existsSync(this.getPythonPath())) {
      console.log('Python运行时已安装');
      return;
    }

    // 下载并解压Python
    await downloadAndExtract(this.downUrl, pythonPath);
    // 解压后需要配置Python环境
    await this.setupPythonConfig(path.join(pythonPath, 'python'));
  }

  /**
   * 配置Python环境
   */
  private async setupPythonConfig(pythonPath: string): Promise<void> {
    try {
      // 修改python*._pth文件
      const pthFiles = fs.readdirSync(pythonPath).filter((file) => file.endsWith('._pth'));
      if (pthFiles.length > 0) {
        const pthFile = path.join(pythonPath, pthFiles[0]);
        let content = fs.readFileSync(pthFile, 'utf8');

        // 取消注释import site
        content = content.replace('#import site', 'import site');
        // 将修改后的内容写回文件
        fs.writeFileSync(pthFile, content, 'utf8');
      }

    } catch (error) {
      console.error('配置Python环境失败:', error);
      throw error;
    }
  }

  /**
   * @deprecated 由于已经内置了pip，所以不需要安装，即将删除
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
        https
          .get(getPipUrl, (response: any) => {
            const totalSize = parseInt(response.headers['content-length'] || '0', 10);
            let downloadedSize = 0;
            let lastPercentage = 0;

            response.on('data', (chunk: Buffer) => {
              downloadedSize += chunk.length;
              if (totalSize > 0) {
                const percentage = Math.round((downloadedSize / totalSize) * 100);
                if (percentage > lastPercentage + 9) {
                  // 每增加10%显示一次
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
          })
          .on('error', (err: any) => {
            fs.unlink(getPipPath, () => {});
            console.error('❌ 下载pip安装脚本失败:', err.message);
            reject(err);
          });
      });

      // 安装pip (添加命令进度显示)
      console.log('🔧 开始安装pip...');
      const pipResult = await this.executeCommand(this.getPythonPath(), [getPipPath], {
        cwd: pythonPath,
      });

      if (pipResult.exitCode === 0) {
        console.log('✅ pip安装成功');
      } else {
        console.error('❌ pip安装失败:', pipResult.stderr);
      }

      // 清理
      fs.unlinkSync(getPipPath);
      console.log('🧹 清理临时文件完成');

      // 安装virtualenv
      await this.executeCommand(this.getPythonPath(), ['-m', 'pip', 'install', 'virtualenv'], {
        env: getOriginalEnv(),
      });
      console.log('✅ virtualenv安装成功');
    } catch (error) {
      console.error('❌ 安装pip流程失败:', error);
      throw error;
    }
  }

  static getUvxPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'runtime', 'uv', 'uvx.exe');
  }

  /**
   * 安装Python包
   */
  async installPythonPackage(
    packageName: string,
    options: {
      usePip?: boolean;
      useUvx?: boolean;
      isolatedDir?: string;
      extraArgs?: string[];
    } = {}
  ): Promise<boolean> {
    const { usePip = false, useUvx = false, isolatedDir, extraArgs = [] } = options;

    try {
      console.log(`开始安装Python包: ${packageName}`);

      let command: string;
      let args: string[] = [];
      // 创建一个新的环境变量对象，不修改全局 process.env
      let childEnv: NodeJS.ProcessEnv = getOriginalEnv(); // 使用干净的环境变量副本

      if (useUvx) {
        // 使用uvx安装
        const uvxPath = Win32Runtime.getUvxPath();
        command = uvxPath;
        args = ['--verbose', packageName, ...extraArgs];
      } else if (usePip) {
        // 使用pip安装
        const pipPath = path.join(path.dirname(this.getPythonPath()), 'Scripts', 'pip.exe');
        command = pipPath;
        args = ['install', packageName, ...extraArgs];
      } else {
        // 默认使用runtime中的python -m pip
        command = this.getPythonPath();
        args = ['-m', 'pip', 'install', packageName, ...extraArgs];
      }

      // 如果指定了隔离目录
      if (isolatedDir) {
        childEnv.UV_PYTHON = path.join(isolatedDir, 'Scripts', 'python.exe');
        childEnv.GIT_PYTHON_GIT_EXECUTABLE = this.getGitPath();
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

  getEnvPath = (serverId: string) => {
    const mcpRuntimePath = path.join(app.getPath('userData'), 'runtime');
    return {
      ...getOriginalEnv(),
      UV_PYTHON: this.getVenvPythonPath(serverId),
      GIT_PYTHON_GIT_EXECUTABLE: this.getGitPath(),
    };
  };

  /**
   * 执行命令
   */
  async executeCommand(
    command: string,
    args: string[] = [],
    options: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      shell?: boolean;
    } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
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
        stdio: 'pipe',
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
          exitCode: code || 0,
        });
      });
    });
  }

  /**
   * 创建隔离的Python环境
   * 只创建工具特定目录，复用主Python环境中的基础工具
   */
  async createIsolatedPythonEnv(
    envName: string,
    options: {
      packages?: string[];
      requirements?: string;
    } = {}
  ): Promise<string> {
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
          useUvx: true,
        });
      }

      // 如果提供了requirements文件路径
      if (requirements && fs.existsSync(requirements)) {
        await this.installPythonPackage('-r ' + requirements, {
          isolatedDir: envPath,
          useUvx: true,
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
    return path.join(envPath, '.venv', 'Scripts', 'python.exe');
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
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
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
      const sitePackages = path.join(pythonDir, 'Lib', 'site-packages');

      // 创建一个新的环境变量对象，不修改全局 process.env
      const childEnv = {
        ...getOriginalEnv(),
        ...options.env,
      } as NodeJS.ProcessEnv;

      // 设置PYTHONPATH包含工具特定目录和主Python环境
      // 工具特定目录放在前面，这样优先使用工具特定依赖
      const pythonPath = childEnv.PYTHONPATH || '';
      childEnv.PYTHONPATH = [
        envPath, // 工具特定目录
        sitePackages, // 主Python环境的site-packages
        pythonPath, // 原有的PYTHONPATH
      ]
        .filter((p) => p)
        .join(process.platform === 'win32' ? ';' : ':');

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
        env: childEnv,
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
    const result = await this.executeCommand(this.getPythonPath(), ['-m', 'virtualenv', venvPath], {
      cwd: mcpServerDir,
    });

    if (result.exitCode !== 0) {
      throw new Error(`创建虚拟环境失败: ${result.stderr}`);
    }

    console.log(`MCP服务器虚拟环境创建成功: ${venvPath}`);
    return venvPath;
  }
}
