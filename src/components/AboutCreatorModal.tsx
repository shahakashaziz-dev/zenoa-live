import React, { useEffect, useState } from 'react';
import { Code2, Download, Edit3, GraduationCap, Heart, ShieldCheck, X } from 'lucide-react';
import { CreatorProfile } from '../types/zenoa';
import { buildStandaloneIndexHtml } from '../utils/exportStandaloneHtml';

interface AboutCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: CreatorProfile;
  onSaveCreator: (profile: CreatorProfile) => void;
}

export const AboutCreatorModal: React.FC<AboutCreatorModalProps> = ({
  isOpen,
  onClose,
  creator,
  onSaveCreator,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CreatorProfile>(creator);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setDraft(creator);
  }, [creator]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCreator({
      name: draft.name.trim() || creator.name,
      grade: draft.grade.trim() || creator.grade,
      location: draft.location.trim() || creator.location,
      story: draft.story.trim() || creator.story,
    });
    setEditing(false);
  };

  const handleDownloadStandalone = () => {
    const html = buildStandaloneIndexHtml(creator);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-sky-300">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              <span>Zenoa v1.0 · Your Free AI Friend in Every Language</span>
            </div>
            <h2 id="about-modal-title" className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              About Zenoa &amp; Creator
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close about creator modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!editing ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-sky-50/80 dark:bg-indigo-950/40 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-sky-300 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-indigo-950 dark:text-sky-100">
                    Built by a Class 9 Student Developer
                  </p>
                  <p className="text-[11px] text-indigo-700 dark:text-sky-300">
                    Purpose: Your Free AI Friend in Every Language · Version v1.0
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{creator.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {creator.grade} · {creator.location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {creator.story}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                  <span>100% Browser-Private</span>
                </div>
                <p className="mt-1.5 leading-relaxed">
                  Zero backend servers, zero API keys, and zero tracking. Messages and voice stay on your device.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Heart className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                  <span>Free Forever</span>
                </div>
                <p className="mt-1.5 leading-relaxed">
                  Built so students and families anywhere—in Bengali, Hindi, English, or any tongue—can chat freely.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Code2 className="w-4 h-4 shrink-0" />
                <span>Deployable on GitHub Pages or Cloudflare Pages</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadStandalone}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>{downloaded ? 'Downloaded index.html' : 'Export Single index.html'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label htmlFor="creator-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Your Name
              </label>
              <input
                id="creator-name"
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="creator-grade" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Role / Class
                </label>
                <input
                  id="creator-grade"
                  type="text"
                  value={draft.grade}
                  onChange={(e) => setDraft({ ...draft, grade: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="creator-loc" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Location
                </label>
                <input
                  id="creator-loc"
                  type="text"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label htmlFor="creator-story" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Your Story
              </label>
              <textarea
                id="creator-story"
                rows={3}
                value={draft.story}
                onChange={(e) => setDraft({ ...draft, story: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(creator);
                  setEditing(false);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              >
                Save Story
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
