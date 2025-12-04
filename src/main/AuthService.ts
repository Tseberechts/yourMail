import { google } from 'googleapis';
import { BrowserWindow, shell } from 'electron';
import http from 'http';
import url from 'url';
import { SecureStore } from './SecureStore';
import { AccountStore } from './AccountStore';
import { Account } from '../shared/types';
import dotenv from 'dotenv';

dotenv.config();

export class AuthService {
    private secureStore: SecureStore;
    private accountStore: AccountStore;

    constructor(secureStore: SecureStore, accountStore: AccountStore) {
        this.secureStore = secureStore;
        this.accountStore = accountStore;
    }

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
                            oauth2Client.setCredentials(tokens);

                            // 1. Fetch User Profile
                            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
                            const userInfo = await oauth2.userinfo.get();

                            const email = userInfo.data.email;
                            const name = userInfo.data.name || email;

                            if (!email) throw new Error("Could not retrieve email address.");

                            // 2. Store Secrets (Tokens) securely
                            if (tokens.access_token) {
                                this.secureStore.setSecret(`${email}:access_token`, tokens.access_token);
                            }
                            if (tokens.refresh_token) {
                                this.secureStore.setSecret(`${email}:refresh_token`, tokens.refresh_token);
                            }

                            // 3. Store Public Account Metadata
                            const newAccount: Account = {
                                id: email,
                                name: name || 'Gmail Account',
                                type: 'gmail',
                                unread: 0
                            };

                            this.accountStore.addAccount(newAccount);

                            res.end('<h1>Login Successful!</h1><p>You can close this tab and return to YourMail.</p>');

                            mainWindow.webContents.send('auth:success', newAccount);

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
                const scopes = [
                    'https://mail.google.com/',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ];
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