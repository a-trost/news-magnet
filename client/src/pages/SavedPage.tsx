import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Article, Episode } from "@shared/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useArticles,
  useSources,
  useUpdateShowNotes,
  useUpdateScript,
  useUpdateSegmentTitle,
  useReprocessArticle,
  useReorderArticles,
  useEpisodes,
  useEpisode,
  useCreateEpisode,
  useUpdateEpisode,
  useDeleteEpisode,
  useAddArticleToEpisode,
  useRemoveArticleFromEpisode,
  useNextEpisodeNumber,
} from "../api/hooks";
import type { ShowNotesSection } from "../api/hooks";
import RichEditor from "../components/RichEditor";
import CollaborativeEditor from "../components/CollaborativeEditor";
import ShowNotesTabs from "../components/ShowNotesTabs";
import { useCollaboration } from "../components/CollaborationContext";
import ActiveUsers from "../components/ActiveUsers";
import ArticlePresenceIndicator from "../components/ArticlePresenceIndicator";
import { LiveblocksProvider, RoomProvider, useUpdateMyPresence } from "@liveblocks/react";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400 dark:text-gray-500">Unscored</span>;
  const pct = Math.round(score * 100);
  const color =
    score >= 0.7
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
      : score >= 0.4
        ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
        : "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>
      {pct}%
    </span>
  );
}

function DragHandle({ listeners, attributes }: { listeners?: Record<string, Function>; attributes?: Record<string, any> }) {
  return (
    <button
      className="cursor-grab active:cursor-grabbing touch-none text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors p-1 -ml-1"
      {...attributes}
      {...listeners}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5" cy="3" r="1.5" />
        <circle cx="11" cy="3" r="1.5" />
        <circle cx="5" cy="8" r="1.5" />
        <circle cx="11" cy="8" r="1.5" />
        <circle cx="5" cy="13" r="1.5" />
        <circle cx="11" cy="13" r="1.5" />
      </svg>
    </button>
  );
}

