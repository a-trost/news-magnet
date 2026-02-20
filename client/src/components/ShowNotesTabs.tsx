import { useState, useCallback } from "react";
import RichEditor from "./RichEditor";
import type { ShowNotesSection } from "../api/hooks";

interface Tab {
  key: ShowNotesSection;
  label: string;
}

const TABS: Tab[] = [
  { key: "notes_summary", label: "Summary" },
  { key: "notes_why", label: "Why It Matters" },
  { key: "notes_comedy", label: "Comedy Angles" },
  { key: "notes_talking", label: "Talking Points" },
];

interface ShowNotesTabsProps {
  article: {
    notes_summary: string | null;
    notes_why: string | null;
    notes_comedy: string | null;
    notes_talking: string | null;
  };
  onSaveSection: (section: ShowNotesSection, content: string) => void;
  onSavedStateChange: (saved: boolean) => void;
}

export default function ShowNotesTabs({ article, onSaveSection, onSavedStateChange }: ShowNotesTabsProps) {
  const [activeTab, setActiveTab] = useState<ShowNotesSection>("notes_summary");

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
          <RichEditor
            content={article[tab.key] || ""}
            onSave={handleSave(tab.key)}
            onSavedStateChange={onSavedStateChange}
            placeholder={`${tab.label} will appear here after processing...`}
            className="bg-gray-50 dark:bg-gray-800"
          />
        </div>
      ))}
    </div>
  );
}
