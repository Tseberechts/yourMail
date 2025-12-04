import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { SendEmailPayload } from '../shared/types';

contextBridge.exposeInMainWorld('ipcRenderer', {
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

    setSecret: (k: string, v: string) => ipcRenderer.invoke('secret:set', k, v),
    getSecret: (k: string) => ipcRenderer.invoke('secret:get', k),
    deleteSecret: (k: string) => ipcRenderer.invoke('secret:delete', k),
    startGmailAuth: () => ipcRenderer.invoke('auth:start-gmail'),
    getAccounts: () => ipcRenderer.invoke('account:list'),

    // [NEW] Update Signature
    updateSignature: (accountId: string, signature: string) =>
        ipcRenderer.invoke('account:updateSignature', { accountId, signature }),

    syncEmails: (id: string) => ipcRenderer.invoke('email:sync', id),
    sendEmail: (data: SendEmailPayload) => ipcRenderer.invoke('email:send', data),

    deleteEmail: (accountId: string, emailId: string) =>
        ipcRenderer.invoke('email:delete', { accountId, emailId }),
    markAsRead: (accountId: string, emailId: string) =>
        ipcRenderer.invoke('email:markRead', { accountId, emailId }),
    openExternal: (url: string) => ipcRenderer.invoke('shell:open', url),
})