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
     */
    async syncAndFetch(accountId: string, folder: string = 'INBOX'): Promise<Email[]> {
        console.log(`[SyncEngine] Starting sync for ${accountId} : ${folder}`);

        try {
            // 1. Process Offline Queue first (Up-Sync)
            await this.processPendingActions(accountId);

            // 2. Fetch new emails
            const { emails: newEmails } = await this.imapService.fetchEmails(accountId, folder);

            // 3. Save to DB
            if (newEmails.length > 0) {
                this.emailRepo.saveEmails(accountId, folder, newEmails);
            }

        } catch (error) {
            console.error(`[SyncEngine] Sync failed (Offline?):`, error);
        }

        // 4. Return Data from DB
        return this.emailRepo.getEmails(accountId, folder);
    }

    /**
     * Search using Local DB (FTS)
     */
    searchLocal(accountId: string, query: string): Email[] {
        return this.emailRepo.searchEmails(accountId, query);
    }

    async deleteEmail(accountId: string, emailId: string, folder: string) {
        // 1. Optimistic Update (Local)
        this.emailRepo.deleteEmail(accountId, parseInt(emailId));

        // 2. Try Server
        try {
            await this.imapService.deleteEmail(accountId, emailId);
        } catch (e) {
            console.warn("[SyncEngine] Offline? Queuing DELETE action.");
            this.emailRepo.queueAction(accountId, 'DELETE', { emailId, folder });
        }
    }

    async markAsRead(accountId: string, emailId: string, folder: string) {
        // 1. Optimistic Update (Local)
        this.emailRepo.markAsRead(accountId, parseInt(emailId));

        // 2. Try Server
        try {
            await this.imapService.markAsRead(accountId, emailId);
        } catch (e) {
            console.warn("[SyncEngine] Offline? Queuing MARK_READ action.");
            this.emailRepo.queueAction(accountId, 'MARK_READ', { emailId, folder });
        }
    }

    /**
     * Replays queued actions
     */
    private async processPendingActions(accountId: string) {
        const actions = this.emailRepo.getPendingActions(accountId);
        if (actions.length === 0) return;

        console.log(`[SyncEngine] Processing ${actions.length} pending actions...`);

        for (const action of actions) {
            try {
                if (action.action_type === 'DELETE') {
                    await this.imapService.deleteEmail(accountId, action.payload.emailId);
                } else if (action.action_type === 'MARK_READ') {
                    await this.imapService.markAsRead(accountId, action.payload.emailId);
                }
                // If successful, remove from queue
                this.emailRepo.removeAction(action.id);
            } catch (e) {
                console.error(`[SyncEngine] Failed to replay action ${action.id}`, e);
                // Stop processing to maintain order, or continue depending on strategy.
                // Abort to prevent weird state issues.
                break;
            }
        }
    }
}