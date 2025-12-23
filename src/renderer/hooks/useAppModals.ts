import { useState } from "react";
import { Account } from "../../shared/types";
import { ToastType } from "../components/Toast";

interface UseAppModalsProps {
  addToast: (msg: string, type: ToastType) => void;
}

export const useAppModals = ({ addToast }: UseAppModalsProps) => {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

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

  return {
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
  };
};
