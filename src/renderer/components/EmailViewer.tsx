import React from 'react';
import { Archive, Trash2, Star, CornerDownLeft, Zap } from 'lucide-react';
import { Email } from '../../shared/types';
import DOMPurify from 'dompurify';

interface EmailViewerProps {
    email: Email | null;
    onDelete: (emailId: string) => void; // <--- NEW PROP
}

export const EmailViewer: React.FC<EmailViewerProps> = ({ email, onDelete }) => {
    if (!email) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
                <p>Select an email to view</p>
            </div>
        );
    }

    const sanitizedHtml = DOMPurify.sanitize(email.htmlBody || email.body, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick']
    });

    return (
        <div className="flex-1 flex flex-col bg-gray-900 min-w-0">
            {/* Toolbar */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-gray-700 bg-gray-900">
                <div className="flex space-x-1">
                    <button className="p-2 hover:bg-gray-800 rounded-md text-gray-400 transition-colors">
                        <Archive size={18} />
                    </button>

                    {/* DELETE BUTTON */}
                    <button
                        onClick={() => onDelete(email.id)}
                        className="p-2 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-md transition-colors"
                        title="Delete Email"
                    >
                        <Trash2 size={18} />
                    </button>

                    <button className="p-2 hover:bg-gray-800 rounded-md text-gray-400 transition-colors">
                        <Star size={18} />
                    </button>
                </div>
                <div className="flex space-x-2">
                    <button className="flex items-center px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-md shadow-sm transition-colors">
                        <CornerDownLeft size={16} className="mr-2" /> Reply
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Email Body */}
                <div className="flex-1 p-8 overflow-y-auto scroll-smooth">
                    <h1 className="text-2xl font-bold text-white mb-6 leading-tight">{email.subject}</h1>

                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                                {email.from[0]}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">{email.from}</div>
                                <div className="text-xs text-gray-500">
                                    To: <span className="text-gray-400">Me</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 font-medium bg-gray-800 px-2 py-1 rounded">
                            {new Date(email.date).toLocaleString()}
                        </div>
                    </div>

                    <div
                        className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-sm email-content"
                        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                    />
                </div>

                {/* AI Sidebar */}
                <div className="w-72 bg-gray-850 border-l border-gray-700 p-4 hidden xl:block">
                    <div className="flex items-center text-sky-400 font-medium mb-4 text-sm uppercase tracking-wider">
                        <Zap size={14} className="mr-2" /> AI Assistant
                    </div>

                    <div className="space-y-3">
                        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 transition-all hover:border-gray-600 group cursor-pointer">
                            <p className="text-xs text-gray-400 mb-3 group-hover:text-gray-300">
                                Summarize this thread?
                            </p>
                            <button className="w-full py-1.5 bg-gray-700 group-hover:bg-sky-600 text-xs text-white rounded border border-gray-600 group-hover:border-sky-500 transition-colors">
                                Generate Summary
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};