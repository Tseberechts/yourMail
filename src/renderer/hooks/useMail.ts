import { useState, useEffect, useCallback, useRef } from 'react';
import { Account, Email } from '../../shared/types';
import { ToastType } from '../components/Toast';

interface UseMailProps {
    selectedAccount: string;
    addToast: (msg: string, type: ToastType) => void;
    onAuthSuccess?: (account: Account) => void;
    onSyncSuccess?: (emails: Email[]) => void;
}

export const useMail = ({ selectedAccount, addToast, onAuthSuccess, onSyncSuccess }: UseMailProps) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [emails, setEmails] = useState<Email[]>([]);
    const [isLoadingEmails, setIsLoadingEmails] = useState(false);

    // Track IDs of emails currently being deleted to prevent them from reappearing during sync
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

        // Listen for new accounts (Auth Success)
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
            const result = await window.ipcRenderer.syncEmails(selectedAccount);
            if (result.success) {
                // Filter out pending deletes
                const validEmails = result.emails.filter((e: Email) => !pendingDeletesRef.current.has(e.id));
                setEmails(validEmails);
                if (onSyncSuccess) onSyncSuccess(validEmails);
            } else {
                console.error("Failed to sync:", result.error);
            }
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            setIsLoadingEmails(false);
        }
    }, [selectedAccount, onSyncSuccess]);

    // Auto Refresh Interval
    useEffect(() => {
        fetchEmails();
        const intervalId = setInterval(() => {
            console.log("Auto-refreshing...");
            fetchEmails();
        }, 60000);
        return () => clearInterval(intervalId);
    }, [fetchEmails]);


    // --- 3. Deletion Logic ---
    const deleteEmail = async (emailId: string) => {
        if (!selectedAccount) return;

        // A. Add to Ref immediately
        pendingDeletesRef.current.add(emailId);

        // B. Optimistic Update
        const previousEmails = [...emails];
        setEmails(prev => prev.filter(e => e.id !== emailId));

        // C. Call Backend
        try {
            // @ts-ignore
            const result = await window.ipcRenderer.deleteEmail(selectedAccount, emailId);

            if (!result.success) {
                // Revert on failure
                pendingDeletesRef.current.delete(emailId);
                setEmails(previousEmails);
                addToast("Failed to delete email: " + result.error, 'error');
            } else {
                addToast("Email moved to Trash", 'success');

                // D. Cleanup Ref after 8 seconds (giving server time to sync)
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

    return {
        accounts,
        emails,
        isLoadingEmails,
        fetchEmails,
        deleteEmail
    };
};