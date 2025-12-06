import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export class AppDatabase {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'yourmail.db');
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
    // WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    // Emails Table
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS emails (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                folder TEXT NOT NULL,
                uid INTEGER NOT NULL,
                subject TEXT,
                from_addr TEXT,
                date DATETIME,
                snippet TEXT,
                body TEXT,
                html_body TEXT,
                is_read INTEGER DEFAULT 0,
                is_deleted INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(account_id, folder, uid)
            );
        `);

    // Attachments Table
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY,
                email_id TEXT NOT NULL,
                filename TEXT,
                content_type TEXT,
                size INTEGER,
                content BLOB, 
                FOREIGN KEY(email_id) REFERENCES emails(id) ON DELETE CASCADE
            );
        `);

    // Index for faster lookups
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON emails(account_id, folder);`);
  }

  public getDb() {
    return this.db;
  }
}