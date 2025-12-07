import React, { useEffect, useState } from "react";
import { Copy, Loader2, PenTool, Sparkles, Zap } from "lucide-react";
import { Email } from "../../shared/types";

interface AiAssistantProps {
  email: Email | null;
  aiModel: string; // [UPDATED] Receive model from parent
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ email, aiModel }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const [draftInstruction, setDraftInstruction] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);

  // Reset state when email changes
  useEffect(() => {
    setSummary(null);
    setDraft(null);
    setDraftInstruction("");
    setIsLoadingSummary(false);
    setIsDrafting(false);
  }, [email?.id]);

  const handleSummarize = async () => {
    if (!email) return;
    setIsLoadingSummary(true);
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.aiSummarize(
        email.body || email.htmlBody,
        aiModel,
      );
      if (result.success) {
        setSummary(result.text);
      } else {
        console.error(result.error);
        alert("AI Error: " + result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleDraft = async () => {
    if (!email || !draftInstruction) return;
    setIsDrafting(true);
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.aiDraft(
        email.body || email.htmlBody,
        draftInstruction,
        aiModel,
      );
      if (result.success) {
        setDraft(result.text);
      } else {
        console.error(result.error);
        alert("AI Error: " + result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDrafting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Helper for badge display
  const getModelBadge = (m: string) => {
    if (m.includes("3-pro")) return "3 Pro";
    if (m.includes("lite")) return "Lite";
    if (m.includes("flash")) return "Flash";
    if (m.includes("pro")) return "Pro";
    return "AI";
  };

  if (!email) {
    return (
      <div className="w-72 bg-gray-850 border-l border-gray-700 p-6 hidden xl:flex flex-col items-center justify-center text-gray-500 text-center">
        <Zap size={24} className="mb-2 opacity-50" />
        <p className="text-xs">Select an email to use AI tools.</p>
      </div>
    );
  }

  return (
    <div className="w-72 bg-gray-850 border-l border-gray-700 flex flex-col h-full hidden xl:flex">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center text-sky-400 font-medium text-sm uppercase tracking-wider">
          <Zap size={14} className="mr-2" /> AI Assistant
        </div>
        {/* [UPDATED] Uses aiModel prop directly */}
        <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 font-mono transition-all">
          {getModelBadge(aiModel)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Summarize Section */}
        <div className="space-y-3">
          <h4 className="text-gray-300 text-xs font-semibold uppercase">
            Quick Actions
          </h4>

          {!summary ? (
            <button
              onClick={handleSummarize}
              disabled={isLoadingSummary}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded border border-gray-700 hover:border-sky-500 transition-all flex items-center justify-center group"
            >
              {isLoadingSummary ? (
                <Loader2 size={14} className="animate-spin mr-2" />
              ) : (
                <Sparkles
                  size={14}
                  className="mr-2 text-sky-400 group-hover:text-white"
                />
              )}
              Summarize this email
            </button>
          ) : (
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sky-400 text-[10px] uppercase font-bold">
                  Summary
                </span>
                <button
                  onClick={() => copyToClipboard(summary)}
                  className="text-gray-500 hover:text-white"
                  title="Copy"
                >
                  <Copy size={12} />
                </button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            </div>
          )}
        </div>

        {/* Draft Reply Section */}
        <div className="space-y-3 border-t border-gray-700 pt-6">
          <h4 className="text-gray-300 text-xs font-semibold uppercase">
            Smart Reply
          </h4>

          <textarea
            value={draftInstruction}
            onChange={e => setDraftInstruction(e.target.value)}
            placeholder="E.g. Tell them I'm interested but busy until Monday..."
            className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-sky-500 resize-none h-20"
          />

          <button
            onClick={handleDraft}
            disabled={isDrafting || !draftInstruction}
            className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDrafting ? (
              <Loader2 size={14} className="animate-spin mr-2" />
            ) : (
              <PenTool size={14} className="mr-2" />
            )}
            Generate Draft
          </button>

          {draft && (
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 mt-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-start mb-2">
                <span className="text-green-400 text-[10px] uppercase font-bold">
                  Draft
                </span>
                <button
                  onClick={() => copyToClipboard(draft)}
                  className="text-gray-500 hover:text-white"
                  title="Copy"
                >
                  <Copy size={12} />
                </button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono bg-gray-900/50 p-2 rounded">
                {draft}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
