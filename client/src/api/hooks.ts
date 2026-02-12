import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, streamPost } from "./client";
import type {
  Source,
  CreateSourceInput,
  UpdateSourceInput,
  PaginatedArticles,
  ArticleFilters,
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
export function useArticles(filters: ArticleFilters = {}) {
  const params = new URLSearchParams();
  if (filters.sourceId) params.set("sourceId", String(filters.sourceId));
  if (filters.isRelevant !== undefined) params.set("isRelevant", String(filters.isRelevant));
  if (filters.isSaved !== undefined) params.set("isSaved", String(filters.isSaved));
  if (filters.minScore !== undefined) params.set("minScore", String(filters.minScore));
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();
  return useQuery({
    queryKey: ["articles", filters],
    queryFn: () => api.get<PaginatedArticles>(`/articles${qs ? `?${qs}` : ""}`),
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

export function useUnsaveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/articles/${id}/unsave`),
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
  const [sourceStatuses, setSourceStatuses] = useState<Map<number, SourceFetchStatus>>(new Map());

  const mutate = useCallback(async () => {
    setIsPending(true);
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
        }
      }
    } catch (err: any) {
      console.error("Fetch-all stream error:", err);
    } finally {
      setIsPending(false);
    }
  }, [qc]);

  return { mutate, isPending, sourceStatuses };
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

// Fetch Logs
export function useFetchLogs() {
  return useQuery({
    queryKey: ["fetchLogs"],
    queryFn: () => api.get<FetchLog[]>("/fetch/log"),
  });
}
