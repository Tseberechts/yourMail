import { ipcMain, shell } from "electron";

export function registerSystemHandlers() {
  ipcMain.handle("shell:open", async (_event, url: string) => {
    await shell.openExternal(url);
  });
}
