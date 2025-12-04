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
    body: string;
    tags: string[];
    read: boolean;
}