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
                // We fetch 'source' which is the raw MIME buffer
                for await (const message of client.fetch('1:*', { envelope: true, source: true, internalDate: true }, { uid: true })) {
                    const envelope = message.envelope;
                    const dateObj = message.internalDate || envelope.date || new Date();

                    // PARSING LOGIC:
                    // message.source is a Buffer. We pass it to mailparser.
                    const parsed = await simpleParser(message.source);

                    // 1. Text Snippet (for Sidebar)
                    // We take the plain text and slice it for a preview
                    const plainText = parsed.text || '(No content)';
                    const snippet = plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;

                    // 2. HTML Body (for Viewer)
                    // Prefer HTML, fall back to textAsHtml, or just plain text
                    const fullHtml = parsed.html || parsed.textAsHtml || `<pre>${plainText}</pre>`;

                    const email: Email = {
                        id: message.uid.toString(),
                        subject: envelope.subject || '(No Subject)',
                        from: envelope.from?.[0]?.name || envelope.from?.[0]?.address || 'Unknown',
                        date: dateObj.toISOString(),
                        body: snippet,
                        htmlBody: fullHtml, // Store the full content
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
}