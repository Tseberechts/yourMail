export type AccountType = 'gmail' | 'exchange';

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    unread: number;
}

// [NEW] Define Attachment Structure
export interface Attachment {
    filename: string;
    contentType: string;
    size: number;
    content: string; // Base64 encoded string for MVP transfer
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
    attachments: Attachment[];
}