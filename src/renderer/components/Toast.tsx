import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
    return (
        <div className="absolute bottom-6 right-6 z-[60] flex flex-col space-y-2 pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    // Auto-dismiss after 4 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const bgColors = {
        success: 'bg-gray-800 border-l-4 border-green-500',
        error: 'bg-gray-800 border-l-4 border-red-500',
        info: 'bg-gray-800 border-l-4 border-blue-500',
    };

    const icons = {
        success: <CheckCircle size={18} className="text-green-500" />,
        error: <AlertCircle size={18} className="text-red-500" />,
        info: <Info size={18} className="text-blue-500" />,
    };

    return (
        <div className={`${bgColors[toast.type]} text-white px-4 py-3 rounded shadow-xl flex items-center space-x-3 pointer-events-auto min-w-[300px] animate-in slide-in-from-right-10 fade-in duration-300`}>
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-400 hover:text-white transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};