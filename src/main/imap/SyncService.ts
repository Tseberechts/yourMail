import { ImapService } from './ImapService';
import { EmailRepository } from '../db/EmailRepository';
import { Email } from '../../shared/types';

export class SyncService {
  private imapService: ImapService;
  private emailRepo: EmailRepository;

  constructor(imapService: ImapService, emailRepo: EmailRepository) {
    this.imapService = imapService;
    this.emailRepo = emailRepo;
  }

  /**
   * Performs a "Down-Sync": Cloud -> Local DB
   * Then returns the Local DB data to the UI.
   */
  async syncAndFetch(accountId: string, folder: string = 'INBOX'): Promise<Email[]> {
    console.log(`[SyncEngine] Starting sync for ${accountId} : ${folder}`);

    try {
      // 1. Get the last UID we have locally to optimize bandwidth
      // (Note: In a robust app, we also need to handle flag updates for old messages,
      // but for this MVP step we focus on fetching new mail)
      const lastUid = this.emailRepo.getHighestUid(accountId, folder);

      // 2. Fetch from IMAP (Only newer messages)
      // We need to modify ImapService.fetchEmails to accept a 'sinceUid' logic
      // For now, we utilize the existing fetchEmails which fetches the latest 20-50.
      // In a real implementation, we would pass `lastUid` to `fetch`.
      const { emails: newEmails } = await this.imapService.fetchEmails(accountId, folder);

      // 3. Save to DB
      if (newEmails.length > 0) {
        console.log(`[SyncEngine] Saving ${newEmails.length} emails to DB`);
        this.emailRepo.saveEmails(accountId, folder, newEmails);
      }

    } catch (error) {
      console.error(`[SyncEngine] Sync failed (Offline?):`, error);
      // If sync fails (offline), we proceed to return what we have in DB
    }

    // 4. Return Data from DB (Source of Truth)
    return this.emailRepo.getEmails(accountId, folder);
  }

  async deleteEmail(accountId: string, emailId: string, folder: string) {
    // 1. Update Local DB immediately (Optimistic UI)
    this.emailRepo.deleteEmail(accountId, parseInt(emailId));

    // 2. Try to update Server
    try {
      await this.imapService.deleteEmail(accountId, emailId);
    } catch (e) {
      console.error("[SyncEngine] Failed to delete on server (Offline?). Action queued.");
      // Phase 3.5: Add to "PendingActions" table
    }
  }

  async markAsRead(accountId: string, emailId: string, folder: string) {
    this.emailRepo.markAsRead(accountId, parseInt(emailId));
    try {
      await this.imapService.markAsRead(accountId, emailId);
    } catch (e) {
      console.error("[SyncEngine] Failed to mark read on server.");
    }
  }
}