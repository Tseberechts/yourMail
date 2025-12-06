# YourMail

**YourMail** is a modern, open-source desktop email client built with privacy, speed, and AI integration in mind. It is
designed to replace legacy clients with a clean, performant React-based UI running on Electron.

## 🚀 Key Features

- **Multi-Account Support**: Connect Gmail (OAuth2) and Office 365 (Coming Soon).
- **Offline First**: Uses a local SQLite database to cache emails for instant access and offline capability.
- **Privacy-Centric AI**: "Bring Your Own Key" (BYOK) architecture for AI summarization and drafting, ensuring your data stays
private.
- **Secure**: Sensitive tokens are encrypted using Electron's `safeStorage` (OS Keychain).
- **Modern UI**: Built with React 19, Tailwind CSS v4, and a dark-mode-first design.

## 🛠️ Tech Stack

- **Runtime**: Electron (Main + Renderer processes)
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend** Logic: Node.js (in Electron Main), imapflow, nodemailer
- **Database**: better-sqlite3 (Native SQLite driver)
- **State** Management: React Hooks + IPC

## 📦 Installation & Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Setup

1. Clone the repository

```bash 
git clone [https://github.com/yourusername/yourmail.git](https://github.com/yourusername/yourmail.git)
cd yourmail
```

2. Install Dependencies

```bash
npm install
```

_Note: This will also compile native modules like `better-sqlite3` against your local Node.js version._

3. Environment Variables

Create a `.env` file in the root directory:

```dotenv
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

4. Run Development Server

```bash 
npm run dev
```

## 🏗️ Building for Production

To create a distributable binary (dmg/exe/deb):
```bash
npm run build
```

This command runs tsc, builds the Vite app, and packages it using electron-builder.

## ⚠️ Troubleshooting & Native Modules

### `better-sqlite3` and Rollup Errors
If you encounter an error during development or build that looks like:
```
Error: Could not dynamically require ".../better_sqlite3.node". Please configure the dynamicRequireTargets...
```
This is because `better-sqlite3` is a native C++ module. Bundlers like Vite (Rollup) cannot bundle `.node` binary files
directly into a JavaScript bundle.

**The Fix:**
We have configured vite.config.ts to externalize this dependency. This tells the bundler to leave the require('
better-sqlite3') call alone, allowing Node.js to load the module from node_modules at runtime.

``` typescript
// vite.config.ts configuration
vite: {
    build: {
        rollupOptions: {
            external: ['better-sqlite3'] // <--- CRITICAL for native modules
        }
    }
}
```

### ABI Mismatch Errors

If you see errors about `NODE_MODULE_VERSION` mismatch (e.g., "was compiled against Node.js 20, using Node.js 22"), it
means the native module was built for your system Node version but is running inside Electron's Node version.

**Solution**:
Rebuild the dependencies specifically for Electron:
```bash
npm run build
```

_(Electron Builder handles the native dependency rebuilding automatically during the build process.)_

## 🗺️ Roadmap

[x] Phase 1: UI Foundation & Security

[x] Phase 2: Gmail Integration (IMAP/SMTP)
[x] Phase 3: Offline Database (SQLite)

[ ] Phase 4: AI Integration (Gemini)

[ ] Phase 5: Rich Text Editor & Polish

## 📄 License

MIT
