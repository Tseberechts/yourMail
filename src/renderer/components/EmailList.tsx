import React, { useState } from "react";
import { Email } from "../../shared/types";
import { format } from "date-fns";
import { RefreshCw, Search, Trash2 } from "lucide-react";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (email: Email) => void;
  folderName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onDeleteEmail: (id: string) => void;
  onSearch: (query: string) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  folderName,
  onRefresh,
  isRefreshing,
  onDeleteEmail,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="flex flex-col flex-none w-80 min-w-[320px] bg-gray-900 border-r border-gray-700 h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold capitalize text-white truncate">
            {folderName}
          </h2>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-1.5 rounded-md hover:bg-gray-700 transition-colors ${
              isRefreshing ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Refresh"
          >
            <RefreshCw
              size={16}
              className={`text-gray-400 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 text-sm text-white placeholder-gray-400 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 border border-gray-700"
          />
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </form>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <span className="text-sm">No emails found</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {emails.map(email => (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`group relative p-3 cursor-pointer hover:bg-gray-800 transition-colors ${
                  selectedEmailId === email.id
                    ? "bg-gray-800 border-l-2 border-sky-500"
                    : "border-l-2 border-transparent"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-sm font-medium truncate pr-2 ${
                      email.read ? "text-gray-300" : "text-white"
                    }`}
                  >
                    {email.from}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {format(new Date(email.date), "MMM d")}
                  </span>
                </div>
                <div className="text-sm text-gray-400 truncate font-medium mb-0.5">
                  {email.subject || "(No Subject)"}
                </div>
                <div className="text-xs text-gray-500 truncate opacity-70">
                  {email.snippet}
                </div>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteEmail(email.id);
                  }}
                  className="absolute right-2 bottom-2 p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
