import { AppDatabase } from './Database';
import { Email, Attachment } from '../../shared/types';
import crypto from 'crypto';

export class EmailRepository {
  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  // Insert or Ignore (skip if exists)
  // In Phase 3.5 we will change this to Upsert to handle flag updates
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
        // Ensure we have a persistent ID. If IMAP gives us one, use it, else generate.
        // We use account+folder+uid as a logical key usually, but here we store a generated ID
        // or the one passed from the service.

        // Parse the numeric UID from the ID if it was stringified "uid"
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
          snippet: email.body, // The short text body
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
              content: att.content // Base64 string stored as text is fine for SQLite
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

    return rows.map(row => ({
      id: row.uid.toString(), // The UI expects the string UID
      subject: row.subject,
      from: row.from_addr,
      date: row.date,
      body: row.snippet,
      htmlBody: row.html_body,
      read: Boolean(row.is_read),
      tags: [],
      // Fetch attachments lazily? For MVP we just return empty array or fetch them if needed
      // To keep it fast, let's fetch count or small metadata only
      attachments: []
    }));
  }

  markAsRead(accountId: string, uid: number) {
    this.db.getDb().prepare(`
            UPDATE emails SET is_read = 1 
            WHERE account_id = ? AND uid = ?
        `).run(accountId, uid);
  }

  deleteEmail(accountId: string, uid: number) {
    // Soft delete
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
}