import React, { useEffect, useState } from "react";
import { Bell, Loader2, Save, Trash2, User, X } from "lucide-react";
import { Account } from "../../shared/types";

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onSave: (
    accountId: string,
    data: { signature: string; name: string },
  ) => Promise<void>;
  onRemove: (accountId: string) => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  account,
  onSave,
  onRemove,
}) => {
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name || "");
      setSignature(account.signature || "");
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(account.id, { signature, name });
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
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Identity Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
              <User size={12} className="mr-2" /> Identity
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-600"
                placeholder="e.g. John Doe"
              />
              <p className="text-xs text-gray-500 mt-1">
                How your name appears to recipients.
              </p>
            </div>
          </div>

          {/* Signature Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Email Signature
            </label>
            <textarea
              value={signature}
              onChange={e => setSignature(e.target.value)}
              className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-600 resize-none font-mono"
              placeholder="Enter your signature..."
            />
          </div>

          {/* Notifications Section (Mock) */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
              <Bell size={12} className="mr-2" /> Preferences
            </h4>
            <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
              <div>
                <div className="text-sm text-gray-200">
                  Desktop Notifications
                </div>
                <div className="text-xs text-gray-500">
                  Show popups for new emails
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-10 h-5 rounded-full relative transition-colors ${notifications ? "bg-sky-600" : "bg-gray-700"}`}
              >
                <div
                  className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notifications ? "left-6" : "left-1"}`}
                />
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={() => onRemove(account.id)}
              className="flex items-center text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
            >
              <Trash2 size={16} className="mr-2" /> Remove this account
            </button>
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
                <Loader2 size={16} className="animate-spin mr-2" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
