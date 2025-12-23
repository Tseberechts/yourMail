import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Account, Email } from "../shared/types";
import { Sidebar } from "./components/Sidebar";
import { EmailList, SortOption, FilterState } from "./components/EmailList";
import { EmailViewer } from "./components/EmailViewer";
import { AddAccountModal } from "./components/AddAccountModal";
import { ComposeModal } from "./components/ComposeModal";
import { AccountSettingsModal } from "./components/AccountSettingsModal";
import { GlobalSettingsModal } from "./components/GlobalSettingsModal";
import { ToastContainer } from "./components/Toast";
import { Loader2 } from "lucide-react";

import { useToast } from "./hooks/useToast";
import { useMail } from "./hooks/useMail";

function App() {
  // --- UI State ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  // [UPDATED] Lifted AI Model State
  const [aiModel, setAiModel] = useState(
    () => localStorage.getItem("ym_ai_model") || "gemini-2.5-flash",
  );

  // [NEW] Lifted state for sorting and filtering
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [filters, setFilters] = useState<FilterState>({
    unread: false,
    hasAttachments: false,
  });

  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

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
    isSyncing,
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
    onSyncSuccess: handleSyncSuccess,
  });

  // [NEW] Computed emails
  const filteredAndSortedEmails = useMemo(() => {
    let result = [...emails];

    // Apply Filters
    if (filters.unread) {
      result = result.filter(email => !email.read);
    }
    if (filters.hasAttachments) {
      result = result.filter(email => email.attachments && email.attachments.length > 0);
    }

    // Apply Sort
    switch (sortOption) {
      case "date-desc":
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case "date-asc":
        return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case "sender-asc":
        return result.sort((a, b) => a.from.localeCompare(b.from));
      case "sender-desc":
        return result.sort((a, b) => b.from.localeCompare(a.from));
      case "unread":
        return result.sort((a, b) => {
          if (a.read === b.read) {
             // Secondary sort by date
             return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return a.read ? 1 : -1;
        });
      default:
        return result;
    }
  }, [emails, sortOption, filters]);

  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  useEffect(() => {
    if (selectedEmail && !selectedEmail.read) {
      const timer = setTimeout(() => {
        markAsRead(selectedEmail.id);
        setSelectedEmail(prev => (prev ? { ...prev, read: true } : null));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedEmail, markAsRead]);

  const handleDeleteWrapper = async (emailId: string) => {
    // [UPDATED] Auto-select next email
    if (selectedEmail?.id === emailId) {
      const currentIndex = filteredAndSortedEmails.findIndex(e => e.id === emailId);
      if (currentIndex !== -1) {
        // Try next email, else previous
        const nextEmail = filteredAndSortedEmails[currentIndex + 1] || filteredAndSortedEmails[currentIndex - 1] || null;
        setSelectedEmail(nextEmail);
      } else {
        setSelectedEmail(null);
      }
    }
    await deleteEmail(emailId);
  };

  const currentAccountObj = accounts.find(a => a.id === selectedAccount);

  const handleOpenAccountSettings = (account: Account) => {
    setAccountToEdit(account);
    setIsAccountSettingsOpen(true);
  };

  const handleOpenGlobalSettings = () => {
    setIsGlobalSettingsOpen(true);
  };

  const handleSaveAccountSettings = async (
    accountId: string,
    data: { signature: string; name: string },
  ) => {
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.updateSignature(
        accountId,
        data.signature,
      );
      if (result.success) {
        addToast("Settings updated!", "success");
        window.location.reload();
      } else {
        addToast("Failed to update settings", "error");
      }
    } catch (e) {
      console.error(e);
      addToast("Error saving settings", "error");
    }
  };

  const handleRemoveAccount = (accountId: string) => {
    if (confirm("Are you sure you want to remove this account?")) {
      addToast("Account removal coming in next update", "info");
      setIsAccountSettingsOpen(false);
    }
  };

  // [UPDATED] Handler for global settings updates
  const handleSaveGlobalSettings = (newModel: string) => {
    setAiModel(newModel);
    // Persist is handled inside the modal, but updating state here triggers re-render
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

      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        account={accountToEdit}
        onSave={handleSaveAccountSettings}
        onRemove={handleRemoveAccount}
      />

      {/* [UPDATED] Pass model state and setter */}
      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        onShowToast={addToast}
        currentAiModel={aiModel}
        onUpdateAiModel={handleSaveGlobalSettings}
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
        onOpenSettings={handleOpenAccountSettings}
        onOpenGlobalSettings={handleOpenGlobalSettings}
      />

      <div className="flex flex-1 overflow-hidden">
        {isLoadingEmails && emails.length === 0 ? (
          <div className="w-80 flex items-center justify-center border-r border-gray-700 bg-gray-900">
            <Loader2 className="animate-spin text-sky-500" />
          </div>
        ) : (
          <EmailList
            emails={filteredAndSortedEmails}
            selectedEmailId={selectedEmail?.id || null}
            onSelectEmail={setSelectedEmail}
            folderName={selectedFolder}
            onRefresh={() => {
              fetchEmails();
              addToast("Refreshing...", "info");
            }}
            isRefreshing={isLoadingEmails || isSearching || isSyncing}
            onDeleteEmail={handleDeleteWrapper}
            onSearch={searchEmails}
            sortOption={sortOption}
            onSortChange={setSortOption}
            filters={filters}
            onFilterChange={setFilters}
          />
        )}
        {/* [UPDATED] Pass aiModel down to viewer */}
        <EmailViewer
          email={selectedEmail}
          onDelete={handleDeleteWrapper}
          aiModel={aiModel}
        />
      </div>
    </div>
  );
}

export default App;
