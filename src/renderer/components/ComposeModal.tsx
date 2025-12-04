import React, { useState, useRef } from 'react';
import { X, Send, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { ToastType } from './Toast';
import { Attachment } from '../../shared/types';

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    fromAccount: string;
    onShowToast: (msg: string, type: ToastType) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, fromAccount, onShowToast }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]); // [NEW] State for files
    const [isSending, setIsSending] = useState(false);

    // [NEW] Ref for hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // [NEW] Handle File Selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            const processedFiles: Attachment[] = await Promise.all(newFiles.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Extract Base64 part (remove "data:image/png;base64," prefix)
                        const content = result.split(',')[1];
                        resolve({
                            filename: file.name,
                            contentType: file.type || 'application/octet-stream',
                            size: file.size,
                            content: content
                        });
                    };
                    reader.readAsDataURL(file);
                });
            }));

            setAttachments(prev => [...prev, ...processedFiles]);
        }
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // [NEW] Remove attachment
    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!to || !subject || !body) {
            onShowToast("Please fill in all fields.", 'error');
            return;
        }

        setIsSending(true);
        try {
            // @ts-ignore
            const result = await window.ipcRenderer.sendEmail({
                accountId: fromAccount,
                to,
                subject,
                body,
                attachments // [NEW] Pass attachments
            });

            if (result.success) {
                onShowToast("Email Sent Successfully!", 'success');
                // Reset Form
                setTo('');
                setSubject('');
                setBody('');
                setAttachments([]);
                onClose();
            } else {
                onShowToast("Failed to send: " + result.error, 'error');
            }
        } catch (e) {
            console.error(e);
            onShowToast("Error sending email.", 'error');
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
                    {/* From/To Inputs */}
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

                    {/* [NEW] Attachment List Area */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 py-2">
                            {attachments.map((att, idx) => (
                                <div key={idx} className="flex items-center bg-gray-700/50 border border-gray-600 rounded-md pl-3 pr-1 py-1">
                                    <span className="text-xs text-gray-200 truncate max-w-[150px]">{att.filename}</span>
                                    <span className="text-[10px] text-gray-500 ml-2">{(att.size / 1024).toFixed(0)}KB</span>
                                    <button
                                        onClick={() => removeAttachment(idx)}
                                        className="ml-2 p-1 hover:bg-gray-600 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        className="flex-1 bg-transparent text-white text-sm focus:outline-none resize-none placeholder-gray-600 leading-relaxed"
                        placeholder="Write your message here..."
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 flex justify-between items-center bg-gray-850">
                    {/* [NEW] Attachment Button */}
                    <div>
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-full transition-colors flex items-center text-sm"
                            title="Attach File"
                        >
                            <Paperclip size={18} />
                        </button>
                    </div>

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