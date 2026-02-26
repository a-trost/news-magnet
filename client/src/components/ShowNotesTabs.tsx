import { useState, useCallback, useRef, useEffect } from "react";
import RichEditor from "./RichEditor";
import CollaborativeEditor from "./CollaborativeEditor";
import { useGenerateDraft, useRefineDraft, useRefineSection } from "../api/hooks";
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
  { key: "notes_skit", label: "Skit Ideas" },
  { key: "notes_talking", label: "Talking Points" },
  { key: "notes_draft", label: "Draft" },
];

/** Sections that get the refinement chat (everything except draft, which has its own UI) */
const REFINABLE_SECTIONS = new Set<ShowNotesSection>([
  "notes_summary",
  "notes_why",
  "notes_comedy",
  "notes_skit",
  "notes_talking",
]);

type ChatEntry = { role: "user" | "status"; content: string };

interface ShowNotesTabsProps {
  articleId: number;
  article: {
    notes_summary: string | null;
    notes_why: string | null;
    notes_comedy: string | null;
    notes_skit: string | null;
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

  // Per-section refinement state
  const [sectionInputs, setSectionInputs] = useState<Record<string, string>>({});
  const [sectionChats, setSectionChats] = useState<Record<string, ChatEntry[]>>({});
  const sectionContentRefs = useRef<Record<string, string>>({});

  // Draft-specific state
  const [draftInput, setDraftInput] = useState("");
  const [draftChat, setDraftChat] = useState<ChatEntry[]>([]);
  const currentDraftRef = useRef<string>(article.notes_draft || "");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sectionChatEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const generateDraft = useGenerateDraft();
  const refineDraft = useRefineDraft();
  const refineSection = useRefineSection();

  // Keep refs in sync with external article changes
  useEffect(() => {
    if (article.notes_draft) {
      currentDraftRef.current = article.notes_draft;
    }
  }, [article.notes_draft]);

  useEffect(() => {
    for (const tab of TABS) {
      if (REFINABLE_SECTIONS.has(tab.key) && article[tab.key]) {
        sectionContentRefs.current[tab.key] = article[tab.key]!;
      }
    }
  }, [article.notes_summary, article.notes_why, article.notes_comedy, article.notes_skit, article.notes_talking]);

  // Auto-scroll draft chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [draftChat]);

  // Auto-scroll section chats
  useEffect(() => {
    const activeRef = sectionChatEndRefs.current[activeTab];
    activeRef?.scrollIntoView({ behavior: "smooth" });
  }, [sectionChats, activeTab]);

  const handleSave = useCallback(
    (section: ShowNotesSection) => (html: string) => {
      onSaveSection(section, html);
      if (section === "notes_draft") {
        currentDraftRef.current = html;
      } else if (REFINABLE_SECTIONS.has(section)) {
        sectionContentRefs.current[section] = html;
      }
    },
    [onSaveSection],
  );

  // --- Draft refinement ---
  const handleDraftRefine = useCallback(() => {
    const instruction = draftInput.trim();
    if (!instruction) return;

    setDraftChat((prev) => [...prev, { role: "user", content: instruction }]);
    setDraftInput("");

    refineDraft.mutate(
      { id: articleId, instruction, currentDraft: currentDraftRef.current },
      {
        onSuccess: () => {
          setDraftChat((prev) => [...prev, { role: "status", content: "Draft updated" }]);
        },
        onError: (err) => {
          setDraftChat((prev) => [
            ...prev,
            { role: "status", content: `Error: ${(err as Error).message}` },
          ]);
        },
      },
    );
  }, [articleId, draftInput, refineDraft]);

  const handleDraftKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleDraftRefine();
      }
    },
    [handleDraftRefine],
  );

  const handleRegenerate = useCallback(() => {
    setDraftChat([]);
    generateDraft.mutate({ id: articleId });
  }, [articleId, generateDraft]);

  // --- Section refinement ---
  const handleSectionRefine = useCallback((section: ShowNotesSection) => {
    const instruction = (sectionInputs[section] || "").trim();
    if (!instruction) return;
    const currentContent = sectionContentRefs.current[section] || "";
    if (!currentContent) return;

    setSectionChats((prev) => ({
      ...prev,
      [section]: [...(prev[section] || []), { role: "user" as const, content: instruction }],
    }));
    setSectionInputs((prev) => ({ ...prev, [section]: "" }));

    refineSection.mutate(
      { id: articleId, section, instruction, currentContent },
      {
        onSuccess: () => {
          setSectionChats((prev) => ({
            ...prev,
            [section]: [...(prev[section] || []), { role: "status" as const, content: "Updated" }],
          }));
        },
        onError: (err) => {
          setSectionChats((prev) => ({
            ...prev,
            [section]: [...(prev[section] || []), { role: "status" as const, content: `Error: ${(err as Error).message}` }],
          }));
        },
      },
    );
  }, [articleId, sectionInputs, refineSection]);

  const handleSectionKeyDown = useCallback(
    (section: ShowNotesSection) => (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSectionRefine(section);
      }
    },
    [handleSectionRefine],
  );

  const isDraftPending = generateDraft.isPending || refineDraft.isPending;
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
          {/* Editor */}
          {isCollaborative ? (
            <CollaborativeEditor
              field={tab.key}
              initialContent={article[tab.key] || ""}
              onSave={handleSave(tab.key)}
              onSavedStateChange={onSavedStateChange}
              placeholder={
                tab.key === "notes_draft"
                  ? "Draft will be generated automatically with show notes..."
                  : `${tab.label} will appear here after processing...`
              }
              className="bg-white dark:bg-gray-950"
            />
          ) : (
            <RichEditor
              content={article[tab.key] || ""}
              onSave={handleSave(tab.key)}
              onSavedStateChange={onSavedStateChange}
              placeholder={
                tab.key === "notes_draft"
                  ? "Draft will be generated automatically with show notes..."
                  : `${tab.label} will appear here after processing...`
              }
              className="bg-white dark:bg-gray-950"
            />
          )}

          {/* Show notes section refinement UI */}
          {REFINABLE_SECTIONS.has(tab.key) && !!article[tab.key] && (
            <div className="mt-3 space-y-2">
              {/* Chat history */}
              {(sectionChats[tab.key]?.length ?? 0) > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800/50">
                  {sectionChats[tab.key].map((entry, i) => (
                    <div key={i} className={entry.role === "user" ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500 italic"}>
                      {entry.role === "user" ? (
                        <span><span className="font-medium text-indigo-600 dark:text-indigo-400">You:</span> {entry.content}</span>
                      ) : (
                        <span>{entry.content}</span>
                      )}
                    </div>
                  ))}
                  <div ref={(el) => { sectionChatEndRefs.current[tab.key] = el; }} />
                </div>
              )}

              {/* Refinement input */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={sectionInputs[tab.key] || ""}
                  onChange={(e) => setSectionInputs((prev) => ({ ...prev, [tab.key]: e.target.value }))}
                  onKeyDown={handleSectionKeyDown(tab.key)}
                  disabled={refineSection.isPending}
                  className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder={`Refine ${tab.label.toLowerCase()}...`}
                />
                <button
                  onClick={() => handleSectionRefine(tab.key)}
                  disabled={refineSection.isPending || !(sectionInputs[tab.key] || "").trim()}
                  className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {refineSection.isPending ? (
                    <>
                      <Spinner />
                      Sending...
                    </>
                  ) : (
                    "Send"
                  )}
                </button>
              </div>

              {refineSection.isError && (
                <span className="text-xs text-red-500">
                  {(refineSection.error as Error)?.message}
                </span>
              )}
            </div>
          )}

          {/* Draft tab: chat refinement UI AFTER editor */}
          {tab.key === "notes_draft" && hasDraft && (
            <div className="mt-3 space-y-2">
              {/* Chat history */}
              {draftChat.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-800/50">
                  {draftChat.map((entry, i) => (
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
                  value={draftInput}
                  onChange={(e) => setDraftInput(e.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  disabled={isDraftPending}
                  className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder="Refine: e.g. 'make the opening more dramatic' or 'change the sports reference to pop culture'"
                />
                <button
                  onClick={handleDraftRefine}
                  disabled={isDraftPending || !draftInput.trim()}
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

              {/* Regenerate link + speaking time */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={isDraftPending}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Regenerate from scratch
                </button>
                {(() => {
                  const duration = speakingTime(article.notes_draft);
                  return duration ? (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{duration}</span>
                  ) : null;
                })()}
                {(generateDraft.isError || refineDraft.isError) && (
                  <span className="text-xs text-red-500">
                    {((generateDraft.error || refineDraft.error) as Error)?.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
