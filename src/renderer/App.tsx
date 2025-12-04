import React, { useState } from 'react';
import { Account, Email } from '../shared/types';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailViewer } from './components/EmailViewer';
import { AddAccountModal } from './components/AddAccountModal';

// --- Mock Data ---
const MOCK_ACCOUNTS: Account[] = [
    { id: 'a1', name: 'Personal (Gmail)', type: 'gmail', unread: 5 },
    { id: 'a2', name: 'Work (Office 365)', type: 'exchange', unread: 12 },
];

const MOCK_EMAILS: Email[] = [
    {
        id: 'e1',
        subject: 'Welcome to YourMail',
        from: 'Team YourMail',
        date: '10:00 AM',
        body: 'Welcome to the alpha version of YourMail. This is a static mock to demonstrate the layout.',
        tags: ['welcome', 'important'],
        read: false,
    },
    ...Array.from({ length: 10 }).map((_, i) => ({
        id: `e${i + 2}`,
        subject: `Project Update #${i + 1}`,
        from: `colleague${i}@example.com`,
        date: 'Yesterday',
        body: `Here is the update for the project.\nWe are making good progress on phase ${i + 1}.`,
        tags: ['work'],
        read: true,
    })),
];

function App() {
    // UI State
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

    // Data State
    const [selectedAccount, setSelectedAccount] = useState<string>(MOCK_ACCOUNTS[0].id);
    const [selectedFolder, setSelectedFolder] = useState('inbox');
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(MOCK_EMAILS[0]);

    return (
        <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden font-sans relative">
            <AddAccountModal isOpen={isAddAccountOpen} onClose={() => setIsAddAccountOpen(false)} />

            <Sidebar
                accounts={MOCK_ACCOUNTS}
                selectedAccountId={selectedAccount}
                onSelectAccount={setSelectedAccount}
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                onOpenAddAccount={() => setIsAddAccountOpen(true)}
            />

            <EmailList
                emails={MOCK_EMAILS}
                selectedEmailId={selectedEmail?.id || null}
                onSelectEmail={setSelectedEmail}
                folderName={selectedFolder}
            />

            <EmailViewer email={selectedEmail} />
        </div>
    );
}

export default App;