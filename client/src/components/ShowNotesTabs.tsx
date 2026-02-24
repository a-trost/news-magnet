import { useState, useCallback, useRef, useEffect } from "react";
import RichEditor from "./RichEditor";
import CollaborativeEditor from "./CollaborativeEditor";
import { useGenerateDraft, useRefineDraft } from "../api/hooks";
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

type ChatEntry = { role: "user" | "status"; content: string };

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
  isCollaborative?: boolean;
}

const Spinner = () => (
  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function ShowNotesTabs({ articleId, article, onSaveSection, onSavedStateChange, isCollaborative }: ShowNotesTabsProps) {
  const [activeTab, setActiveTab] = useState<ShowNotesSection>("notes_summary");
  const [draftContext, setDraftContext] = useState("");
  const [refineInput, setRefineInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentDraftRef = useRef<string>(article.notes_draft || "");

  const generateDraft = useGenerateDraft();
  const refineDraft = useRefineDraft();

  // Keep currentDraftRef in sync with external article changes
  useEffect(() => {
    if (article.notes_draft) {
      currentDraftRef.current = article.notes_draft;
    }
  }, [article.notes_draft]);

  // Auto-scroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSave = useCallback(
    (section: ShowNotesSection) => (html: string) => {
      onSaveSection(section, html);
      if (section === "notes_draft") {
        currentDraftRef.current = html;
      }
    },
    [onSaveSection],
  );

  const handleGenerate = useCallback(() => {
    setChatHistory([]);
    generateDraft.mutate(
      { id: articleId, context: draftContext.trim() || undefined },
      {
        onSuccess: () => {
          setDraftContext("");
        },
      },
    );
  }, [articleId, draftContext, generateDraft]);

  const handleRefine = useCallback(() => {
    const instruction = refineInput.trim();
    if (!instruction) return;

    setChatHistory((prev) => [...prev, { role: "user", content: instruction }]);
    setRefineInput("");

    refineDraft.mutate(
      { id: articleId, instruction, currentDraft: currentDraftRef.current },
      {
        onSuccess: () => {
          setChatHistory((prev) => [...prev, { role: "status", content: "Draft updated" }]);
        },
        onError: (err) => {
          setChatHistory((prev) => [
            ...prev,
            { role: "status", content: `Error: ${(err as Error).message}` },
          ]);
        },
      },
    );
  }, [articleId, refineInput, refineDraft]);

  const handleRefineKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleRefine();
      }
    },
    [handleRefine],
  );

  const handleRegenerate = useCallback(() => {
    setChatHistory([]);
    setDraftContext("");
    generateDraft.mutate({ id: articleId });
  }, [articleId, generateDraft]);

  const isPending = generateDraft.isPending || refineDraft.isPending;
  const hasDraft = !!article.notes_draft;

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
          {/* Draft tab: generate prompt BEFORE editor when no draft exists */}
          {tab.key === "notes_draft" && !hasDraft && (
            <div className="mb-2 space-y-2">
              <textarea
                value={draftContext}
                onChange={(e) => setDraftContext(e.target.value)}
                rows={2}
                className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                placeholder="Optional: guide the take — e.g. 'focus on the developer experience angle' or 'we think this is overhyped, be skeptical'"
                disabled={isPending}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generateDraft.isPending ? (
                    <>
                      <Spinner />
                      Generating...
                    </>
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

          {/* Editor */}
          {isCollaborative ? (
            <CollaborativeEditor
              field={tab.key}
              initialContent={article[tab.key] || ""}
              onSave={handleSave(tab.key)}
              onSavedStateChange={onSavedStateChange}
              placeholder={
                tab.key === "notes_draft"
                  ? "Click 'Generate Draft' to create a script segment from your show notes..."
                  : `${tab.label} will appear here after processing...`
              }
              className="bg-gray-50 dark:bg-gray-800"
            />
          ) : (
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
          )}

          {/* Draft tab: speaking time + chat refinement UI AFTER editor */}
          {tab.key === "notes_draft" && (
            <>
              {/* Speaking time */}
              {(() => {
                const duration = speakingTime(article.notes_draft);
                return duration ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{duration}</p>
                ) : null;
              })()}

              {/* Chat history + refinement input (only when draft exists) */}
              {hasDraft && (
                <div className="mt-3 space-y-2">
                  {/* Chat history */}
                  {chatHistory.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800/50">
                      {chatHistory.map((entry, i) => (
                        <div key={i} className={entry.role === "user" ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500 italic"}>
                          {entry.role === "user" ? (
                            <span><span className="font-medium text-indigo-600 dark:text-indigo-400">You:</span> {entry.content}</span>
                          ) : (
                            <span>{entry.content}</span>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  )}

                  {/* Refinement input */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      onKeyDown={handleRefineKeyDown}
                      disabled={isPending}
                      className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      placeholder="Refine: e.g. 'make the opening more dramatic' or 'change the sports reference to pop culture'"
                    />
                    <button
                      onClick={handleRefine}
                      disabled={isPending || !refineInput.trim()}
                      className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                    >
                      {refineDraft.isPending ? (
                        <>
                          <Spinner />
                          Sending...
                        </>
                      ) : (
                        "Send"
                      )}
                    </button>
                  </div>

                  {/* Regenerate from scratch link */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRegenerate}
                      disabled={isPending}
                      className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Regenerate from scratch
                    </button>
                    {(generateDraft.isError || refineDraft.isError) && (
                      <span className="text-xs text-red-500">
                        {((generateDraft.error || refineDraft.error) as Error)?.message}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
