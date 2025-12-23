import { useState, useMemo } from "react";
import { Email } from "../../shared/types";
import { SortOption, FilterState } from "../components/EmailList";

export const useEmailFilterSort = (emails: Email[]) => {
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [filters, setFilters] = useState<FilterState>({
    unread: false,
    hasAttachments: false,
  });

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

  return {
    sortOption,
    setSortOption,
    filters,
    setFilters,
    filteredAndSortedEmails,
  };
};
