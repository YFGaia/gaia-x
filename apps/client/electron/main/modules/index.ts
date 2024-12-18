import { setupMcp } from './mcpTool';
import { setupSession } from './session';
import { setupWindowControl } from './windowControl';
import { setupConfig } from './config';
import { setupFile } from './file';
import { setupEncryption } from './encryption';
import { SqliteManager } from '../services/sqlite';
import { setupSqlite } from './sqlite';
import { ThemeHandler } from './theme';
import { setupUtils } from './untils';
import { setupUpdate } from '../update';

export const setupModules = async () => {
  // 初始化通信模块
  await setupConfig();
  setupFile();
  setupWindowControl();
  setupSession();
  await setupMcp();
  setupEncryption();
  new ThemeHandler();
  setupSqlite();
  setupUtils();
  setupUpdate();

  // 初始化数据库
  const sqliteManager = new SqliteManager();
  // sqliteManager.removeAllTables();
  sqliteManager.initAllTables();
  sqliteManager.runMigrations();
};

export const unInstallModules = async () => {
  const sqliteManager = new SqliteManager();
  sqliteManager.removeAllTables();
}

