import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { streamPost } from "../api/client";
import type { SourceFetchStatus } from "../api/hooks";

interface FetchAllState {
  mutate: () => void;
  isPending: boolean;
  isFiltering: boolean;
  filterErrors: string[];
  dismissFilterErrors: () => void;
  sourceStatuses: Map<number, SourceFetchStatus>;
}

const FetchAllContext = createContext<FetchAllState | null>(null);

export function FetchAllProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterErrors, setFilterErrors] = useState<string[]>([]);
  const [sourceStatuses, setSourceStatuses] = useState<Map<number, SourceFetchStatus>>(new Map());

  const mutate = useCallback(async () => {
    setIsPending(true);
    setIsFiltering(false);
    setFilterErrors([]);
    setSourceStatuses(new Map());

    try {
      for await (const event of streamPost("/fetch")) {
        if (event.event === "source-start") {
          const { sourceId, sourceName } = event.data;
          setSourceStatuses((prev) => {
            const next = new Map(prev);
            next.set(sourceId, { sourceId, sourceName, status: "fetching" });
            return next;
          });
        } else if (event.event === "source-done") {
          const { sourceId, sourceName, status, articlesFound, newArticles, error } = event.data;
          setSourceStatuses((prev) => {
            const next = new Map(prev);
            next.set(sourceId, { sourceId, sourceName, status, articlesFound, newArticles, error });
            return next;
          });
          qc.invalidateQueries({ queryKey: ["articles"] });
        } else if (event.event === "fetch-complete") {
          qc.invalidateQueries({ queryKey: ["sources"] });
          qc.invalidateQueries({ queryKey: ["fetchLogs"] });
        } else if (event.event === "filter-start") {
          setIsFiltering(true);
        } else if (event.event === "filter-done") {
          setIsFiltering(false);
          const { errors } = event.data;
          if (errors?.length) {
            setFilterErrors(errors);
          }
          qc.invalidateQueries({ queryKey: ["articles"] });
        }
      }
    } catch (err: any) {
      console.error("Fetch-all stream error:", err);
      setFilterErrors([err.message || "Stream connection failed"]);
    } finally {
      setIsPending(false);
      setIsFiltering(false);
    }
  }, [qc]);

  const dismissFilterErrors = useCallback(() => setFilterErrors([]), []);

  return (
    <FetchAllContext.Provider value={{ mutate, isPending, isFiltering, filterErrors, dismissFilterErrors, sourceStatuses }}>
      {children}
    </FetchAllContext.Provider>
  );
}

export function useFetchAll() {
  const ctx = useContext(FetchAllContext);
  if (!ctx) throw new Error("useFetchAll must be used within FetchAllProvider");
  return ctx;
}
