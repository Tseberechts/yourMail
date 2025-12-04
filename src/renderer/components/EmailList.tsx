import React, { useState, useMemo } from 'react';
import { Email } from '../../shared/types';
import { Calendar, User, Search, RefreshCw, Trash2, Mail as MailIcon } from 'lucide-react';

interface EmailListProps {
    emails: Email[];
    selectedEmailId: string | null;
    onSelectEmail: (email: Email) => void;
    folderName: string;
    onRefresh: () => void;
    isRefreshing: boolean;
    onDeleteEmail: (emailId: string) => void;
}

type SortField = 'date' | 'from' | 'subject';
type SortDirection = 'asc' | 'desc';

export const EmailList: React.FC<EmailListProps> = ({
                                                        emails,
                                                        selectedEmailId,
                                                        onSelectEmail,
                                                        folderName,
                                                        onRefresh,
                                                        isRefreshing,
                                                        onDeleteEmail,
                                                    }) => {
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchQuery, setSearchQuery] = useState('');

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            if (isNaN(date.getTime())) return isoString;
            const isToday = date.toDateString() === now.toDateString();
            if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) { return isoString; }
    };

    const processedEmails = useMemo(() => {
        let result = [...emails];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(e => e.subject.toLowerCase().includes(lowerQuery) || e.from.toLowerCase().includes(lowerQuery));
        }
        result.sort((a, b) => {
            let valA = '';
            let valB = '';
            switch (sortField) {
                case 'date': valA = a.date; valB = b.date; break;
                case 'from': valA = a.from.toLowerCase(); valB = b.from.toLowerCase(); break;
                case 'subject': valA = a.subject.toLowerCase(); valB = b.subject.toLowerCase(); break;
            }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [emails, sortField, sortDirection, searchQuery]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDirection('desc'); }
    };

    return (
        <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
            <div className="flex flex-col border-b border-gray-700 bg-gray-900/95 backdrop-blur z-10">
                <div className="h-14 flex items-center justify-between px-4">
                    <h2 className="font-semibold text-gray-200 capitalize text-sm">{folderName}</h2>
                    <div className="flex space-x-1">
                        <button onClick={onRefresh} title="Refresh" disabled={isRefreshing} className={`p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors`}>
                            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-sky-400' : ''} />
                        </button>
                        <div className="w-px h-4 bg-gray-700 mx-1 self-center" />
                        <button onClick={() => toggleSort('date')} className={`p-1.5 rounded hover:bg-gray-800 ${sortField === 'date' ? 'text-sky-400 bg-gray-800' : 'text-gray-500'}`}><Calendar size={16} /></button>
                        <button onClick={() => toggleSort('from')} className={`p-1.5 rounded hover:bg-gray-800 ${sortField === 'from' ? 'text-sky-400 bg-gray-800' : 'text-gray-500'}`}><User size={16} /></button>
                    </div>
                </div>
                <div className="px-3 pb-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2 text-gray-500" />
                        <input type="text" placeholder="Filter emails..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-800 text-gray-200 text-xs rounded-md pl-8 pr-3 py-1.5 border border-transparent focus:border-sky-600 focus:outline-none transition-colors" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {processedEmails.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs">{isRefreshing ? 'Checking for mail...' : 'No emails found.'}</div>
                ) : (
                    processedEmails.map((email) => {
                        const isUnread = !email.read;

                        return (
                            <div
                                key={email.id}
                                onClick={() => onSelectEmail(email)}
                                className={`group relative p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all border border-transparent ${
                                    selectedEmailId === email.id ? 'bg-gray-800 border-gray-700 shadow-sm' : 'hover:bg-gray-800/50'
                                }`}
                            >
                                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-sm truncate max-w-[65%] ${isUnread ? 'text-white font-bold' : (selectedEmailId === email.id ? 'text-white' : 'text-gray-300')}`}>
                    {email.from}
                  </span>
                                    <span className={`text-[10px] uppercase tracking-wide ${isUnread ? 'text-sky-400 font-bold' : 'text-gray-500'}`}>
                    {formatDate(email.date)}
                  </span>
                                </div>
                                <div className={`text-sm truncate mb-0.5 ${isUnread ? 'text-gray-100 font-semibold' : 'text-gray-400 font-medium'}`}>
                                    {email.subject}
                                </div>
                                <div className="text-xs text-gray-600 truncate">{email.body}</div>

                                {isUnread && (
                                    <div className="absolute left-1 top-4 w-1.5 h-1.5 bg-sky-500 rounded-full" title="Unread" />
                                )}

                                <button
                                    className="absolute right-2 bottom-2 p-1.5 rounded-md bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-gray-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteEmail(email.id);
                                    }}
                                    title="Move to Trash"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};