import { useFetchLogs, useSources } from "../api/hooks";

export default function FetchLogPage() {
  const { data: logs, isLoading } = useFetchLogs();
  const { data: sources } = useSources();

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-5">Fetch Log</h1>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading logs...</p>
      ) : !logs || logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-base">No fetch logs yet</p>
          <p className="text-sm mt-1">Logs will appear here after you fetch sources</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wide text-gray-500 font-medium">Source</th>
                <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wide text-gray-500 font-medium">Status</th>
                <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wide text-gray-500 font-medium">Articles</th>
                <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wide text-gray-500 font-medium">Error</th>
                <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wide text-gray-500 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const sourceName = sources?.find((s) => s.id === log.source_id)?.name || `#${log.source_id}`;
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-900">{sourceName}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          log.status === "success"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{log.articles_found}</td>
                    <td className="px-4 py-2.5 text-red-500 max-w-xs truncate text-xs">
                      {log.error_message || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
