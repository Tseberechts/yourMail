import { useCallback, useEffect, useRef, useState } from "react";
import { Account, Email } from "../../shared/types";
import { ToastType } from "../components/Toast";

interface UseMailProps {
  selectedAccount: string;
  selectedFolder: string;
  addToast: (msg: string, type: ToastType) => void;
  onSyncSuccess?: (emails: Email[]) => void;
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
}

export const useMail = ({
  selectedAccount,
  selectedFolder,
  addToast,
  onSyncSuccess,
  setAccounts,
}: UseMailProps) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // [NEW] Search State
  const [isSearching, setIsSearching] = useState(false);

  const pendingDeletesRef = useRef<Set<string>>(new Set());

  // --- Fetch Logic ---
  const fetchEmails = useCallback(async () => {
    if (!selectedAccount) return;

    const path = selectedFolder || "INBOX";

    // 1. FAST: Load from Local DB immediately
    try {
      // @ts-ignore
      const localResult = await window.ipcRenderer.getFromDb(
        selectedAccount,
        path,
      );

      if (localResult.success && Array.isArray(localResult.emails)) {
        // Remove pending deletes from view
        const validLocalEmails = localResult.emails.filter(
          (e: Email) => !pendingDeletesRef.current.has(e.id),
        );

        // If we found emails locally, show them immediately
        if (validLocalEmails.length > 0) {
          setEmails(validLocalEmails);
        }
      }
    } catch (err) {
      console.warn("Failed to load local emails:", err);
    }

    // 2. SLOW: Sync from Server (Background)
    // Only show loading spinner if we have NO emails to show yet
    // This prevents the "blank screen" feel on startup
    setEmails(currentEmails => {
      if (currentEmails.length === 0) setIsLoadingEmails(true);
      return currentEmails;
    });
    
    setIsSyncing(true);

    try {
      // @ts-ignore
      const result = await window.ipcRenderer.syncEmails({
        accountId: selectedAccount,
        path: path,
      });

      if (result.success) {
        const validEmails = result.emails.filter(
          (e: Email) => !pendingDeletesRef.current.has(e.id),
        );
        setEmails(validEmails);

        if (typeof result.unreadCount === "number" && path === "INBOX") {
          setAccounts(prevAccounts =>
            prevAccounts.map(acc => {
              if (acc.id === selectedAccount) {
                return { ...acc, unread: result.unreadCount };
              }
              return acc;
            }),
          );
        }
        if (onSyncSuccess) onSyncSuccess(validEmails);
      } else {
        console.error("Failed to sync:", result.error);
      }
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsLoadingEmails(false);
      setIsSyncing(false);
    }
  }, [selectedAccount, selectedFolder, onSyncSuccess, setAccounts]);

  // --- Search Logic ---
  const searchEmails = useCallback(
    async (query: string) => {
      if (!query) {
        fetchEmails(); // Reset to normal view
        return;
      }

      setIsSearching(true);
      try {
        // @ts-ignore
        const result = await window.ipcRenderer.searchEmails(
          selectedAccount,
          query,
        );
        if (result.success) {
          setEmails(result.emails);
        }
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsSearching(false);
      }
    },
    [selectedAccount, fetchEmails],
  );

  // Auto Refresh
  useEffect(() => {
    fetchEmails();
    const intervalId = setInterval(() => {
      fetchEmails();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [fetchEmails]);

  // --- Actions ---
  const deleteEmail = async (emailId: string) => {
    if (!selectedAccount) return;
    pendingDeletesRef.current.add(emailId);
    const previousEmails = [...emails];
    setEmails(prev => prev.filter(e => e.id !== emailId));

    try {
      // @ts-ignore
      const result = await window.ipcRenderer.deleteEmail(
        selectedAccount,
        emailId,
        selectedFolder || "INBOX",
      );
      if (!result.success) {
        pendingDeletesRef.current.delete(emailId);
        setEmails(previousEmails);
        addToast("Failed to delete email: " + result.error, "error");
      } else {
        addToast("Email moved to Trash", "success");
        setTimeout(() => {
          pendingDeletesRef.current.delete(emailId);
        }, 8000);
      }
    } catch (error) {
      console.error("Delete error", error);
      pendingDeletesRef.current.delete(emailId);
      setEmails(previousEmails);
      addToast("An error occurred while deleting.", "error");
    }
  };

  const markAsRead = async (emailId: string) => {
    if (!selectedAccount) return;
    setEmails(prev =>
      prev.map(e => {
        if (e.id === emailId) return { ...e, read: true };
        return e;
      }),
    );
    // @ts-ignore
    await window.ipcRenderer.markAsRead(
      selectedAccount,
      emailId,
      selectedFolder || "INBOX",
    );
  };

  return {
    emails,
    isLoadingEmails,
    isSyncing,
    isSearching,
    fetchEmails,
    searchEmails,
    deleteEmail,
    markAsRead,
  };
};
