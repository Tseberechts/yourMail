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
        this.db.pragma('journal_mode = WAL');

        // 1. Main Emails Table
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

        // 2. Full Text Search (FTS5) Virtual Table
        // We only index fields we want to search: subject, sender, and body content
        this.db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
                subject, 
                from_addr, 
                snippet, 
                body, 
                content='emails', 
                content_rowid='rowid'
            );
        `);

        // 3. Triggers to keep FTS synced with Emails table automatically
        this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS emails_ai AFTER INSERT ON emails BEGIN
              INSERT INTO emails_fts(rowid, subject, from_addr, snippet, body) VALUES (new.rowid, new.subject, new.from_addr, new.snippet, new.body);
            END;
            CREATE TRIGGER IF NOT EXISTS emails_ad AFTER DELETE ON emails BEGIN
              INSERT INTO emails_fts(emails_fts, rowid, subject, from_addr, snippet, body) VALUES('delete', old.rowid, old.subject, old.from_addr, old.snippet, old.body);
            END;
            CREATE TRIGGER IF NOT EXISTS emails_au AFTER UPDATE ON emails BEGIN
              INSERT INTO emails_fts(emails_fts, rowid, subject, from_addr, snippet, body) VALUES('delete', old.rowid, old.subject, old.from_addr, old.snippet, old.body);
              INSERT INTO emails_fts(rowid, subject, from_addr, snippet, body) VALUES (new.rowid, new.subject, new.from_addr, new.snippet, new.body);
            END;
        `);

        // 4. Attachments
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

        // 5. Offline Action Queue
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS pending_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT NOT NULL,
                action_type TEXT NOT NULL, -- 'DELETE', 'MARK_READ'
                payload TEXT NOT NULL,     -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON emails(account_id, folder);`);
    }

    public getDb() {
        return this.db;
    }
}