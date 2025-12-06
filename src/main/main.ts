import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import path from 'node:path'
import { SecureStore } from './SecureStore'
import { AuthService } from './AuthService'
import { AccountStore } from './AccountStore'
import { ImapService } from './imap/ImapService'
import { SmtpService } from './SmtpService'
import { SendEmailPayload } from '../shared/types'
import { AppDatabase } from './db/Database'
import { EmailRepository } from './db/EmailRepository'
import { SyncService } from './imap/SyncService'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null

// --- Initialize Services ---
const secureStore = new SecureStore();
const accountStore = new AccountStore();
const authService = new AuthService(secureStore, accountStore);
const imapService = new ImapService(secureStore);
const smtpService = new SmtpService(secureStore);

// --- Phase 3: Database & Sync ---
const db = new AppDatabase();
const emailRepo = new EmailRepository(db);
const syncService = new SyncService(imapService, emailRepo);

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createApplicationMenu(window: BrowserWindow) {
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
icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
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

  ipcMain.handle('shell:open', async (_event, url: string) => {
    await shell.openExternal(url);
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
win.loadFile(path.join(process.env.DIST || '', 'index.html'))
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
  ipcMain.handle('secret:set', (_e, k, v) => secureStore.setSecret(k, v));
  ipcMain.handle('account:list', () => accountStore.getAccounts());

  ipcMain.handle('account:updateSignature', (_e, data) => {
    try {
      accountStore.updateSignature(data.accountId, data.signature);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('auth:start-gmail', async () => {
    if (win) {
      try { await authService.startGmailAuth(win); return { success: true }; }
      catch (e: any) { return { success: false, error: e.message }; }
    }
    return { success: false, error: "No window" };
  });

  ipcMain.handle('email:getMailboxes', async (_e, accId) => {
    try {
      const mailboxes = await imapService.getMailboxes(accId);
      return { success: true, mailboxes };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // [UPDATED] Use SyncService
  ipcMain.handle('email:sync', async (_e, data: { accountId: string, path: string }) => {
    try {
      const accId = typeof data === 'string' ? data : data.accountId;
      const path = typeof data === 'string' ? 'INBOX' : (data.path || 'INBOX');

      // This now fetches from Cloud -> DB, then returns DB -> UI
      const emails = await syncService.syncAndFetch(accId, path);

      // Unread count currently not in DB query, simplistic fallback for MVP
      const unreadCount = emails.filter(e => !e.read).length;

      return { success: true, emails, unreadCount };
    }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('email:send', async (_e, data: SendEmailPayload) => {
    try {
      await smtpService.sendEmail(
        data.accountId,
        data.to,
        data.subject,
        data.body,
        data.attachments || []
      );
      return { success: true };
    }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // [UPDATED] Use SyncService
  ipcMain.handle('email:delete', async (_event, data: { accountId: string, emailId: string, path?: string }) => {
    try {
      await syncService.deleteEmail(data.accountId, data.emailId, data.path || 'INBOX');
      return { success: true };
    } catch (error: any) {
      console.error("Delete failed", error);
      return { success: false, error: error.message };
    }
  });

  // [UPDATED] Use SyncService
  ipcMain.handle('email:markRead', async (_event, data: { accountId: string, emailId: string, path?: string }) => {
    try {
      await syncService.markAsRead(data.accountId, data.emailId, data.path || 'INBOX');
      return { success: true };
    } catch (error: any) {
      console.error("Mark read failed", error);
      return { success: false, error: error.message };
    }
  });

  createWindow()
})