import { useState, useRef, useEffect } from "react";
import {
  useArticles,
  useDeleteArticle,
  useSaveArticle,
  useUnsaveArticle,
  useFetchAllStream,
  useFilterArticles,
  useClearScores,
  useClearUnsavedArticles,
  useSources,
} from "../api/hooks";
import type { ArticleFilters } from "@shared/types";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">Unscored</span>;
  const pct = Math.round(score * 100);
  const color =
    score >= 0.7
      ? "bg-emerald-50 text-emerald-600"
      : score >= 0.4
        ? "bg-amber-50 text-amber-600"
        : "bg-red-50 text-red-500";
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
          className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-l-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          {label}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className="px-2 py-1.5 border border-l-0 border-gray-200 rounded-r-lg text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg border border-gray-200 z-50">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
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
  const fetchAll = useFetchAllStream();
  const filterArticles = useFilterArticles();
  const clearScores = useClearScores();
  const deleteArticle = useDeleteArticle();
  const clearUnsaved = useClearUnsavedArticles();
  const saveArticle = useSaveArticle();
  const unsaveArticle = useUnsaveArticle();

  const articles = data?.articles || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-gray-900">Articles</h1>
          <span className="text-sm text-gray-400">{total}</span>
        </div>
        <div className="flex gap-2">
          <SplitButton
            label={fetchAll.isPending
              ? `Fetching (${[...fetchAll.sourceStatuses.values()].filter((s) => s.status === "success" || s.status === "error").length}/${fetchAll.sourceStatuses.size})`
              : "Fetch All"}
            onClick={() => fetchAll.mutate()}
            disabled={fetchAll.isPending || clearUnsaved.isPending}
            menuItems={[
              { label: "Clear All Articles", onClick: () => clearUnsaved.mutate() },
            ]}
          />
          <SplitButton
            label={filterArticles.isPending ? "Rating..." : clearScores.isPending ? "Clearing..." : "Rate with AI"}
            onClick={() => filterArticles.mutate()}
            disabled={filterArticles.isPending || clearScores.isPending}
            menuItems={[
              { label: "Clear Ratings", onClick: () => clearScores.mutate() },
            ]}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="border border-gray-200 rounded-lg bg-white px-4 py-3 mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Source</label>
          <select
            value={filters.sourceId || ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                sourceId: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              }))
            }
            className="border border-gray-200 rounded-md bg-white px-2 py-1.5 text-sm"
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
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Relevance</label>
          <select
            value={filters.isRelevant === undefined ? "" : String(filters.isRelevant)}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                isRelevant: e.target.value === "" ? undefined : e.target.value === "true",
                page: 1,
              }))
            }
            className="border border-gray-200 rounded-md bg-white px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="true">Relevant</option>
            <option value="false">Not Relevant</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Min Score</label>
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
            className="border border-gray-200 rounded-md bg-white px-2 py-1.5 text-sm w-20"
            placeholder="0.0"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Sort</label>
          <select
            value={filters.sort || "newest"}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sort: e.target.value as ArticleFilters["sort"], page: 1 }))
            }
            className="border border-gray-200 rounded-md bg-white px-2 py-1.5 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="score_desc">Highest Score</option>
            <option value="score_asc">Lowest Score</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Search</label>
          <input
            type="text"
            value={filters.search || ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined, page: 1 }))}
            className="border border-gray-200 rounded-md bg-white px-2 py-1.5 text-sm w-full"
            placeholder="Search titles and summaries..."
          />
        </div>
      </div>

      {/* Error messages */}
      {filterArticles.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          Filter error: {filterArticles.error.message}
        </div>
      )}

      {/* Success messages */}
      {filterArticles.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
          Filtered {filterArticles.data?.filtered || 0} articles in {filterArticles.data?.batches || 0} batches
        </div>
      )}

      {/* Articles list */}
      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading articles...</p>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
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
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sourceName && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                          {sourceName}
                        </span>
                      )}
                      <ScoreBadge score={article.relevance_score} />
                      {article.published_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(article.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:text-indigo-600 font-medium block truncate transition-colors"
                    >
                      {article.title}
                    </a>
                    {article.summary && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                    )}
                    {article.relevance_reason && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        AI: {article.relevance_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() =>
                        article.is_saved
                          ? unsaveArticle.mutate(article.id)
                          : saveArticle.mutate(article.id)
                      }
                      className={`${article.is_saved ? "text-indigo-500" : "text-gray-300 hover:text-indigo-400"} transition-colors`}
                      title={article.is_saved ? "Remove from saved" : "Save for episode"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={article.is_saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteArticle.mutate(article.id)}
                      className="text-gray-300 hover:text-red-500 text-sm transition-colors"
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
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
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {filters.page || 1} of {totalPages}
          </span>
          <button
            disabled={(filters.page || 1) >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
