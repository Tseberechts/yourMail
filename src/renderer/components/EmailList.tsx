import React from 'react';
import { Email } from '../../shared/types';

interface EmailListProps {
    emails: Email[];
    selectedEmailId: string | null;
    onSelectEmail: (email: Email) => void;
    folderName: string;
}

export const EmailList: React.FC<EmailListProps> = ({
                                                        emails,
                                                        selectedEmailId,
                                                        onSelectEmail,
                                                        folderName,
                                                    }) => {
    return (
        <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
            <div className="h-14 flex items-center px-4 border-b border-gray-700 bg-gray-900/95 backdrop-blur">
                <h2 className="font-semibold text-gray-200 capitalize text-sm">{folderName}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {emails.map((email) => (
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
                  className={`text-sm truncate max-w-[70%] ${
                      selectedEmailId === email.id ? 'text-white font-medium' : 'text-gray-300'
                  }`}
              >
                {email.from}
              </span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                {email.date}
              </span>
                        </div>
                        <div className="text-sm text-gray-400 truncate font-medium mb-0.5">
                            {email.subject}
                        </div>
                        <div className="text-xs text-gray-600 truncate">{email.body}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};