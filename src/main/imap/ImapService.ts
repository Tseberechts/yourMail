import { ImapFlow } from 'imapflow';
import { SecureStore } from '../SecureStore';
import { simpleParser } from 'mailparser';
import { Email } from '../../shared/types';
import { ImapClientManager } from './ImapClientManager';

export class ImapService {
    private clientManager: ImapClientManager;

    constructor(secureStore: SecureStore) {
        this.clientManager = new ImapClientManager(secureStore);
    }

    /**
     * Helper: Determine correct Trash folder path dynamically.
     */
    private async getTrashPath(client: ImapFlow): Promise<string> {
        try {
            const mailboxes = await client.list();
            const specialTrash = mailboxes.find(box => box.specialUse === '\\Trash');
            if (specialTrash) return specialTrash.path;

            const paths = mailboxes.map(b => b.path);
            if (paths.includes('[Gmail]/Trash')) return '[Gmail]/Trash';
            if (paths.includes('[Gmail]/Bin')) return '[Gmail]/Bin';
            if (paths.includes('Trash')) return 'Trash';

            return 'INBOX.Trash';
        } catch (error) {
            return '[Gmail]/Trash';
        }
    }

    /**
     * Helper: Parses a raw IMAP message into our Email type.
     */
    private async parseMessage(message: any): Promise<Email> {
        const envelope = message.envelope;
        const dateObj = message.internalDate || envelope.date || new Date();

        const parsed = await simpleParser(message.source);

        // Snippet for list view
        const plainText = parsed.text || '(No content)';
        const snippet = plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;

        // Full HTML for viewer
        const fullHtml = parsed.html || parsed.textAsHtml || `<pre>${plainText}</pre>`;

        // [NEW] Process Attachments
        const attachments = parsed.attachments.map(att => ({
            filename: att.filename || 'unnamed_file',
            contentType: att.contentType,
            size: att.size,
            // Convert Buffer to Base64 string for safe IPC transfer
            content: att.content.toString('base64'),
            checksum: att.checksum
        }));

        return {
            id: message.uid.toString(),
            subject: envelope.subject || '(No Subject)',
            from: envelope.from?.[0]?.name || envelope.from?.[0]?.address || 'Unknown',
            date: dateObj.toISOString(),
            body: snippet,
            htmlBody: fullHtml,
            tags: [],
            read: message.flags.has('\\Seen'),
            attachments: attachments
        };
    }

    async fetchEmails(accountId: string): Promise<{ emails: Email[], unreadCount: number }> {
        const client = await this.clientManager.getConnectedClient(accountId);

        const emails: Email[] = [];
        let unreadCount = 0;

        try {
            // 1. Get Unread Count
            const status = await client.status('INBOX', { unseen: true });
            unreadCount = status.unseen || 0;

            // 2. Fetch Messages
            const lock = await client.getMailboxLock('INBOX');
            try {
                for await (const message of client.fetch('1:*', { envelope: true, source: true, internalDate: true, flags: true }, { uid: true })) {
                    const email = await this.parseMessage(message);
                    emails.unshift(email);
                    if (emails.length >= 20) break;
                }
            } finally {
                lock.release();
            }
        } catch (err) {
            console.error("[ImapService] Fetch Error:", err);
            throw err;
        } finally {
            await client.logout();
        }

        return { emails, unreadCount };
    }

    async deleteEmail(accountId: string, emailUid: string): Promise<boolean> {
        const client = await this.clientManager.getConnectedClient(accountId);

        try {
            const trashPath = await this.getTrashPath(client);

            const lock = await client.getMailboxLock('INBOX');
            try {
                await client.messageMove(emailUid, trashPath, { uid: true });
            } finally {
                lock.release();
            }

            return true;
        } catch (err) {
            console.error("[ImapService] Delete Error:", err);
            throw err;
        } finally {
            await client.logout();
        }
    }

    async markAsRead(accountId: string, emailUid: string): Promise<boolean> {
        const client = await this.clientManager.getConnectedClient(accountId);

        try {
            const lock = await client.getMailboxLock('INBOX');
            try {
                await client.messageFlagsAdd(emailUid, ['\\Seen'], { uid: true });
            } finally {
                lock.release();
            }
            return true;
        } catch (err) {
            console.error("[ImapService] Mark Read Error:", err);
            throw err;
        } finally {
            await client.logout();
        }
    }
}