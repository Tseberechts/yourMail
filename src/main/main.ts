import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'node:path'
import { SecureStore } from './SecureStore'
import { AuthService } from './AuthService'
import { AccountStore } from './AccountStore'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null

// Initialize Services
const secureStore = new SecureStore();
const accountStore = new AccountStore();
const authService = new AuthService(secureStore, accountStore);

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createApplicationMenu(window: BrowserWindow) {
    const isMac = process.platform === 'darwin';

    const template: Electron.MenuItemConstructorOptions[] = [
        // { role: 'appMenu' } (macOS only)
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        } as Electron.MenuItemConstructorOptions] : []),
        // { role: 'fileMenu' }
        {
            label: 'File',
            submenu: [
                isMac ? { role: 'close' } : { role: 'quit' }
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        // --- DEVELOPER MENU ---
        {
            label: 'Developer',
            submenu: [
                {
                    label: '⚠️ Nuke All Data (Reset App)',
                    click: () => {
                        // 1. Clear Stores
                        secureStore.clear();
                        accountStore.clear();
                        console.log('App data cleared via Developer Menu.');

                        // 2. Reload Window to reflect empty state
                        window.reload();
                    }
                }
            ]
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

    // Create Custom Menu
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

    createWindow()
})