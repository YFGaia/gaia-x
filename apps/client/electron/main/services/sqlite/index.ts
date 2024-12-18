import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { modules } from './modules';
import { Migrations } from './modules/migrations';

export class SqliteManager {
  public db: Database.Database;
  private static instance: SqliteManager;

  constructor() {
    const dbFile: string = import.meta.env.VITE_DB_FILE;
    const showLog: boolean = import.meta.env.VITE_SHOW_LOG;
    const dbPath = path.join(app.getPath('userData'), dbFile);
    
    // 带执行时间监控的日志函数
    const sqlTimingLogger = (() => {
      const queries: Record<string, { count: number, time: number }> = {};
      let lastQuery: { sql: string, startTime: number } | null = null;
      
      return (message: unknown) => {
        const now = performance.now();
        
        if (lastQuery) {
          const executionTime = now - lastQuery.startTime;
          if (!queries[lastQuery.sql]) {
            queries[lastQuery.sql] = { count: 0, time: 0 };
          }
          queries[lastQuery.sql].count++;
          queries[lastQuery.sql].time += executionTime;
          
          console.log(`[SQL LOG] (${executionTime.toFixed(2)}ms) ${message}`);
          
          // 每100条SQL语句输出一次统计信息
          if (Object.keys(queries).reduce((sum, key) => sum + queries[key].count, 0) % 100 === 0) {
            console.log('[SQL STATS] ======================================');
            Object.entries(queries)
              .sort((a, b) => b[1].time - a[1].time)
              .slice(0, 5)
              .forEach(([sql, stats]) => {
                console.log(`[SQL STATS] Query executed ${stats.count} times, total: ${stats.time.toFixed(2)}ms, avg: ${(stats.time / stats.count).toFixed(2)}ms`);
                console.log(`[SQL STATS] ${sql}`);
              });
            console.log('[SQL STATS] ======================================');
          }
        }
        
        lastQuery = { sql: message as string, startTime: now };
      };
    })();
    
    this.db = new Database(dbPath, { 
      verbose: showLog ? sqlTimingLogger : undefined 
    });
  }

  static getInstance() {
    if (!SqliteManager.instance) {
      SqliteManager.instance = new SqliteManager();
    }
    return SqliteManager.instance;
  }

  initAllTables() {
    for (const Module of modules) {
      if (typeof Module.generateTable === 'function') {
        Module.generateTable(this.db);
      }
    }
  }

  removeAllTables() {
    for (const Module of modules) {
      if (typeof Module.removeTable === 'function') {
        Module.removeTable(this.db);
      }
    }
  }
  
  runMigrations() {
    Migrations.runMigrations(this.db);
  }
}
