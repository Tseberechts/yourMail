import React, { useState, useEffect } from 'react';
import { Account, Email } from '../shared/types';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailViewer } from './components/EmailViewer';
import { AddAccountModal } from './components/AddAccountModal';

const MOCK_EMAILS: Email[] = [
    {
        id: 'e1',
        subject: 'Welcome to YourMail',
        from: 'Team YourMail',
        date: '10:00 AM',
        body: 'Welcome to YourMail. Connect your Gmail account to get started!',
        tags: ['welcome'],
        read: false,
    },
];

function App() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [selectedFolder, setSelectedFolder] = useState('inbox');
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(MOCK_EMAILS[0]);

    useEffect(() => {
        const loadAccounts = async () => {
            // @ts-ignore
            const storedAccounts = await window.ipcRenderer.getAccounts();
            setAccounts(storedAccounts);
            if (storedAccounts.length > 0) {
                setSelectedAccount(storedAccounts[0].id);
            }
        };
        loadAccounts();

        // @ts-ignore
        const removeListener = window.ipcRenderer.on('auth:success', (_event, newAccount: Account) => {
            setAccounts(prev => {
                if (prev.find(a => a.id === newAccount.id)) return prev;
                return [...prev, newAccount];
            });
            if (!selectedAccount) setSelectedAccount(newAccount.id);
        });

        return () => {
            removeListener();
        };
    }, [selectedAccount]);

    return (
        <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden font-sans relative">
            <AddAccountModal isOpen={isAddAccountOpen} onClose={() => setIsAddAccountOpen(false)} />

            <Sidebar
                accounts={accounts}
                selectedAccountId={selectedAccount}
                onSelectAccount={setSelectedAccount}
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                onOpenAddAccount={() => setIsAddAccountOpen(true)}
            />

            <EmailList
                emails={accounts.length > 0 ? MOCK_EMAILS : []}
                selectedEmailId={selectedEmail?.id || null}
                onSelectEmail={setSelectedEmail}
                folderName={selectedFolder}
            />

            <EmailViewer email={selectedEmail} />
        </div>
    );
}

export default App;