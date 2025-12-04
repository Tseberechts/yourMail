import React, {useEffect, useState} from 'react';
import {Loader2, Save, X} from 'lucide-react';
import {Account} from '../../shared/types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: Account | null;
    onSave: (accountId: string, signature: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({isOpen, onClose, account, onSave}) => {
    const [signature, setSignature] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (account) {
            setSignature(account.signature || '');
        }
    }, [account]);

    if (!isOpen || !account) return null;

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(account.id, signature);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-850">
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-white">Account Settings</h3>
                        <span className="text-xs text-gray-400">{account.id}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20}/>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email Signature
                        </label>
                        <textarea
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-600 resize-none font-mono"
                            placeholder="Enter your signature..."
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            This signature will be appended to all new emails sent from this account.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-850 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center shadow-md transition-colors"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2"/> Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} className="mr-2"/> Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};