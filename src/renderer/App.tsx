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
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
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
            emails={emails}
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
