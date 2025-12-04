import { safeStorage } from 'electron';
import Store from 'electron-store';

// Interface for our store schema
interface StoreSchema {
    // We store encrypted secrets as hex strings
    secrets: Record<string, string>;
}

export class SecureStore {
    private store: Store<StoreSchema>;

    constructor() {
        this.store = new Store<StoreSchema>({
            name: 'secure-config',
            defaults: {
                secrets: {}
            }
        });
    }

    /**
     * Encrypts and saves a secret key.
     * @param key The identifier for the secret (e.g., 'gemini-api-key')
     * @param value The actual secret string
     * @returns boolean - success status
     */
    setSecret(key: string, value: string): boolean {
        if (!safeStorage.isEncryptionAvailable()) {
            console.error('Encryption is not available on this OS/User session.');
            return false;
        }

        try {
            const encryptedBuffer = safeStorage.encryptString(value);
            // Convert buffer to hex string for storage
            const encryptedHex = encryptedBuffer.toString('hex');

            const secrets = this.store.get('secrets');
            this.store.set('secrets', { ...secrets, [key]: encryptedHex });
            return true;
        } catch (error) {
            console.error(`Failed to save secret for ${key}:`, error);
            return false;
        }
    }

    /**
     * Retrieves and decrypts a secret key.
     * @param key The identifier for the secret
     * @returns string | null - The decrypted secret or null if not found
     */
    getSecret(key: string): string | null {
        if (!safeStorage.isEncryptionAvailable()) {
            return null;
        }

        try {
            const secrets = this.store.get('secrets');
            const encryptedHex = secrets[key];

            if (!encryptedHex) return null;

            const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
            return safeStorage.decryptString(encryptedBuffer);
        } catch (error) {
            console.error(`Failed to retrieve secret for ${key}:`, error);
            return null;
        }
    }

    /**
     * Deletes a secret.
     */
    deleteSecret(key: string): void {
        const secrets = this.store.get('secrets');
        const { [key]: deleted, ...rest } = secrets;
        this.store.set('secrets', rest);
    }
}