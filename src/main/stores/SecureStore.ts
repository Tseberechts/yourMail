import {app, safeStorage} from 'electron';
import path from 'path';
import fs from 'fs';

// Define the shape of our secrets object
type SecretsMap = Record<string, string>;

interface StoreSchema {
    secrets: SecretsMap;
}

export class SecureStore {
    private filePath: string;
    private data: StoreSchema;

    constructor() {
        this.filePath = path.join(app.getPath('userData'), 'secure-config.json');
        this.data = this.load();
    }

    private load(): StoreSchema {
        try {
            if (!fs.existsSync(this.filePath)) {
                return { secrets: {} };
            }
            const raw = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(raw);
        } catch (error) {
            console.error('Failed to load secure store:', error);
            return { secrets: {} };
        }
    }

    private save(): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Failed to save secure store:', error);
        }
    }

    /**
     * Encrypts and saves a secret key.
     */
    setSecret(key: string, value: string): boolean {
        if (!safeStorage.isEncryptionAvailable()) {
            console.error('Encryption is not available on this OS/User session.');
            return false;
        }

        try {
            const encryptedBuffer = safeStorage.encryptString(value);
            this.data.secrets[key] = encryptedBuffer.toString('hex');
            this.save();

            return true;
        } catch (error) {
            console.error(`Failed to save secret for ${key}:`, error);
            return false;
        }
    }

    /**
     * Retrieves and decrypts a secret key.
     */
    getSecret(key: string): string | null {
        if (!safeStorage.isEncryptionAvailable()) {
            return null;
        }

        try {
            const encryptedHex = this.data.secrets[key];
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
        if (this.data.secrets[key]) {
            delete this.data.secrets[key];
            this.save();
        }
    }

    /**
     * Clears all stored secrets.
     */
    clear(): void {
        this.data = { secrets: {} };
        this.save();
    }
}