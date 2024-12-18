import Database from 'better-sqlite3';
import { SqliteManager } from '..';

export class UserManager {
  private db: Database.Database;
  constructor(db: Database.Database) {
    this.db = db;
  }

  static generateTable(db: Database.Database) {
    db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                token TEXT,
                lastLogin TINYINT DEFAULT 0
            )
        `);
  }

  static removeTable(db: Database.Database) {
    db.exec(`DROP TABLE IF EXISTS users`);
  }

  getUser(userId: string) {
    return this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  }

  updateUser(userId: string, name: string, token: string) {
    this.db.exec(`UPDATE users SET lastLogin = 0`);
    return this.db
      .prepare(
        `INSERT INTO users (id, username, token, lastLogin) 
      VALUES (@id, @username, @token, @lastLogin)
      ON CONFLICT(id) DO UPDATE SET 
        username = @username,
        token = @token,
        lastLogin = @lastLogin`
      )
      .run({
        id: userId,
        username: name,
        token: token,
        lastLogin: 1
      });
  }

  logout(userId: string) {
    return this.db.prepare(`UPDATE users SET token = '' WHERE id = ?`).run(userId);
  }

  getLastUser() {
    return this.db.prepare(`SELECT * FROM users WHERE lastLogin = 1`).get();
  }
}
