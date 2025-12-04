import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { SecureStore } from './SecureStore'
import { AuthService } from './AuthService' // Import the new service

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null
// Initialize Services
const secureStore = new SecureStore();
const authService = new AuthService(secureStore);

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

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

    // Test active push message to Renderer-process.
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
    // --- IPC Handlers for Security ---

    // Save a secret
    ipcMain.handle('secret:set', (_event, key: string, value: string) => {
        return secureStore.setSecret(key, value);
    });

    // Retrieve a secret (only for internal logic or specific UI fields)
    ipcMain.handle('secret:get', (_event, key: string) => {
        return secureStore.getSecret(key);
    });

    // --- IPC Handlers for Auth ---
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