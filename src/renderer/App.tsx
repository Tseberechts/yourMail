import React, { useCallback, useEffect, useState } from "react";
import { Account, Email } from "../shared/types";
import { Sidebar } from "./components/Sidebar";
import { EmailList } from "./components/EmailList";
import { EmailViewer } from "./components/EmailViewer";
import { AddAccountModal } from "./components/AddAccountModal";
import { ComposeModal } from "./components/ComposeModal";
import { AccountSettingsModal } from "./components/AccountSettingsModal";
import { GlobalSettingsModal } from "./components/GlobalSettingsModal";
import { ToastContainer } from "./components/Toast";
import { Loader2 } from "lucide-react";
import { SyncProgress } from "./components/SyncProgress";

import { useToast } from "./hooks/useToast";
import { useMail } from "./hooks/useMail";
import { useAuth } from "./hooks/useAuth";
import { useEmailFilterSort } from "./hooks/useEmailFilterSort";
import { useEmailSelection } from "./hooks/useEmailSelection";
import { useAppModals } from "./hooks/useAppModals";

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [aiModel, setAiModel] = useState(
    () => localStorage.getItem("ym_ai_model") || "gemini-2.5-flash",
  );

  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const { toasts, addToast, removeToast } = useToast();

  // --- Hooks ---
  const {
    isAddAccountOpen,
    setIsAddAccountOpen,
    isComposeOpen,
    setIsComposeOpen,
    isAccountSettingsOpen,
    setIsAccountSettingsOpen,
    isGlobalSettingsOpen,
    setIsGlobalSettingsOpen,
    accountToEdit,
    handleOpenAccountSettings,
    handleOpenGlobalSettings,
    handleSaveAccountSettings,
    handleRemoveAccount,
  } = useAppModals({ addToast });

  const handleAuthSuccess = useCallback((newAccount: Account) => {
    setSelectedAccount(newAccount.id);
  }, []);

  const { accounts, setAccounts } = useAuth({
    addToast,
    onAuthSuccess: handleAuthSuccess,
  });

  const [syncSelectedEmail, setSyncSelectedEmail] = useState<Email | null>(null);

  const handleSyncSuccess = useCallback((fetchedEmails: Email[]) => {
    if (fetchedEmails.length > 0) {
        setSyncSelectedEmail(fetchedEmails[0]);
    }
  }, []);

  const {
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
    onSyncSuccess: handleSyncSuccess,
    setAccounts,
  });

  const {
    sortOption,
    setSortOption,
    filters,
    setFilters,
    filteredAndSortedEmails,
  } = useEmailFilterSort(emails);

  const {
    selectedEmail,
    setSelectedEmail,
    handleDeleteWrapper,
  } = useEmailSelection({
    filteredAndSortedEmails,
    markAsRead,
    deleteEmail,
    selectedFolder,
  });

  useEffect(() => {
      if (syncSelectedEmail && !selectedEmail) {
          setSelectedEmail(syncSelectedEmail);
          setSyncSelectedEmail(null);
      }
  }, [syncSelectedEmail, selectedEmail, setSelectedEmail]);


  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  const currentAccountObj = accounts.find(a => a.id === selectedAccount);

  const handleSaveGlobalSettings = (newModel: string) => {
    setAiModel(newModel);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden font-sans relative">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      
      {/* Sync Progress Indicator */}
      <SyncProgress />

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
             {/* Only show loader if we are syncing AND have no emails. 
                 If we are NOT syncing and have no emails, it means the folder is empty. */}
             {isSyncing ? (
                <Loader2 className="animate-spin text-sky-500" />
             ) : (
                <div className="text-gray-500 text-sm">No emails found</div>
             )}
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
