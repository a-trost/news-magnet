import { useState, useCallback, useMemo } from "react";
import RichEditor from "./RichEditor";
import { useGenerateDraft } from "../api/hooks";
import type { ShowNotesSection } from "../api/hooks";

/** ~150 wpm for conversational on-camera delivery */
const SPEAKING_WPM = 150;

function speakingTime(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]*>/g, " ").replace(/&\w+;/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  const minutes = words / SPEAKING_WPM;
  if (minutes < 1) return `${Math.round(minutes * 60)}s to speak`;
  const whole = Math.floor(minutes);
  const secs = Math.round((minutes - whole) * 60);
  if (secs === 0) return `${whole}m to speak`;
  return `${whole}m ${secs}s to speak`;
}

interface Tab {
  key: ShowNotesSection;
  label: string;
}

const TABS: Tab[] = [
  { key: "notes_summary", label: "Summary" },
  { key: "notes_why", label: "Why It Matters" },
  { key: "notes_comedy", label: "Comedy Angles" },
  { key: "notes_talking", label: "Talking Points" },
  { key: "notes_draft", label: "Draft" },
];

interface ShowNotesTabsProps {
  articleId: number;
  article: {
    notes_summary: string | null;
    notes_why: string | null;
    notes_comedy: string | null;
    notes_talking: string | null;
    notes_draft: string | null;
  };
  onSaveSection: (section: ShowNotesSection, content: string) => void;
  onSavedStateChange: (saved: boolean) => void;
}

export default function ShowNotesTabs({ articleId, article, onSaveSection, onSavedStateChange }: ShowNotesTabsProps) {
  const [activeTab, setActiveTab] = useState<ShowNotesSection>("notes_summary");
  const [draftContext, setDraftContext] = useState("");
  const generateDraft = useGenerateDraft();

  const handleSave = useCallback(
    (section: ShowNotesSection) => (html: string) => {
      onSaveSection(section, html);
    },
    [onSaveSection],
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0.5 mb-2 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-xs px-2.5 py-1.5 -mb-px border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 font-medium"
                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels — all mounted, hidden via CSS to preserve TipTap undo history */}
      {TABS.map((tab) => (
        <div key={tab.key} className={activeTab === tab.key ? "" : "hidden"}>
          {/* Generate Draft button — only on the Draft tab */}
          {tab.key === "notes_draft" && (
            <div className="mb-2 space-y-2">
              <textarea
                value={draftContext}
                onChange={(e) => setDraftContext(e.target.value)}
                rows={2}
                className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                placeholder="Optional: guide the take — e.g. 'focus on the developer experience angle' or 'we think this is overhyped, be skeptical'"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateDraft.mutate({ id: articleId, context: draftContext.trim() || undefined })}
                  disabled={generateDraft.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generateDraft.isPending ? (
                    <>
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : article.notes_draft ? (
                    "Regenerate Draft"
                  ) : (
                    "Generate Draft"
                  )}
                </button>
                {generateDraft.isError && (
                  <span className="text-xs text-red-500">
                    {(generateDraft.error as Error).message}
                  </span>
                )}
              </div>
            </div>
          )}
          <RichEditor
            content={article[tab.key] || ""}
            onSave={handleSave(tab.key)}
            onSavedStateChange={onSavedStateChange}
            placeholder={
              tab.key === "notes_draft"
                ? "Click 'Generate Draft' to create a script segment from your show notes..."
                : `${tab.label} will appear here after processing...`
            }
            className="bg-gray-50 dark:bg-gray-800"
          />
          {tab.key === "notes_draft" && (() => {
            const duration = speakingTime(article.notes_draft);
            return duration ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{duration}</p>
            ) : null;
          })()}
        </div>
      ))}
    </div>
  );
}
