import nodemailer from 'nodemailer';
import { SecureStore } from './SecureStore';

export class SmtpService {
    private secureStore: SecureStore;

    constructor(secureStore: SecureStore) {
        this.secureStore = secureStore;
    }

    async sendEmail(accountId: string, to: string, subject: string, body: string): Promise<boolean> {
        // 1. Get the same token used for reading emails
        const accessToken = this.secureStore.getSecret(`${accountId}:access_token`);

        if (!accessToken) {
            throw new Error(`No access token found for ${accountId}. Please reconnect the account.`);
        }

        // 2. Configure Transporter for Gmail OAuth2
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: accountId,
                accessToken: accessToken,
            },
        });

        try {
            // 3. Send the email
            await transporter.sendMail({
                from: accountId,
                to: to,
                subject: subject,
                html: body, // We assume the body is HTML (or plain text, which works in HTML field too)
            });
            return true;
        } catch (error) {
            console.error('SMTP Error:', error);
            throw new Error('Failed to send email. Check your connection.');
        }
    }
}