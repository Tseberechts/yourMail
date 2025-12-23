import { useState, useEffect, useCallback } from "react";
import { Email } from "../../shared/types";

interface UseEmailSelectionProps {
  filteredAndSortedEmails: Email[];
  markAsRead: (emailId: string) => Promise<void>;
  deleteEmail: (emailId: string) => Promise<void>;
}

export const useEmailSelection = ({
  filteredAndSortedEmails,
  markAsRead,
  deleteEmail,
}: UseEmailSelectionProps) => {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Auto-mark as read
  useEffect(() => {
    if (selectedEmail && !selectedEmail.read) {
      const timer = setTimeout(() => {
        markAsRead(selectedEmail.id);
        setSelectedEmail(prev => (prev ? { ...prev, read: true } : null));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedEmail, markAsRead]);

  const handleDeleteWrapper = useCallback(async (emailId: string) => {
    // Auto-select next email
    if (selectedEmail?.id === emailId) {
      const currentIndex = filteredAndSortedEmails.findIndex(e => e.id === emailId);
      if (currentIndex !== -1) {
        // Try next email, else previous
        const nextEmail = filteredAndSortedEmails[currentIndex + 1] || filteredAndSortedEmails[currentIndex - 1] || null;
        setSelectedEmail(nextEmail);
      } else {
        setSelectedEmail(null);
      }
    }
    await deleteEmail(emailId);
  }, [selectedEmail, filteredAndSortedEmails, deleteEmail]);

  return {
    selectedEmail,
    setSelectedEmail,
    handleDeleteWrapper,
  };
};
