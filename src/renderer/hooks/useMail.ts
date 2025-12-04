import { useState, useEffect, useCallback, useRef } from 'react';
import { Account, Email } from '../../shared/types';
import { ToastType } from '../components/Toast';

interface UseMailProps {
    selectedAccount: string;
    selectedFolder: string; // [NEW]
    addToast: (msg: string, type: ToastType) => void;
    onAuthSuccess?: (account: Account) => void;
    onSyncSuccess?: (emails: Email[]) => void;
}

export const useMail = ({ selectedAccount, selectedFolder, addToast, onAuthSuccess, onSyncSuccess }: UseMailProps) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [emails, setEmails] = useState<Email[]>([]);
    const [isLoadingEmails, setIsLoadingEmails] = useState(false);

    const pendingDeletesRef = useRef<Set<string>>(new Set());

    // --- 1. Account Management ---
    useEffect(() => {
        const loadAccounts = async () => {
            try {
                // @ts-ignore
                const storedAccounts = await window.ipcRenderer.getAccounts();
                setAccounts(storedAccounts);
            } catch (e) {
                console.error("Failed to load accounts", e);
            }
        };
        loadAccounts();

        // @ts-ignore
        const removeListener = window.ipcRenderer.on('auth:success', (_event, newAccount: Account) => {
            setAccounts(prev => {
                if (prev.find(a => a.id === newAccount.id)) return prev;
                return [...prev, newAccount];
            });
            addToast(`Connected to ${newAccount.name}`, 'success');
            if (onAuthSuccess) onAuthSuccess(newAccount);
        });

        return () => {
            if (removeListener) removeListener();
        };
    }, [addToast, onAuthSuccess]);


    // --- 2. Email Syncing ---
    const fetchEmails = useCallback(async () => {
        if (!selectedAccount) return;

        setIsLoadingEmails(true);
        try {
            // @ts-ignore
            // Pass both accountId and the selected folder path
            const result = await window.ipcRenderer.syncEmails({
                accountId: selectedAccount,
                path: selectedFolder || 'INBOX'
            });

            if (result.success) {
                const validEmails = result.emails.filter((e: Email) => !pendingDeletesRef.current.has(e.id));
                setEmails(validEmails);

                // Update unread count only if we are syncing INBOX (simplification for MVP)
                if (typeof result.unreadCount === 'number' && (selectedFolder === 'INBOX' || !selectedFolder)) {
                    setAccounts(prevAccounts => prevAccounts.map(acc => {
                        if (acc.id === selectedAccount) {
                            return { ...acc, unread: result.unreadCount };
                        }
                        return acc;
                    }));
                }

                if (onSyncSuccess) onSyncSuccess(validEmails);
            } else {
                console.error("Failed to sync:", result.error);
            }
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            setIsLoadingEmails(false);
        }
    }, [selectedAccount, selectedFolder, onSyncSuccess]);

    // Auto Refresh - Re-runs when folder or account changes
    useEffect(() => {
        fetchEmails();
        const intervalId = setInterval(() => {
            fetchEmails();
        }, 60000);
        return () => clearInterval(intervalId);
    }, [fetchEmails]);


    // --- 3. Deletion Logic ---
    const deleteEmail = async (emailId: string) => {
        if (!selectedAccount) return;

        pendingDeletesRef.current.add(emailId);

        const previousEmails = [...emails];
        setEmails(prev => prev.filter(e => e.id !== emailId));

        try {
            // @ts-ignore
            const result = await window.ipcRenderer.deleteEmail(selectedAccount, emailId, selectedFolder || 'INBOX');

            if (!result.success) {
                pendingDeletesRef.current.delete(emailId);
                setEmails(previousEmails);
                addToast("Failed to delete email: " + result.error, 'error');
            } else {
                addToast("Email moved to Trash", 'success');
                setTimeout(() => {
                    pendingDeletesRef.current.delete(emailId);
                }, 8000);
            }
        } catch (error) {
            console.error("Delete error", error);
            pendingDeletesRef.current.delete(emailId);
            setEmails(previousEmails);
            addToast("An error occurred while deleting.", 'error');
        }
    };

    const markAsRead = async (emailId: string) => {
        if (!selectedAccount) return;

        setEmails(prev => prev.map(e => {
            if (e.id === emailId) return { ...e, read: true };
            return e;
        }));

        if (selectedFolder === 'INBOX' || !selectedFolder) {
            setAccounts(prev => prev.map(acc => {
                if (acc.id === selectedAccount) {
                    return { ...acc, unread: Math.max(0, acc.unread - 1) };
                }
                return acc;
            }));
        }

        try {
            // @ts-ignore
            await window.ipcRenderer.markAsRead(selectedAccount, emailId, selectedFolder || 'INBOX');
        } catch (error) {
            console.error("Failed to mark as read on server", error);
        }
    };

    return {
        accounts,
        emails,
        isLoadingEmails,
        fetchEmails,
        deleteEmail,
        markAsRead,
    };
};