function ArticleEditorAreaInner({
  article,
  isCollaborative,
  notesSaved,
  scriptSaved,
  isProcessing,
  isReprocessing,
  onReprocess,
  handleSaveSection,
  setNotesSaved,
  handleSaveScript,
  setScriptSaved,
  onSegmentTitleChange,
}: {
  article: Article;
  isCollaborative: boolean;
  notesSaved: boolean;
  scriptSaved: boolean;
  isProcessing: boolean;
  isReprocessing: boolean;
  onReprocess: () => void;
  handleSaveSection: (section: ShowNotesSection, content: string) => void;
  setNotesSaved: (v: boolean) => void;
  handleSaveScript: (html: string) => void;
  setScriptSaved: (v: boolean) => void;
  onSegmentTitleChange: (value: string) => void;
}) {
  return (
    <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800">
      {/* Article meta */}
      <div className="py-2">
        {article.summary && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {article.summary}
          </p>
        )}
        {article.relevance_reason && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
            AI: {article.relevance_reason}
          </p>
        )}
      </div>

      {/* Two-column writing area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: AI Show Notes */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Show Notes</span>
            <div className="flex items-center gap-2">
              {!notesSaved && (
                <span className="text-xs text-amber-500 dark:text-amber-400">Unsaved</span>
              )}
              {article.notes_summary && !isProcessing && !isReprocessing && (
                <button
                  onClick={onReprocess}
                  className="text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                  title="Reprocess with AI"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {isProcessing || isReprocessing ? (
            <div className="flex items-center gap-2 py-2 text-sm text-gray-400 dark:text-gray-500">
              <svg className="animate-spin h-4 w-4 text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing with AI...
            </div>
          ) : (
            <ShowNotesTabs
              articleId={article.id}
              article={article}
              onSaveSection={handleSaveSection}
              onSavedStateChange={setNotesSaved}
              isCollaborative={isCollaborative}
            />
          )}
        </div>

        {/* Right: Script */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Segment Title</span>
            <input
              type="text"
              defaultValue={article.segment_title || ""}
              onChange={(e) => onSegmentTitleChange(e.target.value)}
              placeholder={article.title}
              className="mt-1 w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Script</span>
            {!scriptSaved && (
              <span className="text-xs text-amber-500 dark:text-amber-400">Unsaved</span>
            )}
          </div>
          {isCollaborative ? (
            <CollaborativeEditor
              field="script"
              initialContent={article.script || ""}
              onSave={handleSaveScript}
              onSavedStateChange={setScriptSaved}
              placeholder="Write your script here..."
              className="bg-gray-50 dark:bg-gray-800 flex-1"
            />
          ) : (
            <RichEditor
              content={article.script || ""}
              onSave={handleSaveScript}
              onSavedStateChange={setScriptSaved}
              placeholder="Write your script here..."
              className="bg-gray-50 dark:bg-gray-800 flex-1"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ArticleEditorArea(props: Parameters<typeof ArticleEditorAreaInner>[0]) {
  if (props.isCollaborative) {
    return (
      <RoomProvider id={`article:${props.article.id}`}>
        <ArticleEditorAreaInner {...props} />
      </RoomProvider>
    );
  }
  return <ArticleEditorAreaInner {...props} />;
}

function SortableArticleCard({
  article,
  sourceName,
  episodeId,
  isExpanded,
  onToggle,
  onRemoveFromEpisode,
  isCollaborative,
}: {
  article: Article;
  sourceName?: string;
  episodeId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveFromEpisode: (articleId: number) => void;
  isCollaborative: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id });

  const updateShowNotes = useUpdateShowNotes();
  const updateScript = useUpdateScript();
  const updateSegmentTitle = useUpdateSegmentTitle();
  const reprocessArticle = useReprocessArticle();

  const [notesSaved, setNotesSaved] = useState(true);
  const [scriptSaved, setScriptSaved] = useState(true);
  const segmentTitleDebounce = useRef<ReturnType<typeof setTimeout>>();

  const handleSaveSection = useCallback(
    (section: ShowNotesSection, content: string) => {
      updateShowNotes.mutate({ id: article.id, section, content });
    },
    [article.id, updateShowNotes]
  );

  const handleSaveScript = useCallback(
    (html: string) => {
      updateScript.mutate({ id: article.id, script: html });
    },
    [article.id, updateScript]
  );

  const handleSegmentTitleChange = useCallback(
    (value: string) => {
      if (segmentTitleDebounce.current) clearTimeout(segmentTitleDebounce.current);
      segmentTitleDebounce.current = setTimeout(() => {
        updateSegmentTitle.mutate({ id: article.id, segmentTitle: value });
      }, 500);
    },
    [article.id, updateSegmentTitle]
  );

  const isProcessing = !article.processed_at && !article.notes_summary;
  const isReprocessing = reprocessArticle.isPending;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all broadcast-card ${isExpanded ? "border-indigo-700 dark:border-indigo-700 shadow-[0_0_20px_rgba(6,182,212,0.06)]" : ""}`}>
        {/* Compact header — always visible */}
        <div
          className="flex items-center gap-3 px-3 py-2 cursor-pointer select-none"
          onClick={onToggle}
        >
          <DragHandle listeners={listeners} attributes={attributes} />
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {sourceName && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded shrink-0">
                {sourceName}
              </span>
            )}
            <span className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate">
              {article.title}
            </span>
            <ScoreBadge score={article.relevance_score} />
            {isCollaborative && <ArticlePresenceIndicator articleId={article.id} />}
            {isProcessing && (
              <svg className="animate-spin h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {article.script && (
              <span className="text-xs text-emerald-500 dark:text-emerald-400 shrink-0" title="Has script">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1"
              title="Open article"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
              </svg>
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveFromEpisode(article.id); }}
              className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
              title="Remove from episode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Expanded editor area */}
        {isExpanded && (
          <ArticleEditorArea
            article={article}
            isCollaborative={isCollaborative}
            notesSaved={notesSaved}
            scriptSaved={scriptSaved}
            isProcessing={isProcessing}
            isReprocessing={isReprocessing}
            onReprocess={() => reprocessArticle.mutate(article.id)}
            handleSaveSection={handleSaveSection}
            setNotesSaved={setNotesSaved}
            handleSaveScript={handleSaveScript}
            setScriptSaved={setScriptSaved}
            onSegmentTitleChange={handleSegmentTitleChange}
          />
        )}
      </div>
    </div>
  );
}

function EpisodeSelector({
  episodes,
  currentId,
  onSelect,
  onCreate,
}: {
  episodes: Episode[];
  currentId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
}) {
  const active = episodes.filter((e) => !e.is_archived);
  const archived = episodes.filter((e) => e.is_archived);

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentId ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          if (val) onSelect(Number(val));
        }}
        className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="" disabled>Select episode...</option>
        {active.length > 0 && (
          <optgroup label="Active">
            {active.map((e) => (
              <option key={e.id} value={e.id}>
                {e.episode_number ? `#${e.episode_number}` : `Episode`}{e.title ? `: ${e.title}` : ""}
              </option>
            ))}
          </optgroup>
        )}
        {archived.length > 0 && (
          <optgroup label="Archived">
            {archived.map((e) => (
              <option key={e.id} value={e.id}>
                {e.episode_number ? `#${e.episode_number}` : `Episode`}{e.title ? `: ${e.title}` : ""}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <button
        onClick={onCreate}
        className="flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        New Episode
      </button>
    </div>
  );
}

function EpisodeHeader({
  episode,
  onUpdate,
  onDelete,
  onToggleArchive,
  isCollaborative,
}: {
  episode: Episode;
  onUpdate: (data: Record<string, any>) => void;
  onDelete: () => void;
  onToggleArchive: () => void;
  isCollaborative: boolean;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleTitleChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ title: value });
    }, 500);
  };

  const handleNumberChange = (value: string) => {
    const num = value ? Number(value) : undefined;
    onUpdate({ episode_number: num });
  };

  const handleDateChange = (value: string) => {
    onUpdate({ air_date: value || undefined });
  };

  const handleNotesSave = (html: string) => {
    onUpdate({ notes: html });
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 mb-4 broadcast-card">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">#</span>
          <input
            type="number"
            defaultValue={episode.episode_number ?? ""}
            onChange={(e) => handleNumberChange(e.target.value)}
            className="w-16 text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Ep#"
          />
        </div>
        <input
          ref={titleRef}
          type="text"
          defaultValue={episode.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 min-w-0 text-base font-semibold bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-indigo-500 text-gray-900 dark:text-gray-100 focus:outline-none py-1 transition-colors"
          placeholder="Episode title..."
        />
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            defaultValue={episode.air_date ?? ""}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {episode.is_archived && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Archived
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${showNotes ? "rotate-90" : ""}`}>
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
          </svg>
          Episode Notes
        </button>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/api/episodes/${episode.id}/export`}
            download
            className="text-xs px-2.5 py-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
            title="Export as Markdown"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Export
          </a>
          <button
            onClick={onToggleArchive}
            className="text-xs px-2.5 py-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {episode.is_archived ? "Unarchive" : "Archive"}
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2.5 py-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      {showNotes && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {isCollaborative ? (
            <CollaborativeEditor
              field="notes"
              initialContent={episode.notes || ""}
              onSave={handleNotesSave}
              placeholder="Episode notes..."
              className="bg-gray-50 dark:bg-gray-800"
            />
          ) : (
            <RichEditor
              content={episode.notes || ""}
              onSave={handleNotesSave}
              placeholder="Episode notes..."
              className="bg-gray-50 dark:bg-gray-800"
            />
          )}
        </div>
      )}
    </div>
  );
}

