import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Cog,
  File,
  Folder,
  Inbox,
  Mail,
  PenSquare,
  Plus,
  Send,
  Settings,
  Shield,
  Tag,
  Trash2,
  Layers,
} from "lucide-react";
import { Account, Mailbox } from "../../shared/types";

interface SidebarProps {
  accounts: Account[];
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  selectedFolder: string;
  onSelectFolder: (folderPath: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenAddAccount: () => void;
  onOpenCompose: () => void;
  onOpenSettings: (account: Account) => void;
  onOpenGlobalSettings: () => void;
}

interface MailboxNode {
  name: string;
  path: string;
  type?: string;
  children: MailboxNode[];
  level: number;
  rawName: string;
  delimiter: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  selectedFolder,
  onSelectFolder,
  collapsed,
  onToggleCollapse,
  onOpenAddAccount,
  onOpenCompose,
  onOpenSettings,
  onOpenGlobalSettings,
}) => {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchBoxes = async () => {
      setIsLoadingBoxes(true);
      try {
        // @ts-ignore
        const result = await window.ipcRenderer.getMailboxes(selectedAccountId);
        if (result.success) {
          setMailboxes(result.mailboxes);
        }
      } catch (e) {
        console.error("Failed to fetch mailboxes", e);
      } finally {
        setIsLoadingBoxes(false);
      }
    };
    fetchBoxes();
  }, [selectedAccountId]);

  const mailboxTree = useMemo(() => {
    const root: MailboxNode[] = [];
    const customRoots: MailboxNode[] = [];
    const map = new Map<string, MailboxNode>();

    // 1. Create nodes
    const nodes = mailboxes.map(box => {
      const parts = box.name.split(box.delimiter);
      const displayName = parts[parts.length - 1];

      return {
        name: displayName,
        path: box.path,
        type: box.type,
        children: [],
        level: parts.length - 1,
        rawName: box.name,
        delimiter: box.delimiter,
      };
    });

    // 2. Sort
    nodes.sort((a, b) => {
      const order = {
        inbox: 1,
        sent: 2,
        drafts: 3,
        archive: 4,
        trash: 5,
        junk: 6,
        normal: 99,
      };
      const typeA = order[a.type || "normal"] || 99;
      const typeB = order[b.type || "normal"] || 99;
      if (typeA !== typeB) return typeA - typeB;
      return a.name.localeCompare(b.name);
    });

    // 3. Map by rawName for parent lookup
    nodes.forEach(node => {
      map.set(node.rawName, node);
    });

    // 4. Build Tree
    nodes.forEach(node => {
      if (node.level === 0) {
        const isSystem = ["inbox", "sent", "drafts", "trash", "archive", "junk"].includes(node.type || "");
        if (isSystem) {
            root.push(node);
        } else {
            customRoots.push(node);
        }
      } else {
        const parentName = node.rawName.substring(
          0,
          node.rawName.lastIndexOf(node.delimiter),
        );
        const parent = map.get(parentName);
        if (parent) {
          parent.children.push(node);
        } else {
          // Fallback: treat orphans as custom roots
          customRoots.push(node);
        }
      }
    });

    // 5. Wrap custom roots in a virtual "Folders" node
    if (customRoots.length > 0) {
        root.push({
            name: "Folders",
            path: "##VIRTUAL_FOLDERS##",
            type: "virtual_folder_group",
            children: customRoots,
            level: 0,
            rawName: "Folders",
            delimiter: "/",
        });
    }

    return root;
  }, [mailboxes]);

  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const getFolderIcon = (
    type: string,
    hasChildren: boolean,
    isExpanded: boolean,
  ) => {
    if (type === "virtual_folder_group") {
        return <Layers size={16} />;
    }
    if (hasChildren) {
      return isExpanded ? (
        <Folder size={16} className="text-sky-400" />
      ) : (
        <Folder size={16} />
      );
    }
    switch (type) {
      case "inbox":
        return <Inbox size={16} />;
      case "sent":
        return <Send size={16} />;
      case "drafts":
        return <File size={16} />;
      case "trash":
        return <Trash2 size={16} />;
      case "archive":
        return <Archive size={16} />;
      case "junk":
        return <Trash2 size={16} />;
      default:
        return <Tag size={16} />;
    }
  };

  const renderTree = (nodes: MailboxNode[], depth: number = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.path);
      const hasChildren = node.children.length > 0;
      const isSelected = selectedFolder === node.path;
      const isVirtual = node.type === "virtual_folder_group";

      return (
        <div key={node.path}>
          <div
            className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-md cursor-pointer transition-colors mb-0.5 ${
              isSelected
                ? "bg-sky-500/10 text-sky-400 font-medium"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
                if (isVirtual) {
                    toggleNode(node.path);
                } else {
                    onSelectFolder(node.path);
                }
            }}
          >
            <div className="flex items-center min-w-0 flex-1">
              {/* Toggle Button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (hasChildren || isVirtual) {
                    toggleNode(node.path);
                  }
                }}
                className={`p-0.5 mr-1 rounded text-gray-500 hover:bg-gray-700 ${
                  (hasChildren || isVirtual) ? "visible" : "invisible"
                }`}
              >
                {isExpanded ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
              </button>

              <span className="mr-2 opacity-70">
                {getFolderIcon(node.type || "normal", hasChildren, isExpanded)}
              </span>
              <span className="truncate">{node.name}</span>
            </div>
          </div>

          {(hasChildren || isVirtual) && isExpanded && <div>{renderTree(node.children, depth + 1)}</div>}
        </div>
      );
    });
  };

  return (
    <div
      className={`${collapsed ? "w-16" : "w-64"} flex-shrink-0 bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col`}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-700 bg-gray-800/50">
        <h1
          className={`font-bold text-sky-500 truncate tracking-tight ${collapsed ? "hidden" : "block"}`}
        >
          YourMail
        </h1>
        <button
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-white"
        >
          <ArrowRight
            size={18}
            className={`transform transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {/* Compose Button */}
      <div className="p-3">
        <button
          onClick={onOpenCompose}
          className={`w-full flex items-center justify-center py-2.5 rounded-lg shadow-md transition-all ${
            collapsed
              ? "bg-gray-700 text-sky-400 hover:bg-gray-600"
              : "bg-sky-600 hover:bg-sky-500 text-white font-semibold"
          }`}
        >
          <PenSquare size={18} className={collapsed ? "" : "mr-2"} />
          {!collapsed && "Compose"}
        </button>
      </div>

      {/* Account List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {accounts.map(acc => {
          const isSelected = selectedAccountId === acc.id;

          return (
            <div key={acc.id} className="group/account">
              <div
                onClick={() => onSelectAccount(acc.id)}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer mb-1 transition-colors ${
                  isSelected
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {acc.type === "gmail" ? (
                    <Mail size={18} className="text-red-400 flex-shrink-0" />
                  ) : (
                    <Shield size={18} className="text-blue-400 flex-shrink-0" />
                  )}
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">
                      {acc.name}
                    </span>
                  )}
                </div>

                {!collapsed && isSelected && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onOpenSettings(acc);
                    }}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-600"
                    title="Account Settings"
                  >
                    <Settings size={14} />
                  </button>
                )}

                {!collapsed && acc.unread > 0 && (
                  <span className="bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center ml-2">
                    {acc.unread}
                  </span>
                )}
              </div>

              {isSelected && !collapsed && (
                <div className="mt-1 border-l border-gray-700/50 ml-2">
                  {isLoadingBoxes ? (
                    <div className="text-xs text-gray-500 p-2 pl-4">
                      Loading folders...
                    </div>
                  ) : (
                    renderTree(mailboxTree)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-gray-700 flex flex-col space-y-2">
        <button
          onClick={onOpenAddAccount}
          className="flex items-center justify-center w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-medium transition-colors border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white"
        >
          <Plus size={14} className={collapsed ? "" : "mr-2"} />
          {!collapsed && "Add Account"}
        </button>

        {/* Global Settings Button */}
        <button
          onClick={onOpenGlobalSettings}
          className="flex items-center justify-center w-full py-2 hover:bg-gray-700/50 rounded-md text-xs font-medium transition-colors text-gray-500 hover:text-gray-300"
          title="Global Settings"
        >
          <Cog size={14} className={collapsed ? "" : "mr-2"} />
          {!collapsed && "Settings"}
        </button>
      </div>
    </div>
  );
};
