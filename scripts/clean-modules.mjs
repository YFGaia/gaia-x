// scripts/clean-modules.mjs
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// 获取当前文件的目录名
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 解析命令行参数
const parseArgs = () => {
  const args = process.argv.slice(2);
  console.log(args);
  return {
    noCache: args.includes('--no-cache')
  };
};

// 确保依赖存在 - 只保留yaml依赖
const ensureDependencies = async () => {
  try {
    await import('yaml');
  } catch (e) {
    console.log('📦 安装yaml依赖...');
    execSync('pnpm add -D -w yaml', { stdio: 'inherit' });
  }
};

// 获取所有workspace路径 - 优化路径解析
const getWorkspacePaths = async () => {
  const rootDir = process.cwd();
  const workspacePaths = new Set([rootDir]); // 使用Set避免重复
  
  // 解析pnpm-workspace.yaml
  const workspaceYamlPath = path.join(rootDir, 'pnpm-workspace.yaml');
  
  if (!fs.existsSync(workspaceYamlPath)) {
    console.warn('⚠️ 警告: 未找到pnpm-workspace.yaml文件');
    return [...workspacePaths];
  }
  
  try {
    // 使用yaml库解析文件
    const { default: yaml } = await import('yaml');
    const workspaceFile = fs.readFileSync(workspaceYamlPath, 'utf8');
    const workspaceConfig = yaml.parse(workspaceFile);
    
    // 检查配置是否有效
    if (!workspaceConfig?.packages?.length) {
      console.warn('⚠️ 警告: pnpm-workspace.yaml的格式不符合预期');
      return [...workspacePaths];
    }
    
    // 优化: 使用Promise.all并行处理所有模式
    await Promise.all(workspaceConfig.packages.map(async (pattern) => {
      console.log(`🔍 处理workspace模式: ${pattern}`);
      
      if (pattern.includes('*')) {
        // 处理通配符
        const baseDir = pattern.split('*')[0] || '.';
        
        // 确保目录存在
        if (!fs.existsSync(baseDir)) {
          console.warn(`⚠️ 警告: 目录 ${baseDir} 不存在`);
          return;
        }
        
        // 查找匹配的目录
        findMatchingDirs(baseDir, pattern).forEach(dir => 
          workspacePaths.add(dir)
        );
      } else {
        // 直接添加路径
        const fullPath = path.resolve(rootDir, pattern);
        if (fs.existsSync(fullPath)) {
          workspacePaths.add(fullPath);
        } else {
          console.warn(`⚠️ 警告: 路径 ${fullPath} 不存在`);
        }
      }
    }));
  } catch (error) {
    console.error('❌ 解析workspace配置时出错:', error);
  }
  
  const pathsArray = [...workspacePaths];
  console.log(`🔍 找到 ${pathsArray.length} 个workspace路径:`);
  pathsArray.forEach(p => console.log(`  - ${p}`));
  
  return pathsArray;
};

// 递归查找匹配模式的目录 - 优化正则表达式
const findMatchingDirs = (baseDir, pattern) => {
  const matchingDirs = new Set(); // 使用Set避免重复
  const isGlobstar = pattern.includes('**');
  
  // 优化: 将通配符模式转换为更高效的正则表达式
  const regexPattern = pattern
    .replace(/\./g, '\\.')    // 转义点号
    .replace(/\*\*/g, '__GLOBSTAR__')  // 临时替换**
    .replace(/\*/g, '[^/]*')  // 单星号替换为不包含斜杠的任意字符
    .replace(/__GLOBSTAR__/g, '.*');  // 还原**为任意字符
    
  const regex = new RegExp(`^${regexPattern}$`);
  
  const traverse = (dir, depth = 0) => {
    if (!fs.existsSync(dir)) return;
    
    // 检查当前目录是否匹配
    const relativePath = path.relative(process.cwd(), dir);
    if (regex.test(relativePath) || regex.test(`${relativePath}/`)) {
      matchingDirs.add(dir);
    }
    
    // 如果存在package.json，则视为潜在的workspace
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      matchingDirs.add(dir);
    }
    
    // 递归处理子目录（如果是globstar或在第一级）
    if (isGlobstar || depth === 0) {
      try {
        fs.readdirSync(dir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .forEach(dirent => {
            const subdir = path.join(dir, dirent.name);
            traverse(subdir, depth + 1);
          });
      } catch (error) {
        console.warn(`⚠️ 无法读取目录 ${dir}: ${error.message}`);
      }
    }
  };
  
  traverse(baseDir);
  return [...matchingDirs];
};

