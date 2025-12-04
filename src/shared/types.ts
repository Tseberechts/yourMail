export type AccountType = 'gmail' | 'exchange';

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    unread: number;
}

export interface Email {
    id: string;
    subject: string;
    from: string;
    date: string;
    body: string; // Plain text snippet for the list view
    htmlBody?: string; // Full HTML content for the viewer
    tags: string[];
    read: boolean;
}