import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, streamPost } from "./client";
import type {
  Source,
  CreateSourceInput,
  UpdateSourceInput,
  PaginatedArticles,
  ArticleFilters,
  Episode,
  CreateEpisodeInput,
  UpdateEpisodeInput,
  Criteria,
  CreateCriteriaInput,
  UpdateCriteriaInput,
  FetchLog,
} from "@shared/types";

// Sources
export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: () => api.get<Source[]>("/sources"),
  });
}

export function useCreateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSourceInput) => api.post<Source>("/sources", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  });
}

export function useUpdateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateSourceInput & { id: number }) =>
      api.put<Source>(`/sources/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sources"] }),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sources/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}

// Articles
export function useArticles(filters: ArticleFilters = {}, options?: { refetchInterval?: number | false }) {
  const params = new URLSearchParams();
  if (filters.sourceId) params.set("sourceId", String(filters.sourceId));
  if (filters.isRelevant !== undefined) params.set("isRelevant", String(filters.isRelevant));
  if (filters.isSaved !== undefined) params.set("isSaved", String(filters.isSaved));
  if (filters.minScore !== undefined) params.set("minScore", String(filters.minScore));
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.episodeId) params.set("episodeId", String(filters.episodeId));
  if (filters.unassigned) params.set("unassigned", "true");

  const qs = params.toString();
  return useQuery({
    queryKey: ["articles", filters],
    queryFn: () => api.get<PaginatedArticles>(`/articles${qs ? `?${qs}` : ""}`),
    refetchInterval: options?.refetchInterval,
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/articles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

export function useClearUnsavedArticles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<any>("/articles/clear-unsaved"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

export function useSaveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/articles/${id}/save`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

export function useReorderArticles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: number[]) => api.put<any>("/articles/reorder", { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

export function useUnsaveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/articles/${id}/unsave`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

export function useAddArticleByUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.post<any>("/articles/add-by-url", { url }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

// Episodes
export function useEpisodes() {
  return useQuery({
    queryKey: ["episodes"],
    queryFn: () => api.get<Episode[]>("/episodes"),
  });
}

export function useEpisode(id: number | null) {
  return useQuery({
    queryKey: ["episodes", id],
    queryFn: () => api.get<Episode>(`/episodes/${id}`),
    enabled: id !== null,
  });
}

export function useNextEpisodeNumber() {
  return useQuery({
    queryKey: ["episodes", "next-number"],
    queryFn: () => api.get<{ nextNumber: number }>("/episodes/next-number"),
  });
}

export function useCreateEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEpisodeInput) => api.post<Episode>("/episodes", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodes"] }),
  });
}

export function useUpdateEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateEpisodeInput & { id: number }) =>
      api.put<Episode>(`/episodes/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodes"] }),
  });
}

export function useDeleteEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/episodes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["episodes"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}

export function useAddArticleToEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ episodeId, articleId }: { episodeId: number; articleId: number }) =>
      api.post(`/episodes/${episodeId}/articles/${articleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

export function useRemoveArticleFromEpisode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ episodeId, articleId }: { episodeId: number; articleId: number }) =>
      api.delete(`/episodes/${episodeId}/articles/${articleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

// Criteria
export function useCriteria() {
  return useQuery({
    queryKey: ["criteria"],
    queryFn: () => api.get<Criteria[]>("/criteria"),
  });
}

export function useCreateCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCriteriaInput) => api.post<Criteria>("/criteria", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criteria"] }),
  });
}

export function useUpdateCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCriteriaInput & { id: number }) =>
      api.put<Criteria>(`/criteria/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criteria"] }),
  });
}

export function useDeleteCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/criteria/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["criteria"] }),
  });
}

// Fetch
export type SourceFetchStatus = {
  sourceId: number;
  sourceName: string;
  status: "pending" | "fetching" | "success" | "error";
  articlesFound?: number;
  newArticles?: number;
  error?: string;
};

export function useFetchAllStream() {
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

  return { mutate, isPending, isFiltering, filterErrors, dismissFilterErrors, sourceStatuses };
}

export function useFetchSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: number) => api.post<any>(`/fetch/${sourceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["sources"] });
      qc.invalidateQueries({ queryKey: ["fetchLogs"] });
    },
  });
}

export function useFilterArticles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<any>("/fetch/filter"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

export function useClearScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<any>("/fetch/clear-scores"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

// Settings
export function useSetting(key: string) {
  return useQuery({
    queryKey: ["settings", key],
    queryFn: () => api.get<{ key: string; value: string; updated_at: string }>(`/settings/${key}`),
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.put<any>(`/settings/${key}`, { value }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["settings", variables.key] });
    },
  });
}

// Show Prep
export type ShowNotesSection = "notes_summary" | "notes_why" | "notes_comedy" | "notes_talking" | "notes_draft";

export type ArticleProcessStatus = {
  id: number;
  title: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
};

export function useProcessArticlesStream() {
  const qc = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [articleStatuses, setArticleStatuses] = useState<Map<number, ArticleProcessStatus>>(new Map());
  const [totalCount, setTotalCount] = useState(0);

  const mutate = useCallback(async () => {
    setIsPending(true);
    setArticleStatuses(new Map());
    setTotalCount(0);

    try {
      for await (const event of streamPost("/articles/process")) {
        if (event.event === "process-start") {
          setTotalCount(event.data.total);
        } else if (event.event === "article-start") {
          const { id, title } = event.data;
          setArticleStatuses((prev) => {
            const next = new Map(prev);
            next.set(id, { id, title, status: "processing" });
            return next;
          });
        } else if (event.event === "article-done") {
          const { id, title, error } = event.data;
          setArticleStatuses((prev) => {
            const next = new Map(prev);
            next.set(id, {
              id,
              title,
              status: error ? "error" : "done",
              error,
            });
            return next;
          });
        } else if (event.event === "process-complete") {
          qc.invalidateQueries({ queryKey: ["articles"] });
        }
      }
    } catch (err: any) {
      console.error("Process stream error:", err);
    } finally {
      setIsPending(false);
    }
  }, [qc]);

  return { mutate, isPending, articleStatuses, totalCount };
}

export function useUpdateShowNotes() {
  return useMutation({
    mutationFn: ({ id, section, content }: { id: number; section: ShowNotesSection; content: string }) =>
      api.put<any>(`/articles/${id}/show-notes`, { section, content }),
  });
}

export function useUpdateScript() {
  return useMutation({
    mutationFn: ({ id, script }: { id: number; script: string }) =>
      api.put<any>(`/articles/${id}/script`, { script }),
  });
}

export function useGenerateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, context }: { id: number; context?: string }) =>
      api.post<{ notes_draft: string }>(`/articles/${id}/generate-draft`, { context }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

export function useReprocessArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ sections: Record<ShowNotesSection, string> }>(`/articles/${id}/reprocess`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["articles"] }),
  });
}

// Fetch Logs
export function useFetchLogs() {
  return useQuery({
    queryKey: ["fetchLogs"],
    queryFn: () => api.get<FetchLog[]>("/fetch/log"),
  });
}
