import React, { memo } from "react";
import { Paperclip, Trash2 } from "lucide-react";
import { RowComponentProps } from "react-window";
import { Email } from "../../shared/types";

// Define the data needed by the row
export interface RowData {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (email: Email) => void;
  onDeleteEmail: (emailId: string) => void;
  formatDate: (date: string) => string;
}

// Combine react-window props with our custom data props
type EmailRowProps = RowComponentProps & RowData;

export const EmailRow = memo(
  ({
    index,
    style,
    emails,
    selectedEmailId,
    onSelectEmail,
    onDeleteEmail,
    formatDate,
  }: EmailRowProps) => {
    const email = emails[index];
    // Guard against potential index out of bounds during rapid updates
    if (!email) return null;

    const isUnread = !email.read;
    const isSelected = selectedEmailId === email.id;

    return (
      <div style={style} className="px-2">
        <div
          onClick={() => onSelectEmail(email)}
          className={`group relative p-3 my-1 rounded-lg cursor-pointer transition-all border border-transparent h-[92px] ${
            isSelected
              ? "bg-gray-800 border-gray-700 shadow-sm"
              : "hover:bg-gray-800/50"
          }`}
        >
          {/* Top Line: Sender & Date */}
          <div className="flex justify-between items-baseline mb-1">
            <span
              className={`text-sm truncate max-w-[65%] ${isUnread ? "text-white font-bold" : isSelected ? "text-white" : "text-gray-300"}`}
            >
              {email.from}
            </span>
            <div className="flex items-center space-x-2">
              {email.attachments && email.attachments.length > 0 && (
                <Paperclip size={12} className="text-gray-500" />
              )}
              <span className={`text-[10px] uppercase text-gray-500`}>
                {formatDate(email.date)}
              </span>
            </div>
          </div>

          {/* Subject */}
          <div
            className={`text-sm truncate mb-0.5 ${isUnread ? "text-gray-100 font-semibold" : "text-gray-400 font-medium"}`}
          >
            {email.subject}
          </div>

          {/* Preview Snippet */}
          <div className="text-xs text-gray-600 truncate">{email.body}</div>

          {/* Unread Dot */}
          {isUnread && (
            <div
              className="absolute left-1 top-4 w-1.5 h-1.5 bg-sky-500 rounded-full"
              title="Unread"
            />
          )}

          {/* Delete Button (Hover) */}
          <button
            className="absolute right-2 bottom-2 p-1.5 rounded-md bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-gray-700"
            onClick={e => {
              e.stopPropagation();
              onDeleteEmail(email.id);
            }}
            title="Move to Trash"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  },
);

EmailRow.displayName = "EmailRow";
