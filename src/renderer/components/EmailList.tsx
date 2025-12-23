import React, { useState, useMemo } from "react";
import { Email } from "../../shared/types";
import { format } from "date-fns";
import { RefreshCw, Search, Trash2, ArrowUpDown, Check, Filter } from "lucide-react";

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

type SortOption = "date-desc" | "date-asc" | "sender-asc" | "sender-desc" | "unread";

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
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    unread: false,
    hasAttachments: false,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const filteredAndSortedEmails = useMemo(() => {
    let result = [...emails];

    // Apply Filters
    if (filters.unread) {
      result = result.filter(email => !email.read);
    }
    if (filters.hasAttachments) {
      result = result.filter(email => email.attachments && email.attachments.length > 0);
    }

    // Apply Sort
    switch (sortOption) {
      case "date-desc":
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case "date-asc":
        return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case "sender-asc":
        return result.sort((a, b) => a.from.localeCompare(b.from));
      case "sender-desc":
        return result.sort((a, b) => b.from.localeCompare(a.from));
      case "unread":
        return result.sort((a, b) => {
          if (a.read === b.read) {
             // Secondary sort by date
             return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return a.read ? 1 : -1;
        });
      default:
        return result;
    }
  }, [emails, sortOption, filters]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "date-desc", label: "Newest First" },
    { value: "date-asc", label: "Oldest First" },
    { value: "sender-asc", label: "Sender (A-Z)" },
    { value: "sender-desc", label: "Sender (Z-A)" },
    { value: "unread", label: "Unread First" },
  ];

  return (
    <div className="flex flex-col flex-none w-80 min-w-[320px] bg-gray-900 border-r border-gray-700 h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold capitalize text-white truncate">
            {folderName}
          </h2>
          <div className="flex items-center gap-1">
             {/* Filter Button */}
             <div className="relative">
              <button
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`p-1.5 rounded-md hover:bg-gray-700 transition-colors ${
                  (filters.unread || filters.hasAttachments) ? "text-sky-400" : "text-gray-400"
                }`}
                title="Filter"
              >
                <Filter size={16} />
              </button>
              
              {isFilterMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsFilterMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 py-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Filters
                    </div>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, unread: !prev.unread }))}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center justify-between"
                    >
                      Unread Only
                      {filters.unread && <Check size={14} className="text-sky-500" />}
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, hasAttachments: !prev.hasAttachments }))}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center justify-between"
                    >
                      Has Attachments
                      {filters.hasAttachments && <Check size={14} className="text-sky-500" />}
                    </button>
                    {(filters.unread || filters.hasAttachments) && (
                        <div className="border-t border-gray-700 mt-1 pt-1">
                            <button
                              onClick={() => {
                                  setFilters({ unread: false, hasAttachments: false });
                                  setIsFilterMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-700"
                            >
                              Clear Filters
                            </button>
                        </div>
                    )}
                  </div>
                </>
              )}
            </div>

             {/* Sort Button */}
             <div className="relative">
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="p-1.5 rounded-md hover:bg-gray-700 transition-colors text-gray-400"
                title="Sort"
              >
                <ArrowUpDown size={16} />
              </button>
              
              {isSortMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsSortMenuOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 py-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Sort By
                    </div>
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortOption(option.value);
                          setIsSortMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center justify-between"
                      >
                        {option.label}
                        {sortOption === option.value && <Check size={14} className="text-sky-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-1.5 rounded-md hover:bg-gray-700 transition-colors ${
                isRefreshing ? "cursor-not-allowed" : ""
              }`}
              title="Refresh"
            >
              <RefreshCw
                size={16}
                className={`text-gray-400 ${isRefreshing ? "animate-spin text-sky-500" : ""}`}
              />
            </button>
          </div>
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
        {filteredAndSortedEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <span className="text-sm">No emails found</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredAndSortedEmails.map(email => (
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
                    className={`text-sm truncate pr-2 ${
                      email.read ? "font-normal text-gray-400" : "font-bold text-white"
                    }`}
                  >
                    {email.from}
                  </span>
                  <span className={`text-xs whitespace-nowrap ${
                      email.read ? "text-gray-500" : "text-sky-400 font-medium"
                    }`}>
                    {format(new Date(email.date), "MMM d")}
                  </span>
                </div>
                <div className={`text-sm truncate mb-0.5 ${
                  email.read ? "font-normal text-gray-500" : "font-semibold text-gray-200"
                }`}>
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
