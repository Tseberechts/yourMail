import React, { useState, useEffect, useCallback } from 'react';
import { Account, Email } from '../shared/types';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailViewer } from './components/EmailViewer';
import { AddAccountModal } from './components/AddAccountModal';
import { ComposeModal } from './components/ComposeModal';
import { SettingsModal } from './components/SettingsModal'; // [NEW]
import { ToastContainer } from './components/Toast';
import { Loader2 } from 'lucide-react';

import { useToast } from './hooks/useToast';
import { useMail } from './hooks/useMail';

function App() {
    // --- UI State ---
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); // [NEW]
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null); // [NEW]

    const [selectedFolder, setSelectedFolder] = useState('INBOX');
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    // --- Hooks ---
    const { toasts, addToast, removeToast } = useToast();

    const handleAuthSuccess = useCallback((newAccount: Account) => {
        setSelectedAccount(newAccount.id);
    }, []);

    const handleSyncSuccess = useCallback((fetchedEmails: Email[]) => {
        setSelectedEmail(prev => {
            if (!prev && fetchedEmails.length > 0) return fetchedEmails[0];
            return prev;
        });
    }, []);

    const {
        accounts,
        emails,
        isLoadingEmails,
        fetchEmails,
        deleteEmail,
        markAsRead,
        isSearching,
        searchEmails,
    } = useMail({
        selectedAccount,
        selectedFolder,
        addToast,
        onAuthSuccess: handleAuthSuccess,
        onSyncSuccess: handleSyncSuccess
    });

    useEffect(() => {
        if (!selectedAccount && accounts.length > 0) {
            setSelectedAccount(accounts[0].id);
        }
    }, [accounts, selectedAccount]);

    useEffect(() => {
        if (selectedEmail && !selectedEmail.read) {
            const timer = setTimeout(() => {
                markAsRead(selectedEmail.id);
                setSelectedEmail(prev => prev ? { ...prev, read: true } : null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [selectedEmail, markAsRead]);

    const handleDeleteWrapper = async (emailId: string) => {
        if (selectedEmail?.id === emailId) {
            setSelectedEmail(null);
        }
        await deleteEmail(emailId);
    };

    const currentAccountObj = accounts.find(a => a.id === selectedAccount);

    // [NEW] Handle opening settings
    const handleOpenSettings = (account: Account) => {
        setAccountToEdit(account);
        setIsSettingsOpen(true);
    };

    // [NEW] Handle saving settings
    const handleSaveSettings = async (accountId: string, signature: string) => {
        try {
            // @ts-ignore
            const result = await window.ipcRenderer.updateSignature(accountId, signature);
            if (result.success) {
                addToast('Signature updated!', 'success');
                // Trigger a "refresh" of accounts implicitly by the way useMail hooks listener works,
                // or we might need to manually trigger a re-fetch of accounts if the listener doesn't catch this update.
                // For MVP, simplistic way: reload window or we can add a method to useMail to refresh accounts.
                // Since our useMail only loads accounts on mount and on auth success, we might need a manual refresh.
                // Let's force a reload for simplicity in MVP or we update local state.
                window.location.reload();
            } else {
                addToast('Failed to update signature', 'error');
            }
        } catch (e) {
            console.error(e);
            addToast('Error saving settings', 'error');
        }
    };

    return (
        <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden font-sans relative">
            <ToastContainer toasts={toasts} onDismiss={removeToast} />

            <AddAccountModal
                isOpen={isAddAccountOpen}
                onClose={() => setIsAddAccountOpen(false)}
                onShowToast={addToast}
            />

            <ComposeModal
                isOpen={isComposeOpen}
                onClose={() => setIsComposeOpen(false)}
                fromAccount={selectedAccount}
                onShowToast={addToast}
                signature={currentAccountObj?.signature}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                account={accountToEdit}
                onSave={handleSaveSettings}
            />

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
                onOpenSettings={handleOpenSettings}
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
                        folderName={selectedFolder} // Pass path as name for header
                        onRefresh={() => {
                            fetchEmails();
                            addToast("Refreshing...", 'info');
                        }}
                        isRefreshing={isLoadingEmails || isSearching}
                        onDeleteEmail={handleDeleteWrapper}
                        onSearch={searchEmails}
                    />
                )}
                <EmailViewer
                    email={selectedEmail}
                    onDelete={handleDeleteWrapper}
                />
            </div>
        </div>
    );
}

export default App;