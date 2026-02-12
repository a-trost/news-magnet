import {
  useArticles,
  useUnsaveArticle,
  useDeleteArticle,
  useSources,
} from "../api/hooks";

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

export default function SavedPage() {
  const { data, isLoading } = useArticles({ isSaved: true, limit: 200, sort: "newest" });
  const { data: sources } = useSources();
  const unsaveArticle = useUnsaveArticle();
  const deleteArticle = useDeleteArticle();

  const articles = data?.articles || [];

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-5">
        <h1 className="text-lg font-semibold text-gray-900">Saved for Episode</h1>
        <span className="text-sm text-gray-400">{articles.length}</span>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading saved articles...</p>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-gray-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
          <p className="text-base">No saved articles</p>
          <p className="text-sm mt-1">Bookmark articles from the Articles page to save them here</p>
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
                      onClick={() => unsaveArticle.mutate(article.id)}
                      className="text-indigo-500 hover:text-gray-400 transition-colors"
                      title="Remove from saved"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
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
    </div>
  );
}
