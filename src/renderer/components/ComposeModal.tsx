import React, { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { ToastType } from "./Toast";
import { Attachment } from "../../shared/types";
import { RichTextEditor } from "./RichTextEditor";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromAccount: string;
  onShowToast: (msg: string, type: ToastType) => void;
  signature?: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  fromAccount,
  onShowToast,
  signature,
}) => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // [UPDATED] Robust Signature Logic
  useEffect(() => {
    if (isOpen) {
      // When opening, if body is empty, insert signature.
      // Using a callback in setBody ensures we don't overwrite if state was somehow preserved.
      setBody(prev =>
        prev
          ? prev
          : signature
            ? `<br><br>${signature.replace(/\n/g, "<br>")}`
            : "",
      );
    } else {
      // Cleanup when closing
      setBody("");
      setAttachments([]);
      setTo("");
      setSubject("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only run when open state changes

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);

      const processedFiles: Attachment[] = await Promise.all(
        newFiles.map(file => {
          return new Promise<Attachment>(resolve => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const content = result.split(",")[1];
              resolve({
                filename: file.name,
                contentType: file.type || "application/octet-stream",
                size: file.size,
                content: content,
              });
            };
            reader.readAsDataURL(file);
          });
        }),
      );

      setAttachments(prev => [...prev, ...processedFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      onShowToast("Please fill in all fields.", "error");
      return;
    }

    setIsSending(true);
    try {
      // @ts-ignore
      const result = await window.ipcRenderer.sendEmail({
        accountId: fromAccount,
        to,
        subject,
        body,
        attachments,
      });

      if (result.success) {
        onShowToast("Email Sent Successfully!", "success");
        onClose();
      } else {
        onShowToast("Failed to send: " + result.error, "error");
      }
    } catch (e) {
      console.error(e);
      onShowToast("Error sending email.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 w-full max-w-4xl h-[90vh] rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-gray-850 rounded-t-xl">
          <h3 className="font-semibold text-white">New Message</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400 w-16">From:</span>
            <span className="text-sm text-gray-200 font-medium">
              {fromAccount}
            </span>
          </div>

          <div className="flex items-center space-x-2 border-b border-gray-700 pb-2">
            <span className="text-sm text-gray-400 w-16">To:</span>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
              placeholder="recipient@example.com"
              autoFocus
            />
          </div>

          <div className="flex items-center space-x-2 border-b border-gray-700 pb-2">
            <span className="text-sm text-gray-400 w-16">Subject:</span>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
              placeholder="What's this about?"
            />
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 py-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center bg-gray-700/50 border border-gray-600 rounded-md pl-3 pr-1 py-1"
                >
                  <span className="text-xs text-gray-200 truncate max-w-[150px]">
                    {att.filename}
                  </span>
                  <span className="text-[10px] text-gray-500 ml-2">
                    {(att.size / 1024).toFixed(0)}KB
                  </span>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="ml-2 p-1 hover:bg-gray-600 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-hidden flex flex-col">
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Write your message here..."
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-between items-center bg-gray-850">
          <div>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-full transition-colors flex items-center text-sm"
              title="Attach File"
            >
              <Paperclip size={18} />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={isSending}
            className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-md font-medium flex items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" /> Sending...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" /> Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