function UnassignedArticleRow({
  article,
  sourceName,
  onAdd,
}: {
  article: Article;
  sourceName?: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {sourceName && (
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded shrink-0">
            {sourceName}
          </span>
        )}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate transition-colors"
        >
          {article.title}
        </a>
        <ScoreBadge score={article.relevance_score} />
      </div>
      <button
        onClick={onAdd}
        className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 shrink-0"
        title="Add to episode"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      </button>
    </div>
  );
}

function CreateEpisodePrompt({ onCreated }: { onCreated: (id: number) => void }) {
  const createEpisode = useCreateEpisode();
  const { data: nextNumData } = useNextEpisodeNumber();
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (nextNumData?.nextNumber && !episodeNumber) {
      setEpisodeNumber(String(nextNumData.nextNumber));
    }
  }, [nextNumData]);

  const handleCreate = () => {
    if (!episodeNumber) return;
    createEpisode.mutate(
      {
        episode_number: Number(episodeNumber),
        title: title.trim() || undefined,
      },
      {
        onSuccess: (episode) => onCreated(episode.id),
      }
    );
  };

  return (
    <div className="text-center py-16">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Create your first episode</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Organize saved articles into show episodes</p>
      <div className="max-w-xs mx-auto space-y-3">
        <div className="flex gap-2">
          <input
            type="number"
            value={episodeNumber}
            onChange={(e) => setEpisodeNumber(e.target.value)}
            placeholder="Ep #"
            className="w-20 text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!episodeNumber || createEpisode.isPending}
          className="w-full text-sm px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createEpisode.isPending ? "Creating..." : "Create Episode"}
        </button>
      </div>
    </div>
  );
}

