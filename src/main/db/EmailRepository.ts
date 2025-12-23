import { AppDatabase } from './Database';
import { Email } from '../../shared/types';
import crypto from 'crypto';

export interface PendingAction {
    id: number;
    account_id: string;
    action_type: 'DELETE' | 'MARK_READ';
    payload: any;
}

export class EmailRepository {
    private db: AppDatabase;

    constructor(db: AppDatabase) {
        this.db = db;
    }

    saveEmails(accountId: string, folder: string, emails: Email[]) {
        const insertEmail = this.db.getDb().prepare(`
            INSERT OR IGNORE INTO emails (
                id, account_id, folder, uid, subject, from_addr, date, snippet, body, html_body, is_read
            ) VALUES (
                @id, @account_id, @folder, @uid, @subject, @from, @date, @snippet, @body, @htmlBody, @is_read
            )
        `);

        const insertAttachment = this.db.getDb().prepare(`
            INSERT INTO attachments (id, email_id, filename, content_type, size, content)
            VALUES (@id, @email_id, @filename, @content_type, @size, @content)
        `);

        const transaction = this.db.getDb().transaction(() => {
            for (const email of emails) {
                const uid = parseInt(email.id, 10);
                const dbId = `${accountId}:${folder}:${uid}`;

                insertEmail.run({
                    id: dbId,
                    account_id: accountId,
                    folder: folder,
                    uid: uid,
                    subject: email.subject,
                    from: email.from,
                    date: email.date,
                    snippet: email.snippet || email.body,
                    body: email.body,
                    htmlBody: email.htmlBody,
                    is_read: email.read ? 1 : 0
                });

                if (email.attachments) {
                    for (const att of email.attachments) {
                        insertAttachment.run({
                            id: crypto.randomUUID(),
                            email_id: dbId,
                            filename: att.filename,
                            content_type: att.contentType,
                            size: att.size,
                            content: att.content
                        });
                    }
                }
            }
        });

        transaction();
    }

    getEmails(accountId: string, folder: string): Email[] {
        const stmt = this.db.getDb().prepare(`
            SELECT * FROM emails 
            WHERE account_id = ? AND folder = ? AND is_deleted = 0
            ORDER BY uid DESC
            LIMIT 100
        `);
        const rows = stmt.all(accountId, folder) as any[];
        return this.mapRowsToEmails(rows);
    }

    // [NEW] Full Text Search using FTS5
    searchEmails(accountId: string, query: string): Email[] {
        // FTS5 MATCH syntax: "subject:query OR body:query"
        // Simple implementation: match any field
        // We join with the main table to get full data
        const stmt = this.db.getDb().prepare(`
            SELECT emails.* FROM emails 
            JOIN emails_fts ON emails.rowid = emails_fts.rowid 
            WHERE emails_fts MATCH ? AND emails.account_id = ? AND emails.is_deleted = 0
            ORDER BY date DESC
            LIMIT 50
        `);

        // Sanitize query for FTS (basic)
        // Ensure words are treated as prefixes (e.g. "inv" matches "invoice")
        const ftsQuery = `"${query}"*`;

        const rows = stmt.all(ftsQuery, accountId) as any[];
        return this.mapRowsToEmails(rows);
    }

    markAsRead(accountId: string, uid: number) {
        this.db.getDb().prepare(`
            UPDATE emails SET is_read = 1 
            WHERE account_id = ? AND uid = ?
        `).run(accountId, uid);
    }

    deleteEmail(accountId: string, uid: number) {
        this.db.getDb().prepare(`
            UPDATE emails SET is_deleted = 1 
            WHERE account_id = ? AND uid = ?
        `).run(accountId, uid);
    }

    getHighestUid(accountId: string, folder: string): number {
        const row = this.db.getDb().prepare(`
            SELECT MAX(uid) as maxUid FROM emails WHERE account_id = ? AND folder = ?
        `).get(accountId, folder) as { maxUid: number };
        return row ? row.maxUid || 0 : 0;
    }

    // --- Offline Queue Methods ---

    queueAction(accountId: string, type: 'DELETE' | 'MARK_READ', payload: any) {
        this.db.getDb().prepare(`
            INSERT INTO pending_actions (account_id, action_type, payload)
            VALUES (?, ?, ?)
        `).run(accountId, type, JSON.stringify(payload));
    }

    getPendingActions(accountId: string): PendingAction[] {
        const rows = this.db.getDb().prepare(`
            SELECT * FROM pending_actions WHERE account_id = ? ORDER BY id ASC
        `).all(accountId) as any[];

        return rows.map(r => ({
            id: r.id,
            account_id: r.account_id,
            action_type: r.action_type,
            payload: JSON.parse(r.payload)
        }));
    }

    removeAction(id: number) {
        this.db.getDb().prepare('DELETE FROM pending_actions WHERE id = ?').run(id);
    }

    private mapRowsToEmails(rows: any[]): Email[] {
        return rows.map(row => ({
            id: row.uid.toString(),
            subject: row.subject,
            from: row.from_addr,
            date: row.date,
            body: row.body,
            snippet: row.snippet,
            htmlBody: row.html_body,
            read: Boolean(row.is_read),
            tags: [],
            attachments: []
        }));
    }
}