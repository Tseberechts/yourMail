import { ImapFlow } from 'imapflow';
import { google } from 'googleapis';
import { SecureStore } from '../stores/SecureStore';
import dotenv from 'dotenv';

dotenv.config();

export class ImapClientManager {
    private secureStore: SecureStore;

    constructor(secureStore: SecureStore) {
        this.secureStore = secureStore;
    }

    /**
     * Gets a fresh access token using the stored refresh token.
     */
    private async refreshAccessToken(accountId: string): Promise<string> {
        console.log(`[ImapClientManager] Refreshing token for ${accountId}...`);
        const refreshToken = this.secureStore.getSecret(`${accountId}:refresh_token`);

        if (!refreshToken) {
            throw new Error("No refresh token available. Please re-authenticate.");
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const { credentials } = await oauth2Client.refreshAccessToken();
        if (!credentials.access_token) throw new Error("Failed to refresh access token");

        // Save new token to store so future calls use it
        this.secureStore.setSecret(`${accountId}:access_token`, credentials.access_token);

        console.log(`[ImapClientManager] Token refreshed successfully.`);
        return credentials.access_token;
    }

    /**
     * Creates and Connects the client, handling 401 retries automatically.
     */
    async getConnectedClient(accountId: string): Promise<ImapFlow> {
        let accessToken = this.secureStore.getSecret(`${accountId}:access_token`);
        if (!accessToken) throw new Error(`No access token found for ${accountId}`);

        const createClient = (token: string) => new ImapFlow({
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
            auth: {
                user: accountId,
                accessToken: token,
            },
            logger: false,
        });

        let client = createClient(accessToken);

        try {
            await client.connect();
            return client;
        } catch (err: any) {
            // Check for Authentication Failure codes (Standard IMAP or Gmail specific)
            const isAuthError =
                err.authenticationFailed ||
                err.responseText?.includes('Invalid credentials') ||
                err.response?.includes('AUTHENTICATIONFAILED');

            if (isAuthError) {
                console.warn(`[ImapClientManager] Auth failed for ${accountId}. Attempting refresh...`);

                // 1. Refresh Token
                const newToken = await this.refreshAccessToken(accountId);

                // 2. Re-create client with new token
                client = createClient(newToken);

                // 3. Retry connection (let it throw if it fails again)
                await client.connect();
                return client;
            }
            throw err; // Rethrow network or other errors
        }
    }
}