function PresenceUpdater({ expandedArticleIds }: { expandedArticleIds: Set<number> }) {
  const updateMyPresence = useUpdateMyPresence();
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    // Set activeArticleId to the most recently expanded article
    const ids = Array.from(expandedArticleIds);
    const activeId = ids.length > 0 ? ids[ids.length - 1] : null;
    if (activeId !== prevRef.current) {
      prevRef.current = activeId;
      updateMyPresence({ activeArticleId: activeId });
    }
  }, [expandedArticleIds, updateMyPresence]);

  return null;
}

export default function SavedPage() {
  const { episodeId: episodeIdParam } = useParams<{ episodeId?: string }>();
  const navigate = useNavigate();
  const episodeId = episodeIdParam ? Number(episodeIdParam) : null;
  const { isCollaborative } = useCollaboration();

  const { data: episodes = [], isLoading: episodesLoading } = useEpisodes();
  const { data: episode } = useEpisode(episodeId);
  const updateEpisode = useUpdateEpisode();
  const deleteEpisode = useDeleteEpisode();
  const addArticleToEpisode = useAddArticleToEpisode();
  const removeArticleFromEpisode = useRemoveArticleFromEpisode();
  const createEpisode = useCreateEpisode();
  const { data: nextNumData } = useNextEpisodeNumber();

  // Episode articles
  const [polling, setPolling] = useState(false);
  const { data: episodeArticlesData } = useArticles(
    episodeId ? { episodeId, limit: 200, sort: "display_order" } : { isSaved: true, limit: 0 },
    { refetchInterval: polling ? 3000 : false },
  );
  const episodeArticles = useMemo(
    () => (episodeId ? (episodeArticlesData?.articles ?? []) : []),
    [episodeId, episodeArticlesData?.articles],
  );

  // Unassigned saved articles
  const [poolExpanded, setPoolExpanded] = useState(true);
  const { data: unassignedData } = useArticles(
    episodeId ? { unassigned: true, limit: 200 } : { isSaved: true, limit: 0 },
  );
  const unassignedArticles = useMemo(
    () => (episodeId ? (unassignedData?.articles ?? []) : []),
    [episodeId, unassignedData?.articles],
  );

  const { data: sources } = useSources();
  const [orderedArticles, setOrderedArticles] = useState<Article[]>([]);
  const [expandedArticleIds, setExpandedArticleIds] = useState<Set<number>>(new Set());
  const reorderArticles = useReorderArticles();

  // Sync local state from server data + set polling in one effect
  useEffect(() => {
    setOrderedArticles(episodeArticles);
    setPolling(episodeArticles.some((a) => !a.processed_at));
  }, [episodeArticles]);

  // Redirect to most recent active episode if none selected
  useEffect(() => {
    if (episodeId || episodesLoading) return;
    const active = episodes.filter((e) => !e.is_archived);
    if (active.length > 0) {
      navigate(`/saved/${active[0].id}`, { replace: true });
    }
  }, [episodeId, episodes, episodesLoading, navigate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setOrderedArticles((prev) => {
        const oldIndex = prev.findIndex((a) => a.id === active.id);
        const newIndex = prev.findIndex((a) => a.id === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex);
        reorderArticles.mutate(reordered.map((a) => a.id));
        return reordered;
      });
    },
    [reorderArticles],
  );

  const handleCreateEpisode = () => {
    const nextNum = nextNumData?.nextNumber ?? 1;
    createEpisode.mutate(
      { episode_number: nextNum },
      { onSuccess: (ep) => navigate(`/saved/${ep.id}`) },
    );
  };

  const handleUpdate = useCallback(
    (data: Record<string, any>) => {
      if (!episodeId) return;
      updateEpisode.mutate({ id: episodeId, ...data });
    },
    [episodeId, updateEpisode],
  );

  const handleToggleArchive = () => {
    if (!episodeId || !episode) return;
    updateEpisode.mutate({ id: episodeId, is_archived: !episode.is_archived });
  };

  const handleDelete = () => {
    if (!episodeId) return;
    if (!confirm("Delete this episode? Articles will return to the unassigned pool.")) return;
    deleteEpisode.mutate(episodeId, {
      onSuccess: () => {
        const remaining = episodes.filter((e) => e.id !== episodeId);
        const nextActive = remaining.find((e) => !e.is_archived);
        navigate(nextActive ? `/saved/${nextActive.id}` : "/saved", { replace: true });
      },
    });
  };

  const handleAddToEpisode = (articleId: number) => {
    if (!episodeId) return;
    addArticleToEpisode.mutate({ episodeId, articleId });
  };

  const handleRemoveFromEpisode = (articleId: number) => {
    if (!episodeId) return;
    removeArticleFromEpisode.mutate({ episodeId, articleId });
  };

  // No episode selected and no drafts — show create prompt
  if (!episodeId && !episodesLoading) {
    const hasActive = episodes.some((e) => !e.is_archived);
    if (!hasActive) {
      return (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Writing Room</h1>
            {episodes.length > 0 && (
              <EpisodeSelector
                episodes={episodes}
                currentId={null}
                onSelect={(id) => navigate(`/saved/${id}`)}
                onCreate={handleCreateEpisode}
              />
            )}
          </div>
          <CreateEpisodePrompt onCreated={(id) => navigate(`/saved/${id}`)} />
        </div>
      );
    }
    return null; // redirect will happen via useEffect
  }

  const content = (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Writing Room</h1>
        <div className="flex items-center gap-3">
          {isCollaborative && episodeId && <ActiveUsers />}
          <EpisodeSelector
            episodes={episodes}
            currentId={episodeId}
            onSelect={(id) => navigate(`/saved/${id}`)}
            onCreate={handleCreateEpisode}
          />
        </div>
      </div>

      {isCollaborative && episodeId && (
        <PresenceUpdater expandedArticleIds={expandedArticleIds} />
      )}

      {episode && (
        <EpisodeHeader
          episode={episode}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onToggleArchive={handleToggleArchive}
          isCollaborative={isCollaborative && !!episodeId}
        />
      )}

      {/* Episode stories */}
      {orderedArticles.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg mb-4">
          <p className="text-sm">No stories in this episode yet</p>
          <p className="text-xs mt-1">Save articles from the feed to add them here</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedArticles.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 mb-4">
              {orderedArticles.map((article) => {
                const sourceName = sources?.find((s) => s.id === article.source_id)?.name;
                return (
                  <SortableArticleCard
                    key={article.id}
                    article={article}
                    sourceName={sourceName}
                    episodeId={episodeId!}
                    isExpanded={expandedArticleIds.has(article.id)}
                    onToggle={() => setExpandedArticleIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(article.id)) next.delete(article.id);
                      else next.add(article.id);
                      return next;
                    })}
                    onRemoveFromEpisode={handleRemoveFromEpisode}
                    isCollaborative={isCollaborative && !!episodeId}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Unassigned articles pool */}
      {episodeId && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setPoolExpanded(!poolExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Saved Articles ({unassignedArticles.length})
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-gray-400 transition-transform ${poolExpanded ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
          {poolExpanded && (
            <div className="p-2 space-y-1">
              {unassignedArticles.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                  No unassigned saved articles
                </p>
              ) : (
                unassignedArticles.map((article) => {
                  const sourceName = sources?.find((s) => s.id === article.source_id)?.name;
                  return (
                    <UnassignedArticleRow
                      key={article.id}
                      article={article}
                      sourceName={sourceName}
                      onAdd={() => handleAddToEpisode(article.id)}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Wrap with Liveblocks providers when collaborative and episode is selected
  if (isCollaborative && episodeId) {
    return (
      <LiveblocksProvider authEndpoint="/api/liveblocks/auth">
        <RoomProvider id={`episode:${episodeId}`} initialPresence={{ activeArticleId: null }}>
          {content}
        </RoomProvider>
      </LiveblocksProvider>
    );
  }

  return content;
}
