import React, { useState, useMemo } from 'react';
import { Email } from '../../shared/types';
import { ArrowDownAZ, ArrowUpAZ, Calendar, User, AlignLeft, Search } from 'lucide-react';

interface EmailListProps {
    emails: Email[];
    selectedEmailId: string | null;
    onSelectEmail: (email: Email) => void;
    folderName: string;
}

type SortField = 'date' | 'from' | 'subject';
type SortDirection = 'asc' | 'desc';

export const EmailList: React.FC<EmailListProps> = ({
                                                        emails,
                                                        selectedEmailId,
                                                        onSelectEmail,
                                                        folderName,
                                                    }) => {
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [searchQuery, setSearchQuery] = useState('');

    // --- Helper: Date Formatting ---
    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            // If invalid date (e.g. mock data "Yesterday"), return as is
            if (isNaN(date.getTime())) return isoString;

            const isToday = date.toDateString() === now.toDateString();
            if (isToday) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) {
            return isoString;
        }
    };

    // --- Sorting & Filtering Logic ---
    const processedEmails = useMemo(() => {
        let result = [...emails];

        // 1. Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(
                e =>
                    e.subject.toLowerCase().includes(lowerQuery) ||
                    e.from.toLowerCase().includes(lowerQuery)
            );
        }

        // 2. Sort
        result.sort((a, b) => {
            let valA = '';
            let valB = '';

            switch (sortField) {
                case 'date':
                    // For dates, we can compare the raw ISO strings directly
                    valA = a.date;
                    valB = b.date;
                    break;
                case 'from':
                    valA = a.from.toLowerCase();
                    valB = b.from.toLowerCase();
                    break;
                case 'subject':
                    valA = a.subject.toLowerCase();
                    valB = b.subject.toLowerCase();
                    break;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [emails, sortField, sortDirection, searchQuery]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to desc for new fields
        }
    };

    return (
        <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
            {/* Header with Search & Sort */}
            <div className="flex flex-col border-b border-gray-700 bg-gray-900/95 backdrop-blur z-10">
                <div className="h-14 flex items-center justify-between px-4">
                    <h2 className="font-semibold text-gray-200 capitalize text-sm">{folderName}</h2>
                    <div className="flex space-x-1">
                        <button
                            onClick={() => toggleSort('date')}
                            title="Sort by Date"
                            className={`p-1.5 rounded hover:bg-gray-800 ${sortField === 'date' ? 'text-sky-400 bg-gray-800' : 'text-gray-500'}`}
                        >
                            <Calendar size={16} />
                        </button>
                        <button
                            onClick={() => toggleSort('from')}
                            title="Sort by Sender"
                            className={`p-1.5 rounded hover:bg-gray-800 ${sortField === 'from' ? 'text-sky-400 bg-gray-800' : 'text-gray-500'}`}
                        >
                            <User size={16} />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-3 pb-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Filter emails..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-800 text-gray-200 text-xs rounded-md pl-8 pr-3 py-1.5 border border-transparent focus:border-sky-600 focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {processedEmails.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs">
                        No emails found.
                    </div>
                ) : (
                    processedEmails.map((email) => (
                        <div
                            key={email.id}
                            onClick={() => onSelectEmail(email)}
                            className={`p-3 mx-2 my-1 rounded-lg cursor-pointer transition-all border border-transparent ${
                                selectedEmailId === email.id
                                    ? 'bg-gray-800 border-gray-700 shadow-sm'
                                    : 'hover:bg-gray-800/50'
                            }`}
                        >
                            <div className="flex justify-between items-baseline mb-1">
                <span
                    className={`text-sm truncate max-w-[65%] ${
                        selectedEmailId === email.id ? 'text-white font-medium' : 'text-gray-300'
                    }`}
                >
                  {email.from}
                </span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                  {formatDate(email.date)}
                </span>
                            </div>
                            <div className="text-sm text-gray-400 truncate font-medium mb-0.5">
                                {email.subject}
                            </div>
                            <div className="text-xs text-gray-600 truncate">{email.body}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};