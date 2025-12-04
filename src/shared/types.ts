export type AccountType = 'gmail' | 'exchange';

export interface Mailbox {
    path: string;      // e.g., "INBOX", "[Gmail]/Sent Mail"
    name: string;      // e.g., "Inbox", "Sent Mail"
    delimiter: string; // e.g., "/"
    flags: string[];   // e.g., ["\HasChildren", "\Sent"]
    type?: 'inbox' | 'sent' | 'trash' | 'drafts' | 'junk' | 'archive' | 'normal';
}

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    unread: number;
    signature?: string;
    mailboxes?: Mailbox[]; // [NEW] Cache mailboxes on the account
}

// Attachment Definition
export interface Attachment {
    filename: string;
    content: string; // Base64 string
    contentType: string;
    size: number;
    checksum?: string;
}

export interface Email {
    id: string;
    subject: string;
    from: string;
    date: string;
    body: string;
    htmlBody?: string;
    tags: string[];
    read: boolean;
    attachments?: Attachment[];
}

// Payload for sending email
export interface SendEmailPayload {
    accountId: string;
    to: string;
    subject: string;
    body: string;
    attachments: Attachment[];
}