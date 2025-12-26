import nodemailer from 'nodemailer';
import { SecureStore } from '../stores/SecureStore';
import { Attachment } from '../../shared/types';

export class SmtpService {
    private secureStore: SecureStore;

    constructor(secureStore: SecureStore) {
        this.secureStore = secureStore;
    }

    async sendEmail(accountId: string, to: string, subject: string, body: string, attachments: Attachment[] = []): Promise<boolean> {
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

        // [NEW] Map our Attachment type to Nodemailer's expected format
        const mailAttachments = attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            encoding: 'base64',
            contentType: att.contentType
        }));

        try {
            // 3. Send the email
            await transporter.sendMail({
                from: accountId,
                to: to,
                subject: subject,
                html: body,
                attachments: mailAttachments // [NEW] Add attachments to payload
            });
            return true;
        } catch (error) {
            console.error('SMTP Error:', error);
            throw new Error('Failed to send email. Check your connection.');
        }
    }
}