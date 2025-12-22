import { ipcMain, BrowserWindow } from "electron";
import { AuthService } from "../AuthService";
import { AccountStore } from "../AccountStore";
import { SecureStore } from "../SecureStore";

export function registerAuthHandlers(
  authService: AuthService,
  accountStore: AccountStore,
  secureStore: SecureStore,
  getMainWindow: () => BrowserWindow | null,
) {
  // --- Secrets ---
  ipcMain.handle("secret:set", (_e, k, v) => secureStore.setSecret(k, v));

  // --- Accounts ---
  ipcMain.handle("account:list", () => accountStore.getAccounts());

  ipcMain.handle("account:updateSignature", (_e, data) => {
    try {
      accountStore.updateSignature(data.accountId, data.signature);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- Authentication ---
  ipcMain.handle("auth:start-gmail", async () => {
    const win = getMainWindow();
    if (win) {
      try {
        await authService.startGmailAuth(win);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: "No window available" };
  });
}
