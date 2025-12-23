import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ipcRenderer", {
  // Auth
  startAuth: (provider: string) => ipcRenderer.invoke("auth:start", provider),
  getAccounts: () => ipcRenderer.invoke("account:list"),
  removeAccount: (accountId: string) =>
    ipcRenderer.invoke("auth:removeAccount", accountId),

  // Mail
  getMailboxes: (accountId: string) =>
    ipcRenderer.invoke("email:getMailboxes", accountId),

  // [NEW] Get from DB immediately (Fast)
  getFromDb: (accountId: string, folder: string) =>
    ipcRenderer.invoke("email:getFromDb", { accountId, path: folder }),

  // [EXISTING] Sync from server (Slow)
  syncEmails: (data: { accountId: string; path: string }) =>
    ipcRenderer.invoke("email:sync", data),

  sendEmail: (data: any) => ipcRenderer.invoke("email:send", data),
  deleteEmail: (accountId: string, emailId: string, folder: string) =>
    ipcRenderer.invoke("email:delete", { accountId, emailId, path: folder }),
  markAsRead: (accountId: string, emailId: string, folder: string) =>
    ipcRenderer.invoke("email:markRead", { accountId, emailId, path: folder }),

  // Search
  searchEmails: (accountId: string, query: string) =>
    ipcRenderer.invoke("email:search", { accountId, query }),

  // AI
  generateSummary: (emailBody: string) =>
    ipcRenderer.invoke("ai:summarize", emailBody),
  generateReply: (emailBody: string) =>
    ipcRenderer.invoke("ai:reply", emailBody),

  // System
  on: (channel: string, func: (...args: any[]) => void) => {
    const subscription = (_event: any, ...args: any[]) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
});
