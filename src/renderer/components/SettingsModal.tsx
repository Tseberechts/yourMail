import React, { useEffect, useState } from "react";
import { Key, Loader2, Save, X } from "lucide-react";
import { Account } from "../../shared/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onSave: (accountId: string, signature: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  account,
  onSave,
}) => {
  const [signature, setSignature] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "ai">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    if (account) {
      setSignature(account.signature || "");
    }
    // [NEW] Check if user already has an API key stored
    // @ts-ignore
    window.ipcRenderer.aiHasKey().then(setHasKey);
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const handleSave = async () => {
    setIsSaving(true);

    // Tab 1: General (Signature)
    if (activeTab === "general") {
      await onSave(account.id, signature);
      onClose();
    }

    // Tab 2: AI (API Key)
    if (activeTab === "ai") {
      if (apiKey) {
        // @ts-ignore
        const result = await window.ipcRenderer.aiSaveKey(apiKey);
        if (result.success) {
          setHasKey(true);
          setApiKey(""); // Clear input for security
          alert("API Key Validated & Saved Successfully! 🤖");
        } else {
          alert("Failed to save API Key: " + result.error);
        }
      }
    }
    setIsSaving(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-850">
          <h3 className="font-semibold text-white">Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "general" ? "text-sky-400 border-b-2 border-sky-400 bg-gray-800" : "text-gray-400 hover:text-gray-200 bg-gray-900"}`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "ai" ? "text-sky-400 border-b-2 border-sky-400 bg-gray-800" : "text-gray-400 hover:text-gray-200 bg-gray-900"}`}
          >
            AI Integration
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 min-h-[300px]">
          {activeTab === "general" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Signature
              </label>
              <textarea
                value={signature}
                onChange={e => setSignature(e.target.value)}
                className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-600 resize-none font-mono"
                placeholder="Enter your signature..."
              />
            </div>
          )}

          {activeTab === "ai" && (
            <div>
              <div className="bg-sky-900/20 border border-sky-700/50 p-4 rounded-lg mb-6">
                <h4 className="text-sky-400 font-medium text-sm mb-1 flex items-center">
                  <Key size={14} className="mr-2" /> Bring Your Own Key
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  YourMail uses Google Gemini for summarization and drafting.
                  Your key is stored securely in your OS Keychain and is never
                  sent to our servers.
                </p>
              </div>

              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-600"
                placeholder={
                  hasKey
                    ? "•••••••••••••••• (Key is set)"
                    : "Enter your API Key"
                }
              />

              <div className="mt-4 flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <span
                  className={`text-xs font-medium ${hasKey ? "text-green-400" : "text-red-400"}`}
                >
                  Status: {hasKey ? "✅ Connected" : "❌ Not Configured"}
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 hover:underline flex items-center"
                >
                  Get a key <span className="ml-1">→</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-850 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />{" "}
                {activeTab === "ai" ? "Validating..." : "Saving..."}
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" /> Save{" "}
                {activeTab === "ai" ? "Key" : "Changes"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
