import { ImapFlow } from 'imapflow';
import { SecureStore } from '../SecureStore';
import { simpleParser } from 'mailparser';
import { Email, Mailbox } from '../../shared/types';
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
    async getMailboxes(accountId: string): Promise<Mailbox[]> {
        const client = await this.clientManager.getConnectedClient(accountId);
        const mailboxes: Mailbox[] = [];

        try {
            const list = await client.list();

            for (const box of list) {
                let type: Mailbox['type'] = 'normal';
                const specialUse = box.specialUse || '';

                if (specialUse === '\\Inbox' || box.path === 'INBOX') type = 'inbox';
                else if (specialUse === '\\Sent') type = 'sent';
                else if (specialUse === '\\Trash') type = 'trash';
                else if (specialUse === '\\Drafts') type = 'drafts';
                else if (specialUse === '\\Junk') type = 'junk';
                else if (specialUse === '\\Archive') type = 'archive'; // Gmail "All Mail"

                mailboxes.push({
                    path: box.path,
                    name: box.name,
                    delimiter: box.delimiter,
                    flags: Array.from(box.flags),
                    type
                });
            }
        } catch (err) {
            console.error("Failed to list mailboxes", err);
        } finally {
            await client.logout();
        }

        return mailboxes;
    }


    async fetchEmails(accountId: string, mailboxPath: string = 'INBOX'): Promise<{ emails: Email[], unreadCount: number }> {
        const client = await this.clientManager.getConnectedClient(accountId);

        const emails: Email[] = [];
        let unreadCount = 0;

        try {
            // 1. Select the specific mailbox
            const lock = await client.getMailboxLock(mailboxPath);
            try {
                // Get status for unread count
                const status = await client.status(mailboxPath, { unseen: true });
                unreadCount = status.unseen || 0;

                // Fetch latest 20 messages
                // '1:*' means all, but we iterate backwards usually.
                // ImapFlow fetch returns an async generator.
                // We'll just fetch the last 20 by sequence number if possible, but UID fetch is safer.
                // For MVP simplicity: fetch all headers, take last 20.
                // Optimization: In a real app, use SEARCH or fetch by range (total-20:total).

                // Fetching last 20 messages efficiently:
                // We don't know the UIDs, so we fetch the last 20 sequence numbers.
                // Since ImapFlow doesn't easily support "last 20", we use a range like '1:*'
                // and just process them. For large folders this is slow.
                // Better approach for MVP: Use search to find ALL, then slice.

                // Let's stick to the previous simple iterator for now, but apply it to the locked mailbox.
                // Note: The previous implementation iterated 1:* which starts from OLDEST.
                // We actually want NEWEST.
                // ImapFlow allows fetching in reverse? No.
                // We will fetch specific range in Phase 3. For now, fetch 1:* is okay for small test inboxes.

                for await (const message of client.fetch('1:*', { envelope: true, source: true, internalDate: true, flags: true }, { uid: true })) {
                    const email = await this.parseMessage(message); // Assuming parseMessage is made public or this is inside the class
                    emails.unshift(email); // Add to start to reverse order (newest first)
                }

                // Slice to keep only 50 newest in memory for MVP
                if (emails.length > 50) {
                    emails.length = 50;
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