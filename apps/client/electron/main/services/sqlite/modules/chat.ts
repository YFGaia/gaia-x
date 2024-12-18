import { Conversation, Message, MessageItem } from '@/types/chat';
import { SqliteChatChannel, SqliteChatRequest } from '@/types/ipc/sqlite/chat';
import { dateTime } from '@/utils/date';
import Database from 'better-sqlite3';

export class ChatManager {
  private db: Database.Database;
  constructor(db: Database.Database) {
    this.db = db;
  }
  static generateTable(db: Database.Database) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            conversationId TEXT NOT NULL,
            userId TEXT NOT NULL,
            title TEXT NOT NULL,
            isDeleted INTEGER DEFAULT 0
        )
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversationId TEXT NOT NULL,
            userId TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            isDeleted INTEGER DEFAULT 0
        )
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            label TEXT NOT NULL,
            presetId TEXT NOT NULL,
            isDeleted INTEGER DEFAULT 0
        )
    `);
  }

  static removeTable(db: Database.Database) {
    db.exec(`DROP TABLE IF EXISTS chats`);
    db.exec(`DROP TABLE IF EXISTS messages`);
    db.exec(`DROP TABLE IF EXISTS conversations`);
  }

  getConversations(userId: string) {
    return this.db
      .prepare(`SELECT *, id as key FROM conversations WHERE userId = ? AND isDeleted = 0 ORDER BY updated_at DESC`)
      .all(userId);
  }

  getChats(userId: string, conversationId: string) {
    return this.db
      .prepare(
        `SELECT *, id as key FROM chats WHERE conversationId = ? AND isDeleted = 0 AND userId = ?`
      )
      .all(conversationId, userId);
  }

  getMessages(userId: string, conversationId: string){
    return this.db
      .prepare(`SELECT * FROM messages WHERE conversationId = ? AND isDeleted = 0 AND userId = ?`)
      .all(conversationId, userId);
  }

  async createConversation(request: SqliteChatRequest[SqliteChatChannel.ADD_CONVERSATION]) {
    return await this.db
      .prepare(`INSERT INTO conversations (id, userId, label, presetId, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(request.id, request.userId, request.label, request.presetId);
  }

  async updateConversation(request: SqliteChatRequest[SqliteChatChannel.UPDATE_CONVERSATION]) {
    return await this.db
      .prepare(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`)
      .run(request.id, request.userId);
  }

  async createChat(request: SqliteChatRequest[SqliteChatChannel.ADD_CHAT]) {
    return await this.db
      .prepare(`INSERT INTO chats (id, conversationId, userId, title) VALUES (?, ?, ?, ?)`)
      .run(request.id, request.conversationId, request.userId, request.title);
  }

  async createMessage(request: SqliteChatRequest[SqliteChatChannel.ADD_MESSAGE]) {
    this.updateConversation({ id: request.conversationId, userId: request.userId });
    return await this.db
      .prepare(
        `INSERT INTO messages (id, conversationId, role, userId, content) VALUES (?, ?, ?, ?, ?)`
      )
      .run(request.id, request.conversationId, request.role, request.userId, request.content);
  }

  async updateMessage(request: SqliteChatRequest[SqliteChatChannel.UPDATE_MESSAGE]) {
    return await this.db
      .prepare(`UPDATE messages SET content = ? WHERE id = ?`)
      .run(JSON.stringify(request.items), request.id);
  }

  async deleteConversation(userId: string, id: string) {
    await this.db
      .prepare(`UPDATE conversations SET isDeleted = 1 WHERE id = ? AND userId = ? `)
      .run(id, userId);
    await this.db
      .prepare(`UPDATE chats SET isDeleted = 1 WHERE conversationId = ? AND userId = ? `)
      .run(id, userId);
    await this.db
      .prepare(`UPDATE messages SET isDeleted = 1 WHERE conversationId = ? AND userId = ? `)
      .run(id, userId);
  }

  async clearConversation(userId: string) {
    await this.db.prepare(`UPDATE conversations SET isDeleted = 1 WHERE userId = ? `).run(userId);
    await this.db.prepare(`UPDATE chats SET isDeleted = 1 WHERE userId = ? `).run(userId);
    await this.db.prepare(`UPDATE messages SET isDeleted = 1 WHERE userId = ? `).run(userId);
  }

  async getConversation(userId: string, conversationId: string) {
    return await this.db
      .prepare(`SELECT * FROM conversations WHERE id = ? AND userId = ? AND isDeleted = 0`)
      .get(conversationId, userId);
  }

  async getNearlyConversation(userId: string, presetId: string): Promise<Conversation | null> {
    const conversation = (await this.db
      .prepare(
        `SELECT * FROM conversations WHERE userId = ? AND presetId = ? AND isDeleted = 0 ORDER BY id DESC LIMIT 1`
      )
      .get(userId, presetId)) as Conversation | null;
    console.log('conversation', conversation, userId, presetId);
    if (conversation) {
      return conversation;
    } else {
      return null;
    }
  }
}
