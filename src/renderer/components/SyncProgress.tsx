import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface SyncStatus {
  accountId: string;
  folder: string;
  current: number;
  total: number;
}

export const SyncProgress: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // @ts-ignore
    const removeListener = window.ipcRenderer.on(
      "sync:progress",
      (data: SyncStatus) => {
        setStatus(data);
        setIsVisible(true);

        // Hide after completion or timeout
        if (data.current >= data.total) {
          setTimeout(() => setIsVisible(false), 2000);
        }
      }
    );

    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  if (!isVisible || !status) return null;

  const percentage = Math.min(100, Math.round((status.current / status.total) * 100));

  return (
    <div className="fixed bottom-4 right-4 z-50 group">
      <div className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1.5 shadow-lg flex items-center space-x-3 transition-all hover:rounded-lg hover:px-4 hover:py-3">
        
        {/* Compact View (Spinner) */}
        <div className="relative flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-sky-500" />
        </div>

        {/* Expanded View (Details on Hover) */}
        <div className="hidden group-hover:block min-w-[150px]">
            <div className="text-xs text-gray-300 font-medium mb-1 flex justify-between">
                <span>Syncing {status.folder}...</span>
                <span>{percentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div 
                    className="bg-sky-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-[10px] text-gray-500 mt-1 text-right">
                {status.current} / {status.total}
            </div>
        </div>
      </div>
    </div>
  );
};
