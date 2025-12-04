import React from 'react';
import { Mail, Shield, ArrowRight, Plus } from 'lucide-react';
import { Account } from '../../shared/types';

interface SidebarProps {
    accounts: Account[];
    selectedAccountId: string;
    onSelectAccount: (id: string) => void;
    selectedFolder: string;
    onSelectFolder: (folder: string) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onOpenAddAccount: () => void;
}

const FOLDERS = ['Inbox', 'Sent', 'Drafts', 'Trash'];

export const Sidebar: React.FC<SidebarProps> = ({
                                                    accounts,
                                                    selectedAccountId,
                                                    onSelectAccount,
                                                    selectedFolder,
                                                    onSelectFolder,
                                                    collapsed,
                                                    onToggleCollapse,
                                                    onOpenAddAccount,
                                                }) => {
    return (
        <div className={`${collapsed ? 'w-16' : 'w-64'} flex-shrink-0 bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col`}>
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-700 bg-gray-800/50">
                <h1 className={`font-bold text-sky-500 truncate tracking-tight ${collapsed ? 'hidden' : 'block'}`}>
                    YourMail
                </h1>
                <button onClick={onToggleCollapse} className="text-gray-400 hover:text-white">
                    <ArrowRight size={18} className={`transform transition-transform ${collapsed ? '' : 'rotate-180'}`} />
                </button>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {/* Defensive check: ensure accounts exists and map carefully */}
                {accounts && accounts.map((acc) => {
                    // Guard against undefined/null accounts in the array
                    if (!acc || !acc.id) return null;

                    return (
                        <div key={acc.id}>
                            <div
                                onClick={() => onSelectAccount(acc.id)}
                                className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer mb-1 transition-colors ${
                                    selectedAccountId === acc.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'
                                }`}
                            >
                                {acc.type === 'gmail' ? (
                                    <Mail size={18} className="text-red-400" />
                                ) : (
                                    <Shield size={18} className="text-blue-400" />
                                )}
                                {!collapsed && <span className="text-sm font-medium truncate">{acc.name}</span>}
                            </div>

                            {/* Folders (Only show for selected account) */}
                            {selectedAccountId === acc.id && !collapsed && (
                                <div className="ml-4 space-y-0.5 mt-1">
                                    {FOLDERS.map((folder) => (
                                        <div
                                            key={folder}
                                            onClick={() => onSelectFolder(folder.toLowerCase())}
                                            className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                                                selectedFolder === folder.toLowerCase()
                                                    ? 'bg-sky-500/10 text-sky-400 font-medium'
                                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/30'
                                            }`}
                                        >
                                            <span>{folder}</span>
                                            {folder === 'Inbox' && acc.unread > 0 && (
                                                <span className="bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded text-[10px] min-w-[1.25rem] text-center">
                          {acc.unread}
                        </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-gray-700">
                <button
                    onClick={onOpenAddAccount}
                    className="flex items-center justify-center w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-medium transition-colors border border-gray-600 hover:border-gray-500"
                >
                    <Plus size={14} className={collapsed ? '' : 'mr-2'} />
                    {!collapsed && 'Add Account'}
                </button>
            </div>
        </div>
    );
};