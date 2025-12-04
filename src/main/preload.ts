import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
    // Event Listener Wrapper
    on(channel: string, listener: (...args: any[]) => void) {
        const subscription = (_event: IpcRendererEvent, ...args: any[]) => listener(...args);
        ipcRenderer.on(channel, subscription);
        return () => {
            ipcRenderer.removeListener(channel, subscription);
        };
    },

    send(channel: string, ...args: any[]) {
        ipcRenderer.send(channel, ...args);
    },
    invoke(channel: string, ...args: any[]) {
        return ipcRenderer.invoke(channel, ...args);
    },

    // Security
    setSecret: (key: string, value: string) => ipcRenderer.invoke('secret:set', key, value),
    getSecret: (key: string) => ipcRenderer.invoke('secret:get', key),
    deleteSecret: (key: string) => ipcRenderer.invoke('secret:delete', key),

    // Auth & Accounts
    startGmailAuth: () => ipcRenderer.invoke('auth:start-gmail'),
    getAccounts: () => ipcRenderer.invoke('account:list'),

    // --- NEW: Sync Emails ---
    syncEmails: (accountId: string) => ipcRenderer.invoke('email:sync', accountId),
})