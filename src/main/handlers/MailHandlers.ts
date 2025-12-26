import { ipcMain } from "electron";
import { ImapService } from "../imap/ImapService";
import { SyncService } from "../imap/SyncService";
import { SmtpService } from "../services/SmtpService";
import { EmailRepository } from "../db/EmailRepository";
import { SendEmailPayload } from "../../shared/types";

export function registerMailHandlers(
  imapService: ImapService,
  syncService: SyncService,
  smtpService: SmtpService,
  emailRepo: EmailRepository,
) {
  // --- IMAP & Mailboxes ---
  ipcMain.handle("email:getMailboxes", async (_e, accId) => {
    try {
      // 1. Try Local DB first
      const localMailboxes = emailRepo.getMailboxes(accId);
      
      if (localMailboxes.length > 0) {
          // Trigger background update without awaiting
          // We use a small delay to not block the main process immediately
          setTimeout(() => {
              imapService.getMailboxes(accId).then(boxes => {
                  emailRepo.saveMailboxes(accId, boxes);
              }).catch(e => console.error("Background mailbox sync failed", e));
          }, 1000);
          
          return { success: true, mailboxes: localMailboxes };
      }

      // 2. If no local data, fetch from server
      const mailboxes = await imapService.getMailboxes(accId);
      emailRepo.saveMailboxes(accId, mailboxes);

      return { success: true, mailboxes };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // --- DB Access (Fast Load) ---
  ipcMain.handle(
    "email:getFromDb",
    async (_e, data: { accountId: string; path: string }) => {
      try {
        const accId = typeof data === "string" ? data : data.accountId;
        const path = typeof data === "string" ? "INBOX" : data.path || "INBOX";
        const emails = emailRepo.getEmails(accId, path);
        return { success: true, emails };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
  );

  // --- Syncing (Network) ---
  ipcMain.handle(
    "email:sync",
    async (_e, data: { accountId: string; path: string }) => {
      try {
        const accId = typeof data === "string" ? data : data.accountId;
        const path = typeof data === "string" ? "INBOX" : data.path || "INBOX";

        // This performs the network fetch and DB save
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
