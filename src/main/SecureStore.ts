import { safeStorage } from "electron";
import Store from "electron-store";

// The store schema is a record of encrypted hex strings.
// The key is the secret's identifier (e.g., 'gemini-api-key').
type StoreSchema = Record<string, string>;

export class SecureStore {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: "secure-config",
      // It's good practice to provide defaults, even if empty.
      defaults: {},
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
      console.error("Encryption is not available on this OS/User session.");
      return false;
    }

    try {
      const encryptedBuffer = safeStorage.encryptString(value);
      const encryptedHex = encryptedBuffer.toString("hex");
      this.store.set(key, encryptedHex);
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
      const encryptedHex = this.store.get(key);

      if (!encryptedHex) return null;

      const encryptedBuffer = Buffer.from(encryptedHex, "hex");
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
    this.store.delete(key as keyof StoreSchema);
  }

  /**
   * Clears all stored secrets.
   */
  clear(): void {
    this.store.clear();
  }
}
