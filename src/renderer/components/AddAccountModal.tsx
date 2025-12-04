import React, { useState } from 'react';
import { X, Mail, Shield } from 'lucide-react';
import { AccountType } from '../../shared/types';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose }) => {
    const [newAccountType, setNewAccountType] = useState<AccountType>('gmail');

    if (!isOpen) return null;

    const handleConnect = () => {
        alert(`Connecting to ${newAccountType}... (Logic to be implemented in Phase 2)`);
        onClose();
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-850">
                    <h3 className="font-semibold text-lg text-white">Add New Account</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex space-x-4 mb-6">
                        <button
                            onClick={() => setNewAccountType('gmail')}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                newAccountType === 'gmail'
                                    ? 'border-red-500 bg-red-500/10 text-white'
                                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <Mail size={24} className="mb-2 text-red-500" />
                            <span className="text-sm font-medium">Gmail</span>
                        </button>
                        <button
                            onClick={() => setNewAccountType('exchange')}
                            className={`flex-1 py-3 px-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                newAccountType === 'exchange'
                                    ? 'border-blue-500 bg-blue-500/10 text-white'
                                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <Shield size={24} className="mb-2 text-blue-500" />
                            <span className="text-sm font-medium">Exchange</span>
                        </button>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-6">
                        <p className="text-sm text-gray-300 mb-2">
                            To connect your {newAccountType === 'gmail' ? 'Google' : 'Microsoft'} account, we will
                            open your browser to securely authorize YourMail.
                        </p>
                        <div className="flex items-center text-xs text-gray-500">
                            <Shield size={12} className="mr-1" /> Credentials are stored securely in your OS
                            Keychain.
                        </div>
                    </div>

                    <button
                        onClick={handleConnect}
                        className={`w-full py-2.5 rounded-lg font-medium text-white shadow-lg transition-transform active:scale-[0.98] ${
                            newAccountType === 'gmail'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        Connect {newAccountType === 'gmail' ? 'Gmail' : 'Office 365'}
                    </button>
                </div>
            </div>
        </div>
    );
};