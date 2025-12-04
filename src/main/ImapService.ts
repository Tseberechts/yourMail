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
            const lock = await client.getMailboxLock('INBOX');
            try {
                // Move to Trash (Gmail specific standard)
                // If this were generic IMAP, we might just set \Deleted flag
                await client.messageMove(emailUid, '[Gmail]/Trash', { uid: true });
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