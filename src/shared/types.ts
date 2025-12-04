export type AccountType = 'gmail' | 'exchange';

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    unread: number;
    signature?: string; // [NEW] User signature
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