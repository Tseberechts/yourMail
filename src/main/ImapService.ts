import { ImapFlow } from 'imapflow';
import { SecureStore } from './SecureStore';
import { simpleParser } from 'mailparser';
import { Email } from '../shared/types';

export class ImapService {
    private secureStore: SecureStore;

    constructor(secureStore: SecureStore) {
        this.secureStore = secureStore;
    }

    private getClient(accountId: string, accessToken: string) {
        return new ImapFlow({
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
            auth: {
                user: accountId,
                accessToken: accessToken,
            },
            logger: false,
        });
    }

    /**
     * Helper to find the correct Trash folder path dynamically.
     * Gmail can be [Gmail]/Trash, [Gmail]/Bin, or localized (e.g., Corbeille).
     */
    private async getTrashPath(client: ImapFlow): Promise<string> {
        try {
            const mailboxes = await client.list();
            // 1. Look for the folder flagged with the \Trash special attribute
            const specialTrash = mailboxes.find(box => box.specialUse === '\\Trash');
            if (specialTrash) return specialTrash.path;

            // 2. Fallbacks for common Gmail names if flags are missing
            const paths = mailboxes.map(b => b.path);
            if (paths.includes('[Gmail]/Trash')) return '[Gmail]/Trash';
            if (paths.includes('[Gmail]/Bin')) return '[Gmail]/Bin';
            if (paths.includes('Trash')) return 'Trash';

            return 'INBOX.Trash'; // Desperate fallback
        } catch (error) {
            console.warn("Failed to list mailboxes, defaulting to [Gmail]/Trash", error);
            return '[Gmail]/Trash';
        }
    }

    async fetchEmails(accountId: string): Promise<Email[]> {
        const accessToken = this.secureStore.getSecret(`${accountId}:access_token`);
        if (!accessToken) throw new Error(`No access token found for ${accountId}`);

        const client = this.getClient(accountId, accessToken);
        const emails: Email[] = [];

        try {
            await client.connect();
            const lock = await client.getMailboxLock('INBOX');

            try {
                for await (const message of client.fetch('1:*', { envelope: true, source: true, internalDate: true }, { uid: true })) {
                    const envelope = message.envelope;
                    const dateObj = message.internalDate || envelope.date || new Date();

                    const parsed = await simpleParser(message.source);
                    const plainText = parsed.text || '(No content)';
                    const snippet = plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
                    const fullHtml = parsed.html || parsed.textAsHtml || `<pre>${plainText}</pre>`;

                    const email: Email = {
                        id: message.uid.toString(),
                        subject: envelope.subject || '(No Subject)',
                        from: envelope.from?.[0]?.name || envelope.from?.[0]?.address || 'Unknown',
                        date: dateObj.toISOString(),
                        body: snippet,
                        htmlBody: fullHtml,
                        tags: [],
                        read: false
                    };

                    emails.unshift(email);
                    if (emails.length >= 20) break;
                }
            } finally {
                lock.release();
            }

            await client.logout();
        } catch (err) {
            console.error("IMAP Fetch Error:", err);
            throw err;
        }

        return emails;
    }

    async deleteEmail(accountId: string, emailUid: string): Promise<boolean> {
        const accessToken = this.secureStore.getSecret(`${accountId}:access_token`);
        if (!accessToken) throw new Error(`No access token found for ${accountId}`);

        const client = this.getClient(accountId, accessToken);

        try {
            await client.connect();

            // 1. Determine where to move the email
            const trashPath = await this.getTrashPath(client);
            console.log(`[ImapService] Moving email ${emailUid} to ${trashPath}`);

            const lock = await client.getMailboxLock('INBOX');
            try {
                // 2. Perform the Move (Copy + Delete in source)
                // Ensure we pass { uid: true } because we are using a UID, not a sequence number
                await client.messageMove(emailUid, trashPath, { uid: true });
            } finally {
                lock.release();
            }

            await client.logout();
            return true;
        } catch (err) {
            console.error("Delete Error:", err);
            throw err;
        }
    }
}