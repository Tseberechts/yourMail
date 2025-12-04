import { google } from 'googleapis';
import { BrowserWindow, shell } from 'electron';
import http from 'http';
import url from 'url';
import { SecureStore } from './SecureStore';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export class AuthService {
    private secureStore: SecureStore;

    constructor(secureStore: SecureStore) {
        this.secureStore = secureStore;
    }

    /**
     * Starts the OAuth2 flow for Gmail.
     */
    async startGmailAuth(mainWindow: BrowserWindow): Promise<boolean> {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error('Google Credentials missing. Please check your .env file.');
        }

        return new Promise((resolve, reject) => {
            const oauth2Client = new google.auth.OAuth2(
                clientId,
                clientSecret,
                'http://localhost:3000/oauth2callback'
            );

            const server = http.createServer(async (req, res) => {
                try {
                    if (req.url && req.url.includes('/oauth2callback')) {
                        const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
                        const code = qs.get('code');

                        if (code) {
                            const { tokens } = await oauth2Client.getToken(code);

                            if (tokens.access_token) {
                                this.secureStore.setSecret('gmail_access_token', tokens.access_token);
                            }
                            if (tokens.refresh_token) {
                                this.secureStore.setSecret('gmail_refresh_token', tokens.refresh_token);
                            }

                            res.end('<h1>Login Successful!</h1><p>You can close this tab and return to YourMail.</p>');
                            mainWindow.webContents.send('auth:success', { type: 'gmail', email: 'user@example.com' });

                            server.close();
                            resolve(true);
                        }
                    }
                } catch (e) {
                    res.end('Authentication failed.');
                    server.close();
                    reject(e);
                }
            });

            server.listen(3000, () => {
                const scopes = ['https://mail.google.com/'];
                const authUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: scopes,
                });
                shell.openExternal(authUrl);
            });

            setTimeout(() => {
                if (server.listening) {
                    server.close();
                    reject(new Error("Timeout waiting for user login"));
                }
            }, 5 * 60 * 1000);
        });
    }
}