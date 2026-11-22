import React, { useEffect } from 'react';
import { Database, Lock, Mic, ServerOff, ShieldCheck, X } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-sky-300">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>100% Privacy-First Architecture</span>
            </div>
            <h2 id="privacy-modal-title" className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              Privacy Policy
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close privacy policy"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Zenoa is designed from the ground up to be <strong>100% privacy-first</strong>. We believe your thoughts, questions, and study notes belong solely to you.
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
              <Database className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
              <span>Local-Only Storage (localStorage)</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              All chat conversations, language settings, and user profile details (name, avatar, and local account credentials) are stored exclusively on your device inside your browser&apos;s <code className="font-mono">localStorage</code>.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
              <ServerOff className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
              <span>Zero External Server Collection</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Zenoa operates with zero backend servers, zero analytics trackers, and zero third-party ad SDKs. Zero personal data is ever uploaded, sold, or transmitted to any external server.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
              <Mic className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Voice, Study Photos &amp; Keyless AI</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Voice input/playback use native browser APIs, and textbook photo text reading runs locally inside your browser—your photos are never uploaded to any server. General AI questions use free, stateless public endpoints without sharing your identity.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
              <span>Full Data Control</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              You can clear chats anytime or permanently erase your local account and all stored data from the <strong>Terms &amp; Safety</strong> menu.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Zenoa v1.0 · Local Privacy Standard
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
