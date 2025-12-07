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

  updateSignature: (accountId: string, signature: string) =>
    ipcRenderer.invoke('account:updateSignature', { accountId, signature }),

  syncEmails: (arg: string | { accountId: string, path: string }) => ipcRenderer.invoke('email:sync', arg),
  searchEmails: (accountId: string, query: string) => ipcRenderer.invoke('email:search', { accountId, query }),
  getMailboxes: (accountId: string) => ipcRenderer.invoke('email:getMailboxes', accountId),
  sendEmail: (data: SendEmailPayload) => ipcRenderer.invoke('email:send', data),

  deleteEmail: (accountId: string, emailId: string, path?: string) =>
    ipcRenderer.invoke('email:delete', { accountId, emailId, path }),
  markAsRead: (accountId: string, emailId: string, path?: string) =>
    ipcRenderer.invoke('email:markRead', { accountId, emailId, path }),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open', url),

  // [UPDATED] AI - passing model as part of the data object
  aiHasKey: () => ipcRenderer.invoke('ai:hasKey'),
  aiSaveKey: (key: string) => ipcRenderer.invoke('ai:saveKey', key),

  // Note: main.ts expects an object { body, model }
  aiSummarize: (body: string, model: string) => ipcRenderer.invoke('ai:summarize', { body, model }),

  // Note: main.ts expects an object { body, instruction, model }
  aiDraft: (body: string, instruction: string, model: string) => ipcRenderer.invoke('ai:draft', { body, instruction, model }),
})