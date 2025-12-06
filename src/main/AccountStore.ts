import Store from 'electron-store';
import { Account } from '../shared/types';

interface AccountSchema {
    accounts: Account[];
}

export class AccountStore {
    private store: Store<AccountSchema>;

    constructor() {
        this.store = new Store<AccountSchema>({
            name: 'accounts'
        });
    }

    getAccounts(): Account[] {
        const { accounts } = this.store.get("accounts");

        // Ensure legacy data has a signature
        return accounts.map((acc: Account) => ({
            ...acc,
            signature: acc.signature || `\n\n--\nSent with YourMail\n${acc.name}`
        }));
    }

    // [NEW] Update Signature
    updateSignature(id: string, signature: string): void {
        const { accounts } = this.store.get("accounts");
        const updatedAccounts = accounts.map((acc: Account) => {
            if (acc.id === id) {
                return { ...acc, signature };
            }
            return acc;
        });
        this.store.set("accounts", { accounts: updatedAccounts });
    }

    addAccount(account: Account): void {
        const { accounts } = this.store.get("accounts");
        if (!accounts.find((a: Account) => a.id === account.id)) {
            const updatedAccounts = [...accounts, account];
            this.store.set('accounts', { accounts: updatedAccounts });
        }
    }

    removeAccount(id: string): void {
        const { accounts } = this.store.get("accounts");
        const filtered = accounts.filter((a: Account) => a.id !== id);
        this.store.set('accounts', { accounts: filtered });
    }

    clear(): void {
        this.store.clear();
    }
}