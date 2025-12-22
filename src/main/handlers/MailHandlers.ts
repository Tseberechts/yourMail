import { ipcMain } from "electron";
import { ImapService } from "../imap/ImapService";
import { SyncService } from "../imap/SyncService";
import { SmtpService } from "../SmtpService";
import { SendEmailPayload } from "../../shared/types";

export function registerMailHandlers(
  imapService: ImapService,
  syncService: SyncService,
  smtpService: SmtpService,
) {
  // --- IMAP & Mailboxes ---
  ipcMain.handle("email:getMailboxes", async (_e, accId) => {
    try {
      const mailboxes = await imapService.getMailboxes(accId);
      return { success: true, mailboxes };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- Syncing ---
  ipcMain.handle(
    "email:sync",
    async (_e, data: { accountId: string; path: string }) => {
      try {
        const accId = typeof data === "string" ? data : data.accountId;
        const path = typeof data === "string" ? "INBOX" : data.path || "INBOX";
        const emails = await syncService.syncAndFetch(accId, path);
        const unreadCount = emails.filter(e => !e.read).length;
        return { success: true, emails, unreadCount };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
  );

  // --- Sending ---
  ipcMain.handle("email:send", async (_e, data: SendEmailPayload) => {
    try {
      await smtpService.sendEmail(
        data.accountId,
        data.to,
        data.subject,
        data.body,
        data.attachments || [],
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- Actions (Delete, Mark Read) ---
  ipcMain.handle(
    "email:delete",
    async (
      _event,
      data: { accountId: string; emailId: string; path?: string },
    ) => {
      try {
        await syncService.deleteEmail(
          data.accountId,
          data.emailId,
          data.path || "INBOX",
        );
        return { success: true };
      } catch (error: any) {
        console.error("Delete failed", error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle(
    "email:markRead",
    async (
      _event,
      data: { accountId: string; emailId: string; path?: string },
    ) => {
      try {
        await syncService.markAsRead(
          data.accountId,
          data.emailId,
          data.path || "INBOX",
        );
        return { success: true };
      } catch (error: any) {
        console.error("Mark read failed", error);
        return { success: false, error: error.message };
      }
    },
  );

  // --- Search ---
  ipcMain.handle(
    "email:search",
    async (_event, data: { accountId: string; query: string }) => {
      try {
        const emails = syncService.searchLocal(data.accountId, data.query);
        return { success: true, emails };
      } catch (error: any) {
        console.error("Search failed", error);
        return { success: false, error: error.message };
      }
    },
  );
}
