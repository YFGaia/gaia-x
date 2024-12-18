import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 迁移文件目录
const MIGRATIONS_DIR = path.join(path.dirname(__dirname), 'migrations');
const VERSION_DIGITS = 3;

// 确保migrations目录存在
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

// 获取当前最大版本号
function getCurrentVersion() {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  const versions = files
    .filter(file => file.endsWith('.sql'))
    .map(file => parseInt(file.split('_')[0], 10))
    .filter(num => !isNaN(num));

  return Math.max(0, ...versions);
}

// 生成新的迁移文件
function createMigration(name = '') {
  const currentVersion = getCurrentVersion();
  const newVersion = (currentVersion + 1).toString().padStart(VERSION_DIGITS, '0');
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = sanitizedName
    ? `${newVersion}_${timestamp}_${sanitizedName}.sql`
    : `${newVersion}_${timestamp}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  // SQL文件模板
  const template = `-- Migration: ${newVersion}${name ? ` - ${name}` : ''}
-- Created at: ${new Date().toISOString()}
-- Description: [在这里写迁移说明]

-- 开始事务
BEGIN TRANSACTION;

-- 在这里写入您的SQL语句
-- 例如:
-- CREATE TABLE example (
--   id INT PRIMARY KEY
-- );

-- 提交事务
COMMIT;
`;

  fs.writeFileSync(filePath, template, 'utf8');
  console.log(`Created new migration file: ${fileName}`);
  return fileName;
}

// 获取命令行参数中的名称
const migrationName = process.argv[2] || '';
const newFile = createMigration(migrationName);