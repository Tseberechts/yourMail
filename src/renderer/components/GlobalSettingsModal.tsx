import React, { useEffect, useState } from "react";
import { Cpu, Key, Loader2, Monitor, Power, Save, X } from "lucide-react";
import { ToastType } from "./Toast";

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: ToastType) => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // UI State for non-persisted settings
  const [theme, setTheme] = useState("dark");
  const [aiModel, setAiModel] = useState("gemini-1.5-flash");
  const [autoStart, setAutoStart] = useState(false);

  // Initial Load Logic
  useEffect(() => {
    if (!isOpen) return;

    // Check API key status whenever modal opens
    // @ts-ignore
    window.ipcRenderer.aiHasKey().then(setHasKey);

    // Load other settings from localStorage if available
    setTheme(localStorage.getItem("ym_theme") || "dark");
    setAiModel(localStorage.getItem("ym_ai_model") || "gemini-1.5-flash");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);

    // Save UI prefs locally
    localStorage.setItem("ym_theme", theme);
    localStorage.setItem("ym_ai_model", aiModel);

    // Save API Key if changed
    if (apiKey) {
      // @ts-ignore
      const result = await window.ipcRenderer.aiSaveKey(apiKey);

      if (result.success) {
        setHasKey(true);
        setApiKey("");
        onShowToast("Settings Saved & Key Validated!", "success");
      } else {
        onShowToast("Settings Saved, but Key Failed: " + result.error, "error");
      }
    } else {
      onShowToast("Global Settings Saved", "success");
    }

    setIsSaving(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-850">
          <h3 className="font-semibold text-white">Global Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Appearance */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
              <Monitor size={12} className="mr-2" /> Appearance
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {["dark", "light", "system"].map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`py-2 px-3 rounded-md text-sm border transition-all capitalize ${
                    theme === t
                      ? "bg-sky-600/20 border-sky-500 text-sky-400"
                      : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* AI Configuration */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
              <Cpu size={12} className="mr-2" /> AI Configuration
            </h4>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Model Selection
              </label>
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:border-sky-500"
              >
                <option value="gemini-2.5-flash">
                  Gemini 2.5 Flash (Fast)
                </option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Smarter)</option>
              </select>
            </div>

            <div className="bg-sky-900/10 border border-sky-700/30 p-3 rounded-lg">
              <label className="block text-xs font-medium text-sky-400 mb-1 flex items-center">
                <Key size={10} className="mr-1" /> API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-xs text-gray-200 focus:outline-none focus:border-sky-500 placeholder-gray-600"
                placeholder={
                  hasKey
                    ? "•••••••••••••••• (Connected)"
                    : "Paste Gemini API Key"
                }
              />
              <div className="mt-2 flex justify-between items-center">
                <span
                  className={`text-[10px] ${hasKey ? "text-green-400" : "text-red-400"}`}
                >
                  {hasKey ? "✅ Key is valid" : "❌ Key missing"}
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-gray-500 hover:text-gray-300 underline"
                >
                  Get Key
                </a>
              </div>
            </div>
          </div>

          {/* System */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
              <Power size={12} className="mr-2" /> System
            </h4>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={e => setAutoStart(e.target.checked)}
                className="w-4 h-4 bg-gray-900 border-gray-700 rounded focus:ring-sky-500 focus:ring-offset-gray-900"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                Launch YourMail at login
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-850 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-md text-sm font-medium flex items-center shadow-md transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" /> Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
