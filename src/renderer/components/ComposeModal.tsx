import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    fromAccount: string; // The account sending the email
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, fromAccount }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!to || !subject || !body) {
            alert("Please fill in all fields.");
            return;
        }

        setIsSending(true);
        try {
            // @ts-ignore
            const result = await window.ipcRenderer.sendEmail({
                accountId: fromAccount,
                to,
                subject,
                body
            });

            if (result.success) {
                alert("Email Sent!");
                onClose();
                // Clear form
                setTo('');
                setSubject('');
                setBody('');
            } else {
                alert("Failed to send: " + result.error);
            }
        } catch (e) {
            console.error(e);
            alert("Error sending email.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 w-full max-w-2xl h-[80vh] rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-gray-850 rounded-t-xl">
                    <h3 className="font-semibold text-white">New Message</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400 w-16">From:</span>
                        <span className="text-sm text-gray-200 font-medium">{fromAccount}</span>
                    </div>

                    <div className="flex items-center space-x-2 border-b border-gray-700 pb-2">
                        <span className="text-sm text-gray-400 w-16">To:</span>
                        <input
                            type="email"
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                            placeholder="recipient@example.com"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center space-x-2 border-b border-gray-700 pb-2">
                        <span className="text-sm text-gray-400 w-16">Subject:</span>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                            placeholder="What's this about?"
                        />
                    </div>

                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        className="flex-1 bg-transparent text-white text-sm focus:outline-none resize-none placeholder-gray-600 leading-relaxed"
                        placeholder="Write your message here..."
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-md font-medium flex items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2" /> Sending...
                            </>
                        ) : (
                            <>
                                <Send size={16} className="mr-2" /> Send
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};