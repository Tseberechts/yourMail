import React, { useCallback, useEffect, useState } from "react";
import { Account, Email } from "../shared/types";
import { Sidebar } from "./components/Sidebar";
import { EmailList } from "./components/EmailList";
import { EmailViewer } from "./components/EmailViewer";
import { AddAccountModal } from "./components/AddAccountModal";
import { ComposeModal } from "./components/ComposeModal";
// [UPDATED] Imported new separate modals
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

  // [UPDATED] Separated settings state
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
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

  // [UPDATED] Handle opening ACCOUNT settings
  const handleOpenAccountSettings = (account: Account) => {
    setAccountToEdit(account);
    setIsAccountSettingsOpen(true);
  };

  // [UPDATED] Handle opening GLOBAL settings
  const handleOpenGlobalSettings = () => {
    setIsGlobalSettingsOpen(true);
  };

  const handleSaveAccountSettings = async (
    accountId: string,
    signature: string,
  ) => {
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.updateSignature(
        accountId,
        signature,
      );
      if (result.success) {
        addToast("Signature updated!", "success");
        window.location.reload();
      } else {
        addToast("Failed to update signature", "error");
      }
    } catch (e) {
      console.error(e);
      addToast("Error saving settings", "error");
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

      {/* [UPDATED] Render separate modals */}
      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        account={accountToEdit}
        onSave={handleSaveAccountSettings}
      />

      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
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
            isRefreshing={isLoadingEmails || isSearching}
            onDeleteEmail={handleDeleteWrapper}
            onSearch={searchEmails}
          />
        )}
        <EmailViewer email={selectedEmail} onDelete={handleDeleteWrapper} />
      </div>
    </div>
  );
}

export default App;