// 删除指定目录 - 优化删除方法
const removeDir = async (dir) => {
  if (!fs.existsSync(dir)) return false;
  
  console.log(`🗑️ 删除: ${dir}`);
  try {
    // 优化: 根据Node.js版本选择最佳API
    const nodeVersion = process.versions.node.split('.').map(Number);
    
    if (nodeVersion[0] >= 14 && nodeVersion[1] >= 14) {
      // Node.js 14.14.0+ 使用内置的rmSync
      fs.rmSync(dir, { recursive: true, force: true });
    } else if (process.platform === 'win32') {
      // Windows系统使用系统命令
      execSync(`rmdir /s /q "${dir}"`, { stdio: 'inherit' });
    } else {
      // 其他系统使用rm命令
      execSync(`rm -rf "${dir}"`, { stdio: 'inherit' });
    }
    return true;
  } catch (error) {
    console.error(`❌ 删除 ${dir} 失败:`, error.message);
    return false;
  }
};

// 清理所有node_modules - 添加进度显示
const cleanNodeModules = async (options = {}) => {
  console.log('🧹 开始清理node_modules目录...');
  
  // 删除根目录的 pnpm-lock.yaml
  const lockFile = path.join(process.cwd(), 'pnpm-lock.yaml');
  if (fs.existsSync(lockFile)) {
    console.log('🗑️ 删除 pnpm-lock.yaml...');
    try {
      fs.unlinkSync(lockFile);
      console.log('✅ pnpm-lock.yaml 删除成功');
    } catch (error) {
      console.error('❌ 删除 pnpm-lock.yaml 失败:', error.message);
    }
  }
  
  // 获取所有workspace路径
  const workspacePaths = await getWorkspacePaths();
  let cleaned = 0;
  let failed = 0;
  let total = 0;
  let bytesFreed = 0;
  
  // 删除每个路径中的node_modules
  for (const [index, pkgPath] of workspacePaths.entries()) {
    const modulesPath = path.join(pkgPath, 'node_modules');
    if (fs.existsSync(modulesPath)) {
      total++;
      // 计算目录大小
      try {
        const stats = await getDirSize(modulesPath);
        const sizeMB = Math.round(stats.size / 1024 / 1024);
        process.stdout.write(`[${index + 1}/${workspacePaths.length}] 删除 ${modulesPath} (${sizeMB} MB)... `);
        bytesFreed += stats.size;
      } catch (e) {
        process.stdout.write(`[${index + 1}/${workspacePaths.length}] 删除 ${modulesPath}... `);
      }
      
      const success = await removeDir(modulesPath);
      if (success) {
        cleaned++;
        process.stdout.write('✅\n');
      } else {
        failed++;
        process.stdout.write('❌\n');
      }
    }
  }
  
  // 清理.pnpm-store
  const pnpmStorePath = path.join(process.cwd(), '.pnpm-store');
  if (fs.existsSync(pnpmStorePath)) {
    total++;
    process.stdout.write(`删除 ${pnpmStorePath}... `);
    const success = await removeDir(pnpmStorePath);
    if (success) {
      cleaned++;
      process.stdout.write('✅\n');
    } else {
      failed++;
      process.stdout.write('❌\n');
    }
  }
  
  // 根据--no-cache参数决定是否清理pnpm缓存
  if (options.noCache) {
    try {
      console.log('🧹 清理pnpm缓存...');
      execSync('pnpm store prune', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ 清理pnpm缓存失败:', error.message);
    }
  } else {
    console.log('💾 保留pnpm缓存以加速安装...');
  }
  
  // 显示统计信息
  const freedMB = Math.round(bytesFreed / 1024 / 1024);
  console.log(`\n✨ 清理完成!`);
  console.log(`✅ 成功: ${cleaned}/${total}`);
  if (failed > 0) console.log(`❌ 失败: ${failed}/${total}`);
  if (freedMB > 0) console.log(`💾 释放空间: 约 ${freedMB} MB`);
};

// 获取目录大小
const getDirSize = (dirPath) => {
  return new Promise((resolve) => {
    try {
      let size = 0;
      let files = 0;
      
      const traverse = (dir) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            traverse(fullPath);
          } else if (item.isFile()) {
            const stat = fs.statSync(fullPath);
            size += stat.size;
            files++;
          }
        }
      };
      
      // 最多检查1000个文件，避免过长时间
      try {
        traverse(dirPath);
      } catch (e) {
        // 忽略错误
      }
      
      resolve({ size, files });
    } catch (error) {
      resolve({ size: 0, files: 0 });
    }
  });
};

// 主程序
const main = async () => {
  const startTime = Date.now();
  const options = parseArgs();
  console.log(options);
  // 输出当前运行模式
  if (!options.noCache) {
    console.log('🚀 以保留缓存模式运行 (--no-cache)');
  }
  
  try {
    await ensureDependencies();
    await cleanNodeModules(options);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️ 耗时: ${duration} 秒`);
  } catch (error) {
    console.error('❌ 清理失败:', error);
    process.exit(1);
  }
};

// 执行主程序
main();