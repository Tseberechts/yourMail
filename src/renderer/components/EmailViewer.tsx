import React from 'react';
import { Archive, Trash2, Star, CornerDownLeft, Zap, Paperclip, Download } from 'lucide-react';
import { Email } from '../../shared/types';
import DOMPurify from 'dompurify';

interface EmailViewerProps {
    email: Email | null;
    onDelete: (emailId: string) => void;
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

    const downloadAttachment = (att: any) => {
        const link = document.createElement('a');
        link.href = `data:${att.contentType};base64,${att.content}`;
        link.download = att.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // [NEW] Intercept Link Clicks
    const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');

        if (anchor && anchor.href) {
            e.preventDefault();
            // @ts-ignore
            window.ipcRenderer.openExternal(anchor.href);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-900 min-w-0">
            {/* Toolbar */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-gray-700 bg-gray-900">
                <div className="flex space-x-1">
                    <button className="p-2 hover:bg-gray-800 rounded-md text-gray-400 transition-colors">
                        <Archive size={18} />
                    </button>

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

                    {/* Attachments Section */}
                    {email.attachments && email.attachments.length > 0 && (
                        <div className="mb-6 pb-6 border-b border-gray-800">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                <Paperclip size={14} className="mr-2" />
                                {email.attachments.length} Attachment{email.attachments.length !== 1 && 's'}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {email.attachments.map((att, index) => (
                                    <div
                                        key={index}
                                        className="group flex items-center bg-gray-800 border border-gray-700 rounded-md px-3 py-2 hover:border-gray-600 transition-all cursor-pointer"
                                        onClick={() => downloadAttachment(att)}
                                    >
                                        <div className="mr-3">
                                            <p className="text-sm text-gray-200 font-medium truncate max-w-[150px]">{att.filename}</p>
                                            <p className="text-[10px] text-gray-500">{(att.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button className="text-gray-500 group-hover:text-sky-400 transition-colors">
                                            <Download size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div
                        className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-sm email-content"
                        onClick={handleBodyClick}
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