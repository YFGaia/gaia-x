import { exec, spawn } from 'child_process';
import { app } from 'electron';
import fs, { createWriteStream } from 'fs';
import * as http from 'http';
import * as https from 'https';
import path from 'path';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';

// 将exec和yauzl方法转为Promise
const execAsync = promisify(exec);

/**
 * 下载文件并解压到指定目录
 * @param url 文件下载URL
 * @param destDir 解压目标目录
 * @param options 额外选项
 * @returns 解压后的目录路径
 */
export async function downloadAndExtract(
  url: string, 
  destDir: string, 
  options: {
    tempDir?: string,         // 临时目录，默认为系统临时目录
    showProgress?: boolean,   // 是否显示进度，默认为true
    onProgress?: (percent: number, downloaded: number, total: number) => void,  // 进度回调
    timeout?: number,         // 超时时间，默认30秒
    retries?: number,         // 下载重试次数
    retryDelay?: number       // 重试延迟(毫秒)
  } = {}
): Promise<string> {
  // 设置默认选项
  const {
    tempDir = app.getPath('temp'),
    showProgress = true,
    onProgress = (percent) => { if (showProgress) console.log(`下载进度: ${percent.toFixed(2)}%`) },
    timeout = 30000,  // 30秒超时
    retries = 3,      // 3次重试
    retryDelay = 2000 // 2秒延迟
  } = options;

  // 为macOS处理路径中的空格
  const isMacOS = process.platform === 'darwin';
  const safeDestDir = destDir.replace(/\s/g, '\\ ');
  
  // 记录当前运行环境
  console.log('=== 系统信息 ===');
  console.log(`平台: ${process.platform} (${isMacOS ? 'macOS' : 'not macOS'})`);
  console.log(`目标目录: ${destDir}`);
  console.log(`临时目录: ${tempDir}`);
  console.log('================');
  
  // 创建目标目录
  try {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`创建目标目录成功: ${destDir}`);
  } catch (error: any) {
    console.error(`创建目录失败 ${destDir}: ${error.message}`);
    throw new Error(`无法创建目标目录: ${error.message}`);
  }

  // 生成临时文件路径
  const fileName = path.basename(url);
  const tempFilePath = path.join(tempDir, `download-${Date.now()}-${fileName}`);

  try {
    console.log(`开始下载: ${url} 到 ${tempFilePath}`);
    
    // 下载文件
    await downloadFile(url, tempFilePath, { 
      onProgress, 
      timeout,
      retries,
      retryDelay
    });
    
    // 验证下载的文件是否存在
    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`下载成功但文件不存在: ${tempFilePath}`);
    }
    
    // 获取文件大小
    const fileSize = fs.statSync(tempFilePath).size;
    if (fileSize === 0) {
      throw new Error(`下载成功但文件大小为0: ${tempFilePath}`);
    }
    
    console.log(`下载完成 (文件大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB)，开始解压到: ${destDir}`);
    
    // 根据文件类型解压
    await extractFile(tempFilePath, destDir);
    
    console.log(`解压完成，所有文件已成功解压到: ${destDir}`);
    
    return destDir;
  } catch (error: any) {
    console.error(`下载和解压过程失败:`, error);
    
    // 尝试列出目录内容以便调试
    try {
      if (fs.existsSync(destDir)) {
        const files = fs.readdirSync(destDir);
        console.log(`目标目录内容 (${files.length} 项):`, files);
      } else {
        console.log('目标目录不存在');
      }
    } catch (dirError: any) {
      console.error(`无法列出目录内容: ${dirError.message}`);
    }
    
    throw new Error(`下载和解压过程失败: ${error.message}`);
  } finally {
    // 清理临时文件
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log(`已删除临时文件: ${tempFilePath}`);
      }
    } catch (error: any) {
      console.warn(`无法删除临时文件 ${tempFilePath}: ${error.message}`);
    }
  }
}

/**
 * 下载文件到指定路径
 */
async function downloadFile(
  url: string, 
  destPath: string, 
  options: { 
    onProgress?: (percent: number, downloaded: number, total: number) => void,
    timeout?: number,
    retries?: number,
    retryDelay?: number
  } = {}
): Promise<void> {
  const { 
    onProgress, 
    timeout = 30000,
    retries = 3,
    retryDelay = 2000
  } = options;
  
  // 检查目标目录是否存在，如果不存在则创建
  const destDir = path.dirname(destPath);
  try {
    fs.mkdirSync(destDir, { recursive: true });
  } catch (error: any) {
    console.error(`创建下载目录失败: ${destDir}`, error);
    throw new Error(`无法创建下载目录: ${error.message}`);
  }
  
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      attempt++;
      
      if (attempt > 1) {
        console.log(`尝试第 ${attempt} 次下载 ${url}...`);
      }
      
      return await new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, {
          timeout
        }, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            // 处理重定向
            if (response.headers.location) {
              return downloadFile(response.headers.location, destPath, options)
                .then(resolve)
                .catch(reject);
            }
            return reject(new Error(`重定向失败: ${response.statusCode}`));
          }
          
          if (response.statusCode !== 200) {
            return reject(new Error(`下载失败，状态码: ${response.statusCode}`));
          }
          
          const totalSize = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedSize = 0;
          
          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize > 0 && onProgress) {
              const percent = (downloadedSize / totalSize) * 100;
              onProgress(percent, downloadedSize, totalSize);
            }
          });
          
          // 创建写入流前检查是否已存在
          if (fs.existsSync(destPath)) {
            try {
              fs.unlinkSync(destPath);
              console.log(`已删除已存在的文件: ${destPath}`);
            } catch (error: any) {
              console.error(`无法删除已存在的文件: ${destPath}`, error);
              return reject(new Error(`无法删除已存在的文件: ${error.message}`));
            }
          }
          
          const fileStream = createWriteStream(destPath);
          
          fileStream.on('error', (error) => {
            // 文件系统错误（如权限问题、磁盘已满等）
            console.error(`写入文件错误: ${destPath}`, error);
            request.destroy(); // 中止请求
            reject(new Error(`写入文件错误: ${error.message}`));
          });
          
          pipeline(response, fileStream)
            .then(() => {
              console.log(`文件下载成功: ${destPath}`);
              resolve();
            })
            .catch(error => {
              console.error(`下载管道错误: ${destPath}`, error);
              reject(new Error(`下载管道错误: ${error.message}`));
            });
        });
        
        request.on('error', (error) => {
          console.error(`下载请求错误:`, error);
          reject(new Error(`下载请求错误: ${error.message}`));
        });
        
        request.on('timeout', () => {
          console.error(`下载请求超时: ${timeout}ms`);
          request.destroy();
          reject(new Error(`下载请求超时 (${timeout}ms)`));
        });
        
        request.end();
      });
    } catch (error: any) {
      if (attempt > retries) {
        console.error(`下载失败，已达到最大重试次数 (${retries}):`, error);
        throw error;
      }
      
      console.warn(`下载失败，${retryDelay / 1000}秒后重试:`, error);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw new Error('无法下载文件，已达到最大重试次数');
}

