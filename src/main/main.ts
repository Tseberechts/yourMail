import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'node:path'
import { SecureStore } from './SecureStore'
import { AuthService } from './AuthService'
import { AccountStore } from './AccountStore'
import { ImapService } from './ImapService' // <--- Import

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null

// Initialize Services
const secureStore = new SecureStore();
const accountStore = new AccountStore();
const authService = new AuthService(secureStore, accountStore);
const imapService = new ImapService(secureStore); // <--- Initialize

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// ... (createApplicationMenu function remains same - omitted for brevity) ...
function createApplicationMenu(window: BrowserWindow) {
    // Use the existing menu code from previous step
    // I will skip pasting it again unless you need it, to save space.
    // It is the same "Nuke All Data" menu.
    const isMac = process.platform === 'darwin';
    const template: Electron.MenuItemConstructorOptions[] = [
        { role: isMac ? 'appMenu' : 'fileMenu' } as any,
        { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }] },
        {
            label: 'Developer',
            submenu: [{
                label: '⚠️ Nuke All Data',
                click: () => { secureStore.clear(); accountStore.clear(); window.reload(); }
            }]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    createApplicationMenu(win);

    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
        win.webContents.openDevTools()
    } else {
        win.loadFile(path.join(process.env.DIST, 'index.html'))
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(() => {
    // Security Handlers
    ipcMain.handle('secret:set', (_event, key: string, value: string) => {
        return secureStore.setSecret(key, value);
    });

    // Account Handlers
    ipcMain.handle('account:list', () => {
        return accountStore.getAccounts();
    });

    // Auth Handlers
    ipcMain.handle('auth:start-gmail', async () => {
        if (win) {
            try {
                await authService.startGmailAuth(win);
                return { success: true };
            } catch (error: any) {
                console.error("Auth failed", error);
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: "Window not found" };
    });

    // --- NEW: Email Sync Handler ---
    ipcMain.handle('email:sync', async (_event, accountId: string) => {
        try {
            const emails = await imapService.fetchEmails(accountId);
            return { success: true, emails };
        } catch (error: any) {
            console.error("Sync failed", error);
            return { success: false, error: error.message };
        }
    });

    createWindow()
})