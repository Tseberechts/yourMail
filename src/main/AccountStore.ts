import Store from 'electron-store';
import { Account } from '../shared/types';

interface AccountSchema {
    accounts: Account[];
}

export class AccountStore {
    private store: Store<AccountSchema>;

    constructor() {
        this.store = new Store<AccountSchema>({
            name: 'accounts',
            defaults: {
                accounts: []
            }
        });
    }

    getAccounts(): Account[] {
        return this.store.get('accounts');
    }

    addAccount(account: Account): void {
        const accounts = this.store.get('accounts');
        // Prevent duplicates based on ID (email)
        if (!accounts.find(a => a.id === account.id)) {
            accounts.push(account);
            this.store.set('accounts', accounts);
        }
    }

    removeAccount(id: string): void {
        const accounts = this.store.get('accounts');
        const filtered = accounts.filter(a => a.id !== id);
        this.store.set('accounts', filtered);
    }
}