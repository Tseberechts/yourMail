import { ImapFlow } from 'imapflow';
import { SecureStore } from './SecureStore';
import { simpleParser } from 'mailparser';
import { Email } from '../shared/types';

export class ImapService {
    private secureStore: SecureStore;

    constructor(secureStore: SecureStore) {
        this.secureStore = secureStore;
    }

    async fetchEmails(accountId: string): Promise<Email[]> {
        const accessToken = this.secureStore.getSecret(`${accountId}:access_token`);

        if (!accessToken) {
            throw new Error(`No access token found for ${accountId}`);
        }

        const client = new ImapFlow({
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
            auth: {
                user: accountId,
                accessToken: accessToken,
            },
            logger: false,
        });

        const emails: Email[] = [];

        try {
            await client.connect();
            const lock = await client.getMailboxLock('INBOX');

            try {
                // Fetch envelope (headers) and internal date
                for await (const message of client.fetch('1:*', { envelope: true, internalDate: true }, { uid: true })) {
                    const envelope = message.envelope;

                    // Use internalDate (server time) or envelope date
                    const dateObj = message.internalDate || envelope.date || new Date();

                    const email: Email = {
                        id: message.uid.toString(),
                        subject: envelope.subject || '(No Subject)',
                        from: envelope.from?.[0]?.name || envelope.from?.[0]?.address || 'Unknown',
                        // CHANGE: Store as ISO string for reliable sorting
                        date: dateObj.toISOString(),
                        body: 'Loading content...',
                        tags: [],
                        read: false
                    };

                    // Default to newest first (unshift)
                    emails.unshift(email);

                    if (emails.length >= 50) break; // Increased limit slightly
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
}