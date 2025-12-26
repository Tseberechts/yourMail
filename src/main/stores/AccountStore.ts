import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { Account } from '../../shared/types';

interface AccountSchema {
    accounts: Account[];
}

export class AccountStore {
    private filePath: string;
    private data: AccountSchema;

    constructor() {
        this.filePath = path.join(app.getPath('userData'), 'accounts.json');
        this.data = this.load();
    }

    private load(): AccountSchema {
        try {
            if (!fs.existsSync(this.filePath)) {
                return { accounts: [] };
            }
            const raw = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(raw);
        } catch (error) {
            console.error('Failed to load account store:', error);
            return { accounts: [] };
        }
    }

    private save(): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Failed to save account store:', error);
        }
    }

    getAccounts(): Account[] {
        // Ensure legacy data has a signature
        return this.data.accounts.map(acc => ({
            ...acc,
            signature: acc.signature || `\n\n--\nSent with YourMail\n${acc.name}`
        }));
    }

    // [NEW] Update Signature
    updateSignature(id: string, signature: string): void {
        this.data.accounts = this.data.accounts.map(acc => {
            if (acc.id === id) {
                return { ...acc, signature };
            }
            return acc;
        });
        this.save();
    }

    addAccount(account: Account): void {
        if (!this.data.accounts.find(a => a.id === account.id)) {
            this.data.accounts.push(account);
            this.save();
        }
    }

    removeAccount(id: string): void {
        this.data.accounts = this.data.accounts.filter(a => a.id !== id);
        this.save();
    }

    clear(): void {
        this.data = { accounts: [] };
        this.save();
    }
}