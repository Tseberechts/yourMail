import { useEffect, useState } from "react";
import { Account } from "../../shared/types";
import { ToastType } from "../components/Toast";

interface UseAuthProps {
  addToast: (msg: string, type: ToastType) => void;
  onAuthSuccess?: (account: Account) => void;
}

export const useAuth = ({ addToast, onAuthSuccess }: UseAuthProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);

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
    const removeListener = window.ipcRenderer.on(
      "auth:success",
      (newAccount: Account) => {
        setAccounts(prev => {
          if (prev.find(a => a.id === newAccount.id)) return prev;
          return [...prev, newAccount];
        });
        addToast(`Connected to ${newAccount.name}`, "success");
        if (onAuthSuccess) onAuthSuccess(newAccount);
      },
    );

    return () => {
      if (removeListener) removeListener();
    };
  }, [addToast, onAuthSuccess]);

  return {
    accounts,
    setAccounts,
  };
};
