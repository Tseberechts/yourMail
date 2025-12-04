import React, { useState, useEffect } from 'react';
import { Account, Email } from '../shared/types';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailViewer } from './components/EmailViewer';
import { AddAccountModal } from './components/AddAccountModal';
import { Loader2 } from 'lucide-react';

function App() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [selectedFolder, setSelectedFolder] = useState('inbox');

    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [isLoadingEmails, setIsLoadingEmails] = useState(false);

    // 1. Load Accounts on Startup
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

        // Listen for new accounts
        // @ts-ignore
        const removeListener = window.ipcRenderer.on('auth:success', (_event, newAccount: Account) => {
            setAccounts(prev => {
                if (prev.find(a => a.id === newAccount.id)) return prev;
                return [...prev, newAccount];
            });
            setSelectedAccount(newAccount.id);
        });

        return () => {
            if (removeListener) removeListener();
        };
    }, []);

    // 2. Fetch Emails when Selected Account Changes
    useEffect(() => {
        if (!selectedAccount) return;

        const fetchEmails = async () => {
            setIsLoadingEmails(true);
            setEmails([]); // Clear previous view
            try {
                console.log("Fetching emails for:", selectedAccount);
                // @ts-ignore
                const result = await window.ipcRenderer.syncEmails(selectedAccount);
                if (result.success) {
                    setEmails(result.emails);
                    if (result.emails.length > 0) setSelectedEmail(result.emails[0]);
                } else {
                    console.error("Failed to sync:", result.error);
                }
            } catch (e) {
                console.error("Sync error:", e);
            } finally {
                setIsLoadingEmails(false);
            }
        };

        fetchEmails();
    }, [selectedAccount, selectedFolder]); // Re-run if account or folder changes

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

            <div className="flex flex-1 overflow-hidden">
                {isLoadingEmails && emails.length === 0 ? (
                    <div className="w-80 flex items-center justify-center border-r border-gray-700 bg-gray-900">
                        <Loader2 className="animate-spin text-sky-500" />
                    </div>
                ) : (
                    <EmailList
                        emails={emails}
                        selectedEmailId={selectedEmail?.id || null}
                        onSelectEmail={setSelectedEmail}
                        folderName={selectedFolder}
                    />
                )}

                <EmailViewer email={selectedEmail} />
            </div>
        </div>
    );
}

export default App;