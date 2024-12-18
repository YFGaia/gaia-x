import { isDev } from '@/utils/common';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface Migration {
  id: number;
  version: string;
  applied_at: string;
}

export class Migrations {
  private static migrationsPath: string;

  static generateTable(db: Database.Database) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
  }

  // 获取已应用的迁移版本
  static getAppliedMigrations(
    db: Database.Database,
    callback: (appliedVersions: string[]) => void
  ) {
    const stmt = db.prepare('SELECT version FROM migrations ORDER BY id ASC').all() as Migration[];
    const appliedVersions = stmt.map((row) => row.version);
    callback(appliedVersions);
  }

  // 执行 SQL 文件
  static applyMigration(
    db: Database.Database,
    file: string,
    version: string,
    callback: (err: Error | null) => void
  ) {
    const migrationsPath = isDev()
        ? path.join(path.dirname(fileURLToPath(import.meta.url)), '../..', 'migrations')
        : path.join(process.resourcesPath, 'migrations');
    const filePath = path.join(migrationsPath, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO migrations (version) VALUES (?)').run(version);
      callback(null);
    } catch (err) {
      console.error(`执行迁移 ${file} 失败:`, err);
      return callback(err as Error);
    }
  }

  // 运行数据库迁移
  static runMigrations(db: Database.Database) {
    console.log('runMigrations');
    Migrations.getAppliedMigrations(db, (appliedVersions) => {
      // 读取 `migrations` 目录下的所有 SQL 文件
      const migrationsPath = isDev()
        ? path.join(path.dirname(fileURLToPath(import.meta.url)), '../..', 'migrations')
        : path.join(process.resourcesPath, 'migrations');
      const files = fs
        .readdirSync(migrationsPath)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      // 找出未执行的迁移文件
      const pendingMigrations = files.filter((file) => !appliedVersions.includes(file));

      if (pendingMigrations.length === 0) {
        console.log('数据库已是最新版本，无需迁移。');
        return;
      }

      console.log('需要执行的迁移:', pendingMigrations);

      // 依次执行迁移
      let index = 0;
      const next = () => {
        if (index < pendingMigrations.length) {
          const file = pendingMigrations[index];
          const version = file; // 版本号直接使用文件名
          Migrations.applyMigration(db, file, version, (err) => {
            if (!err) {
              index++;
              next();
            }
          });
        } else {
          console.log('所有迁移执行完成！');
        }
      };

      next();
    });
  }

  static removeTable(db: Database.Database) {
    db.exec(`DROP TABLE IF EXISTS migrations`);
  }
}
