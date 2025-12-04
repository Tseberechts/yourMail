import React, { useState, useEffect, useCallback } from 'react';
import { Account, Email } from '../shared/types';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailViewer } from './components/EmailViewer';
import { AddAccountModal } from './components/AddAccountModal';
import { ComposeModal } from './components/ComposeModal';
import { Loader2 } from 'lucide-react';

function App() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [selectedFolder, setSelectedFolder] = useState('inbox');

    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [isLoadingEmails, setIsLoadingEmails] = useState(false);

    // Fetch Logic
    const fetchEmails = useCallback(async () => {
        if (!selectedAccount) return;
        setIsLoadingEmails(true);
        try {
            // @ts-ignore
            const result = await window.ipcRenderer.syncEmails(selectedAccount);
            if (result.success) {
                setEmails(result.emails);
                if (!selectedEmail && result.emails.length > 0) setSelectedEmail(result.emails[0]);
            } else {
                console.error("Failed to sync:", result.error);
            }
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            setIsLoadingEmails(false);
        }
    }, [selectedAccount, selectedFolder, selectedEmail]);

    // Handle Deletion (Optimistic UI)
    const handleDeleteEmail = async (emailId: string) => {
        if (!selectedAccount) return;

        // 1. Optimistic Update: Remove from UI immediately
        const previousEmails = [...emails];
        setEmails(prev => prev.filter(e => e.id !== emailId));

        // If we deleted the currently selected email, deselect it
        if (selectedEmail?.id === emailId) {
            setSelectedEmail(null);
        }

        // 2. Call Backend
        try {
            // @ts-ignore
            const result = await window.ipcRenderer.deleteEmail(selectedAccount, emailId);
            if (!result.success) {
                // Revert on failure
                console.error("Delete failed on server, reverting UI");
                setEmails(previousEmails);
                alert("Failed to delete email: " + result.error);
            }
        } catch (error) {
            console.error("Delete error", error);
            setEmails(previousEmails);
        }
    };

    // Setup Listeners
    useEffect(() => {
        const loadAccounts = async () => {
            // @ts-ignore
            const storedAccounts = await window.ipcRenderer.getAccounts();
            setAccounts(storedAccounts);
            if (storedAccounts.length > 0) setSelectedAccount(storedAccounts[0].id);
        };
        loadAccounts();

        // @ts-ignore
        const removeListener = window.ipcRenderer.on('auth:success', (_event, newAccount: Account) => {
            setAccounts(prev => {
                if (prev.find(a => a.id === newAccount.id)) return prev;
                return [...prev, newAccount];
            });
            setSelectedAccount(newAccount.id);
        });
        return () => { if (removeListener) removeListener(); };
    }, []);

    // Auto Refresh
    useEffect(() => {
        fetchEmails();
        const intervalId = setInterval(() => { console.log("Auto-refreshing..."); fetchEmails(); }, 60000);
        return () => clearInterval(intervalId);
    }, [fetchEmails]);

    return (
        <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden font-sans relative">
            <AddAccountModal isOpen={isAddAccountOpen} onClose={() => setIsAddAccountOpen(false)} />
            <ComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} fromAccount={selectedAccount} />

            <Sidebar
                accounts={accounts}
                selectedAccountId={selectedAccount}
                onSelectAccount={setSelectedAccount}
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                onOpenAddAccount={() => setIsAddAccountOpen(true)}
                onOpenCompose={() => setIsComposeOpen(true)}
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
                        onRefresh={fetchEmails}
                        isRefreshing={isLoadingEmails}
                        onDeleteEmail={handleDeleteEmail} // <--- Pass Handler
                    />
                )}
                <EmailViewer email={selectedEmail} />
            </div>
        </div>
    );
}

export default App;