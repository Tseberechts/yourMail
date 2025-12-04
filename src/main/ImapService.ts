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
        // 1. Retrieve the Access Token
        const accessToken = this.secureStore.getSecret(`${accountId}:access_token`);

        if (!accessToken) {
            throw new Error(`No access token found for ${accountId}`);
        }

        // 2. Configure the IMAP Client
        const client = new ImapFlow({
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
            auth: {
                user: accountId,
                accessToken: accessToken,
            },
            logger: false, // Turn off logging for production
        });

        const emails: Email[] = [];

        try {
            // 3. Connect
            await client.connect();

            // 4. Open Inbox
            const lock = await client.getMailboxLock('INBOX');

            try {
                // 5. Fetch latest 20 emails
                // fetchOne is an async generator
                for await (const message of client.fetch('1:*', { envelope: true, source: true }, { uid: true })) {
                    // In a real app, we'd parse this more robustly.
                    // For now, we manually map envelope data to our Email type
                    const envelope = message.envelope;

                    // Basic parsing
                    const email: Email = {
                        id: message.uid.toString(),
                        subject: envelope.subject || '(No Subject)',
                        from: envelope.from?.[0]?.name || envelope.from?.[0]?.address || 'Unknown',
                        date: envelope.date?.toLocaleString() || new Date().toISOString(),
                        body: 'Loading content...', // We fetch body on demand usually, or parse 'source' here
                        tags: [],
                        read: false
                    };

                    // Prepend to array to show newest first
                    emails.unshift(email);

                    // Limit to 20 for this demo
                    if (emails.length >= 20) break;
                }
            } finally {
                lock.release();
            }

            await client.logout();
        } catch (err) {
            console.error("IMAP Fetch Error:", err);
            // In a real app, if this fails with "Authentication failed",
            // we would trigger the token refresh flow here.
            throw err;
        }

        return emails;
    }
}