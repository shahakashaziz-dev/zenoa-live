import React, { useEffect, useState } from 'react';
import { AlertTriangle, HeartPulse, ShieldAlert, Trash2, X } from 'lucide-react';

interface TermsSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasActiveSession: boolean;
  onDeleteAllData: () => Promise<void> | void;
}

export const TermsSafetyModal: React.FC<TermsSafetyModalProps> = ({
  isOpen,
  onClose,
  hasActiveSession,
  onDeleteAllData,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setConfirmingDelete(false);
      setDeleting(false);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDeleteAllData();
      setConfirmingDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-sky-300">
              <ShieldAlert className="w-4 h-4" aria-hidden="true" />
              <span>Responsible Use &amp; Data Deletion</span>
            </div>
            <h2 id="terms-modal-title" className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              Terms &amp; Safety
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close terms and safety modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/70 dark:bg-amber-950/30 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
              <HeartPulse className="w-4 h-4 text-amber-700 dark:text-amber-300" />
              <span>Friendly AI Disclaimer</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
              Zenoa is a friendly AI companion and study buddy designed for everyday conversation, learning support, and relaxation. Zenoa is <strong>not</strong> a doctor, licensed therapist, or substitute for professional medical, mental health, or emergency help. If you or someone near you is in immediate danger or crisis, please contact local emergency services or a trusted adult right away.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400 space-y-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Terms of Free Local Use</p>
            <p>
              Zenoa is provided free of charge for personal and educational use. Automated and on-device AI replies may occasionally be inaccurate—please double-check important schoolwork, facts, and calculations.
            </p>
          </div>

          {/* Google Play Account & Data Deletion Section */}
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4" />
              <span>Account &amp; Local Data Deletion</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-rose-800/90 dark:text-rose-200/80">
              Permanently remove your local profile, saved account credentials, and all chat history stored on this device.
            </p>

            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete My Account &amp; Clear All Data</span>
              </button>
            ) : (
              <div className="mt-3 space-y-2.5">
                <p className="text-xs font-medium text-rose-900 dark:text-rose-200">
                  Are you sure? This immediately clears all local chats, profile settings, and {hasActiveSession ? 'logs you out.' : 'stored accounts.'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleConfirmDelete}
                    className="flex-1 min-h-[42px] rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold px-3 py-2 transition-colors disabled:opacity-60"
                  >
                    {deleting ? 'Clearing Data…' : 'Yes, Delete Everything'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Zenoa v1.0 · Safety &amp; Terms
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium px-5 py-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
