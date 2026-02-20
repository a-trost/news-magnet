import { useState } from "react";
import {
  useSources,
  useCreateSource,
  useUpdateSource,
  useDeleteSource,
  useFetchSource,
  useFetchAllStream,
} from "../api/hooks";
import type { SourceFetchStatus } from "../api/hooks";
import type { SourceType, SourceConfig } from "@shared/types";

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "rss", label: "RSS Feed" },
  { value: "hackernews", label: "Hacker News" },
  { value: "webpage", label: "Web Page (auto-extract)" },
];

function AddSourceDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { name: string; type: SourceType; config: SourceConfig }) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SourceType>("rss");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedType, setFeedType] = useState<"top" | "new" | "best">("top");
  const [maxItems, setMaxItems] = useState(30);
  const [pageUrl, setPageUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let config: SourceConfig;
    switch (type) {
      case "rss":
        config = { feedUrl };
        break;
      case "hackernews":
        config = { feedType, maxItems };
        break;
      case "webpage":
        config = { pageUrl };
        break;
    }
    onSubmit({ name, type, config });
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add Source</h2>

        <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
          placeholder="My Feed"
        />

        <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SourceType)}
          className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Type-specific fields */}
        {type === "rss" && (
          <>
            <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Feed URL</label>
            <input
              required
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
              placeholder="https://example.com/feed.xml"
            />
          </>
        )}

        {type === "hackernews" && (
          <>
            <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Feed Type</label>
            <select
              value={feedType}
              onChange={(e) => setFeedType(e.target.value as "top" | "new" | "best")}
              className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="top">Top Stories</option>
              <option value="new">New Stories</option>
              <option value="best">Best Stories</option>
            </select>
            <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Max Items</label>
            <input
              type="number"
              value={maxItems}
              onChange={(e) => setMaxItems(Number(e.target.value))}
              className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
              min={1}
              max={500}
            />
          </>
        )}

        {type === "webpage" && (
          <>
            <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Page URL</label>
            <input
              required
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-md w-full px-3 py-2 mb-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
              placeholder="https://www.anthropic.com/news"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2 mb-3">
              AI will automatically extract articles from the page — no configuration needed.
            </p>
          </>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            Add Source
          </button>
        </div>
      </form>
    </div>
  );
}

function FetchStatusBadge({ status }: { status?: SourceFetchStatus }) {
  if (!status) return null;

  switch (status.status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
          Pending
        </span>
      );
    case "fetching":
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Fetching...
        </span>
      );
    case "success":
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded">
          +{status.newArticles} articles
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400 px-2 py-0.5 rounded" title={status.error}>
          Error
        </span>
      );
  }
}

export default function SourcesPage() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: sources, isLoading } = useSources();
  const createSource = useCreateSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();
  const fetchSource = useFetchSource();
  const fetchAll = useFetchAllStream();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sources</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAll.mutate()}
            disabled={fetchAll.isPending}
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {fetchAll.isPending
              ? `Fetching (${[...fetchAll.sourceStatuses.values()].filter((s) => s.status === "success" || s.status === "error").length}/${fetchAll.sourceStatuses.size})`
              : "Fetch All"}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            Add Source
          </button>
        </div>
      </div>

      {fetchSource.isError && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-400">
          Fetch error: {fetchSource.error.message}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm">Loading sources...</p>
      ) : !sources || sources.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-base">No sources yet</p>
          <p className="text-sm mt-1">Add a source to start aggregating news</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <div key={source.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{source.name}</h3>
                    <FetchStatusBadge status={fetchAll.sourceStatuses.get(source.id)} />
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
                      {source.type}
                    </span>
                    {source.config_key && (
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                        config
                      </span>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={source.enabled}
                    onChange={(e) =>
                      updateSource.mutate({ id: source.id, enabled: e.target.checked })
                    }
                    className="rounded"
                  />
                  Enabled
                </label>
              </div>

              <pre className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md font-mono p-2 mb-3 overflow-auto max-h-24 text-gray-700 dark:text-gray-300">
                {JSON.stringify(source.config, null, 2)}
              </pre>

              {source.last_fetched_at && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Last fetched: {new Date(source.last_fetched_at).toLocaleString()}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => fetchSource.mutate(source.id)}
                  disabled={fetchSource.isPending || fetchAll.isPending}
                  className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  Fetch Now
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete source "${source.name}"?`))
                      deleteSource.mutate(source.id);
                  }}
                  className="px-3 py-1 text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddSourceDialog
          onClose={() => setShowAdd(false)}
          onSubmit={(data) => {
            createSource.mutate(data);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
