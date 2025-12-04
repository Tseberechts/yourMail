import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
    // 1. FIXED: 'on' now returns an unsubscribe function
    on(channel: string, listener: (...args: any[]) => void) {
        const subscription = (_event: IpcRendererEvent, ...args: any[]) => listener(...args);
        ipcRenderer.on(channel, subscription);

        // Return the cleanup function for React useEffect
        return () => {
            ipcRenderer.removeListener(channel, subscription);
        };
    },

    // 2. Standard IPC methods
    send(channel: string, ...args: any[]) {
        ipcRenderer.send(channel, ...args);
    },
    invoke(channel: string, ...args: any[]) {
        return ipcRenderer.invoke(channel, ...args);
    },

    // 3. API Methods
    setSecret: (key: string, value: string) => ipcRenderer.invoke('secret:set', key, value),
    getSecret: (key: string) => ipcRenderer.invoke('secret:get', key),
    deleteSecret: (key: string) => ipcRenderer.invoke('secret:delete', key),

    startGmailAuth: () => ipcRenderer.invoke('auth:start-gmail'),
    getAccounts: () => ipcRenderer.invoke('account:list'),
})