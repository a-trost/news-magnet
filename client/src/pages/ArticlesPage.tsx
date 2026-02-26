import { useState, useRef, useEffect } from "react";
import {
  useArticles,
  useDeleteArticle,
  useSaveArticle,
  useUnsaveArticle,
  useClearUnsavedArticles,
  useAddArticleByUrl,
  useSources,
} from "../api/hooks";
import { useFetchAll } from "../components/FetchAllContext";
import type { ArticleFilters } from "@shared/types";

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

function SplitButton({
  label,
  onClick,
  disabled,
  menuItems,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  menuItems: { label: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex">
        <button
          onClick={onClick}
          disabled={disabled}
          className="px-3 py-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-l-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          {label}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className="px-2 py-1.5 border border-l-0 border-gray-200 dark:border-gray-700 rounded-r-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 z-50">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArticlesPage() {
  const [filters, setFilters] = useState<ArticleFilters>({
    sort: "score_desc",
    page: 1,
    limit: 50,
  });

  const { data, isLoading } = useArticles(filters);
  const { data: sources } = useSources();
  const fetchAll = useFetchAll();
  const deleteArticle = useDeleteArticle();
  const clearUnsaved = useClearUnsavedArticles();
  const saveArticle = useSaveArticle();
  const unsaveArticle = useUnsaveArticle();
  const addByUrl = useAddArticleByUrl();
  const [addUrl, setAddUrl] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const articles = data?.articles || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Articles</h1>
          <span className="text-sm text-gray-400 dark:text-gray-500">{total}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Add Article
          </button>
          <SplitButton
            label={fetchAll.isFiltering
              ? "Rating with AI..."
              : fetchAll.isPending
                ? `Fetching (${[...fetchAll.sourceStatuses.values()].filter((s) => s.status === "success" || s.status === "error").length}/${sources?.filter((s) => s.enabled).length ?? fetchAll.sourceStatuses.size})`
                : "Fetch All"}
            onClick={() => fetchAll.mutate()}
            disabled={fetchAll.isPending || clearUnsaved.isPending}
            menuItems={[
              { label: "Clear Unsaved Articles", onClick: () => clearUnsaved.mutate() },
            ]}
          />
        </div>
      </div>

      {fetchAll.filterErrors.length > 0 && (
        <div className="mb-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">AI rating failed</p>
              {fetchAll.filterErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400/80 font-mono">{err}</p>
              ))}
            </div>
            <button
              onClick={fetchAll.dismissFilterErrors}
              className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Add by URL modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); addByUrl.reset(); setAddUrl(""); } }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-300/50 dark:shadow-black/50 w-full max-w-md p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Article by URL</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const url = addUrl.trim();
                if (!url) return;
                addByUrl.mutate(url, {
                  onSuccess: () => { setAddUrl(""); setShowAddModal(false); addByUrl.reset(); },
                });
              }}
            >
              <input
                type="url"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://..."
                autoFocus
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 mb-3"
              />
              {addByUrl.isError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                  {addByUrl.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); addByUrl.reset(); setAddUrl(""); }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addByUrl.isPending || !addUrl.trim()}
                  className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {addByUrl.isPending ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 px-4 py-3 mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Source</label>
          <select
            value={filters.sourceId || ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                sourceId: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              }))
            }
            className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="">All Sources</option>
            {sources?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Relevance</label>
          <select
            value={filters.isRelevant === undefined ? "" : String(filters.isRelevant)}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                isRelevant: e.target.value === "" ? undefined : e.target.value === "true",
                page: 1,
              }))
            }
            className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="true">Relevant</option>
            <option value="false">Not Relevant</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Min Score</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={filters.minScore ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                minScore: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              }))
            }
            className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 px-2 py-1.5 text-sm w-20"
            placeholder="0.0"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sort</label>
          <select
            value={filters.sort || "newest"}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sort: e.target.value as ArticleFilters["sort"], page: 1 }))
            }
            className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="score_desc">Highest Score</option>
            <option value="score_asc">Lowest Score</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Search</label>
          <input
            type="text"
            value={filters.search || ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined, page: 1 }))}
            className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 px-2 py-1.5 text-sm w-full"
            placeholder="Search titles and summaries..."
          />
        </div>
      </div>

      {/* Articles list */}
      {isLoading ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">Loading articles...</p>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-base">No articles yet</p>
          <p className="text-sm mt-1">Add a source and fetch articles to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => {
            const sourceName = sources?.find((s) => s.id === article.source_id)?.name;
            return (
              <div
                key={article.id}
                className={`rounded-lg px-4 py-3 border transition-colors ${
                  !article.filtered_at
                    ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 hover:border-blue-300 dark:hover:border-blue-700"
                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 broadcast-card"
                }`}
              >
                <div className="flex items-stretch gap-4">
                  <button
                    onClick={() =>
                      article.is_saved
                        ? unsaveArticle.mutate(article.id)
                        : saveArticle.mutate(article.id)
                    }
                    className={`${article.is_saved ? "text-indigo-500 dark:text-indigo-400" : "text-gray-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-400"} flex items-center shrink-0 transition-colors`}
                    title={article.is_saved ? "Remove from saved" : "Save for episode"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={article.is_saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sourceName && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
                          {sourceName}
                        </span>
                      )}
                      <ScoreBadge score={article.relevance_score} />
                      {article.published_at && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(article.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium block truncate transition-colors"
                    >
                      {article.title}
                    </a>
                    {article.summary && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                    )}
                    {article.relevance_reason && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                        AI: {article.relevance_reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteArticle.mutate(article.id)}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 text-sm shrink-0 self-start transition-colors"
                    title="Delete"
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={filters.page === 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            Page {filters.page || 1} of {totalPages}
          </span>
          <button
            disabled={(filters.page || 1) >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
