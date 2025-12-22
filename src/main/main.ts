import { app, BrowserWindow } from "electron";
import path from "node:path";

// Services
import { SecureStore } from "./SecureStore";
import { AuthService } from "./AuthService";
import { AccountStore } from "./AccountStore";
import { ImapService } from "./imap/ImapService";
import { SmtpService } from "./SmtpService";
import { AppDatabase } from "./db/Database";
import { EmailRepository } from "./db/EmailRepository";
import { SyncService } from "./imap/SyncService";
import { AiService } from "./AiService";

// Handlers
import { registerAuthHandlers } from "./handlers/AuthHandlers";
import { registerMailHandlers } from "./handlers/MailHandlers";
import { registerAiHandlers } from "./handlers/AiHandlers";
import { registerSystemHandlers } from "./handlers/SystemHandlers";

// Menu
import { createApplicationMenu } from "./AppMenu";

process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(__dirname, "../public");

let win: BrowserWindow | null;

// --- Initialize Services ---
const secureStore = new SecureStore();
const accountStore = new AccountStore();
const authService = new AuthService(secureStore, accountStore);
const imapService = new ImapService(secureStore);
const smtpService = new SmtpService(secureStore);
const db = new AppDatabase();
const emailRepo = new EmailRepository(db);
const syncService = new SyncService(imapService, emailRepo);
const aiService = new AiService(secureStore);

const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

// --- Register Handlers ---
// Registered immediately to avoid race conditions
registerAuthHandlers(authService, accountStore, secureStore, () => win);
registerMailHandlers(imapService, syncService, smtpService);
registerAiHandlers(aiService);
registerSystemHandlers();

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Attach Menu
  createApplicationMenu(win, secureStore, accountStore);

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