/**
 * 根据文件类型解压文件
 */
async function extractFile(filePath: string, destDir: string): Promise<void> {
  // 确保目标目录存在
  fs.mkdirSync(destDir, { recursive: true });
  
  // 根据扩展名选择解压方法
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.zip') {
    await extractZip(filePath, destDir);
  } else if (ext === '.gz' || ext === '.tgz') {
    await extractTarGz(filePath, destDir);
  } else {
    throw new Error(`不支持的压缩格式: ${ext}`);
  }
}

/**
 * 在macOS上使用spawn安全解压zip文件
 * 避免路径中空格引起的问题
 */
async function macosExtractZip(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`macOS使用spawn解压: ${zipPath} 到 ${destDir}`);
    
    // 使用spawn直接执行unzip命令，避免shell解析路径
    const unzipProcess = spawn('unzip', [
      '-o',               // 覆盖已存在的文件
      '-q',               // 安静模式，减少输出
      zipPath,            // 压缩包路径
      '-d', destDir       // 目标目录
    ]);
    
    // 收集输出以便调试
    let stdout = '';
    let stderr = '';
    
    unzipProcess.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      if (text.trim()) console.log('unzip输出:', text.trim());
    });
    
    unzipProcess.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      if (text.trim()) console.error('unzip错误:', text.trim());
    });
    
    unzipProcess.on('error', (error) => {
      console.error('unzip进程错误:', error);
      reject(error);
    });
    
    unzipProcess.on('close', (code) => {
      if (code === 0) {
        console.log('unzip解压完成');
        resolve();
      } else {
        console.error(`unzip退出码: ${code}`);
        reject(new Error(`unzip命令失败，退出码: ${code}，错误: ${stderr}`));
      }
    });
  });
}

/**
 * 在macOS上使用spawn安全解压tar.gz文件
 * 避免路径中空格引起的问题
 */
async function macosExtractTarGz(tarPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`macOS使用spawn解压tar: ${tarPath} 到 ${destDir}`);
    
    // 使用spawn直接执行tar命令，避免shell解析路径
    const tarProcess = spawn('tar', [
      '-xzf',             // 解压gzipped tar
      tarPath,            // 压缩包路径
      '-C', destDir       // 目标目录
    ]);
    
    // 收集输出以便调试
    let stdout = '';
    let stderr = '';
    
    tarProcess.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      if (text.trim()) console.log('tar输出:', text.trim());
    });
    
    tarProcess.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      if (text.trim()) console.error('tar错误:', text.trim());
    });
    
    tarProcess.on('error', (error) => {
      console.error('tar进程错误:', error);
      reject(error);
    });
    
    tarProcess.on('close', (code) => {
      if (code === 0) {
        console.log('tar解压完成');
        resolve();
      } else {
        console.error(`tar退出码: ${code}`);
        reject(new Error(`tar命令失败，退出码: ${code}，错误: ${stderr}`));
      }
    });
  });
}

/**
 * 解压zip文件
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  try {
    console.log(`解压zip: ${zipPath} 到 ${destDir}`);
    
    if (process.platform === 'win32') {
      console.log(`使用PowerShell解压: ${zipPath} 到 ${destDir}`);
      // Windows: 使用PowerShell的Expand-Archive命令
      const command = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`;
      await execAsync(command, { maxBuffer: 50 * 1024 * 1024 }); // 设置50MB的缓冲区
    } else {
      // macOS/Linux: 使用特殊的macOS解压方法
      await macosExtractZip(zipPath, destDir);
    }
    
    console.log('解压完成');
  } catch (error) {
    console.error('解压失败:', error);
    throw error;
  }
}

/**
 * 解压tar.gz文件
 */
async function extractTarGz(tarPath: string, destDir: string): Promise<void> {
  try {
    console.log(`解压tar: ${tarPath} 到 ${destDir}`);
    
    if (process.platform === 'win32') {
      // Windows: 使用tar命令 (Windows 10 1803+内置)
      await execAsync(`tar -xzf "${tarPath}" -C "${destDir}"`, { maxBuffer: 50 * 1024 * 1024 });
    } else {
      // macOS/Linux: 使用特殊的macOS解压方法
      await macosExtractTarGz(tarPath, destDir);
    }
    
    console.log('tar解压完成');
  } catch (error) {
    console.error('tar解压失败:', error);
    throw error;
  }
}
