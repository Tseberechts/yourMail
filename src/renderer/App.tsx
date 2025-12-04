import React, { useState, useEffect, useCallback } from 'react';
import { Account, Email } from '../shared/types';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailViewer } from './components/EmailViewer';
import { AddAccountModal } from './components/AddAccountModal';
import { ComposeModal } from './components/ComposeModal';
import { ToastContainer } from './components/Toast';
import { Loader2 } from 'lucide-react';

// Custom Hooks
import { useToast } from './hooks/useToast';
import { useMail } from './hooks/useMail';

function App() {
    // --- UI State ---
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);

    const [selectedFolder, setSelectedFolder] = useState('inbox');
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

    // --- Hooks ---
    const { toasts, addToast, removeToast } = useToast();

    const handleAuthSuccess = useCallback((newAccount: Account) => {
        setSelectedAccount(newAccount.id);
    }, []);

    const handleSyncSuccess = useCallback((fetchedEmails: Email[]) => {
        // If no email is selected, or the selected one isn't in the new list, auto-select first
        // (Optional logic: currently we only auto-select if nothing is selected)
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
    } = useMail({
        selectedAccount,
        addToast,
        onAuthSuccess: handleAuthSuccess,
        onSyncSuccess: handleSyncSuccess
    });

    // Auto-select first account if loaded and none selected
    useEffect(() => {
        if (!selectedAccount && accounts.length > 0) {
            setSelectedAccount(accounts[0].id);
        }
    }, [accounts, selectedAccount]);

    useEffect(() => {
        if (selectedEmail && !selectedEmail.read) {
            // Add a small delay so if you just click through quickly it doesn't mark everything
            // Or remove timeout for instant marking.
            const timer = setTimeout(() => {
                markAsRead(selectedEmail.id);

                // Also update local selectedEmail state so the UI (like bolding) updates
                // inside the viewer if we used that prop there
                setSelectedEmail(prev => prev ? { ...prev, read: true } : null);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [selectedEmail, markAsRead]);

    // Wrapper to handle UI side-effects of deletion (clearing selection)
    const handleDeleteWrapper = async (emailId: string) => {
        if (selectedEmail?.id === emailId) {
            setSelectedEmail(null);
        }
        await deleteEmail(emailId);
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
                        onRefresh={() => {
                            fetchEmails();
                            addToast("Refreshing inbox...", 'info');
                        }}
                        isRefreshing={isLoadingEmails}
                        onDeleteEmail={handleDeleteWrapper}
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