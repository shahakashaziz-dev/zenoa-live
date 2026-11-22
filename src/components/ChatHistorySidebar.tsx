import React, { useEffect } from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { ChatSession } from '../types/zenoa';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

function formatRelativeDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-history-title"
      className="fixed inset-0 z-50 flex bg-slate-950/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        className="w-80 max-w-[85vw] h-full flex flex-col bg-white dark:bg-slate-900 border-r border-indigo-100 dark:border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drawer Header */}
        <div className="shrink-0 h-14 px-4 border-b border-indigo-100/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              Z
            </div>
            <h2
              id="chat-history-title"
              className="text-base font-bold text-slate-900 dark:text-white truncate"
            >
              Chat History
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat history"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-sky-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* + New Chat CTA */}
        <div className="shrink-0 p-3 border-b border-indigo-100/60 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Saved Chats List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5">
          {sessions.length === 0 ? (
            <div className="rounded-2xl bg-sky-50/70 dark:bg-slate-950 border border-indigo-100/80 dark:border-slate-800 p-4 text-center mt-4">
              <MessageSquare className="w-6 h-6 text-indigo-500 dark:text-sky-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                No saved chats yet
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Start chatting with Zenoa and your conversations will automatically save here on your device.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const userTurns = session.messages.filter((m) => m.role === 'user').length;

              return (
                <div
                  key={session.id}
                  className={`group flex items-center gap-1.5 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-sky-50 border-indigo-200 dark:bg-slate-800 dark:border-slate-700'
                      : 'bg-white dark:bg-slate-900 border-transparent hover:bg-sky-50/60 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className="flex-1 min-w-0 min-h-[48px] flex items-center gap-2.5 px-3 py-2 text-left"
                  >
                    <MessageSquare
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-indigo-600 dark:text-sky-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        dir="auto"
                        className={`text-xs font-medium truncate ${
                          isActive
                            ? 'text-indigo-950 dark:text-white'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {session.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {formatRelativeDate(session.updatedAt)} · {userTurns}{' '}
                        {userTurns === 1 ? 'question' : 'questions'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    aria-label={`Delete chat ${session.title}`}
                    title="Delete chat"
                    className="min-h-[38px] min-w-[38px] mr-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
