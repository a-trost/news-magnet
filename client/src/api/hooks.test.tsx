import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestWrapper } from "../test/wrapper";
import { useSources, useArticles, useDeleteSource, useSaveArticle } from "./hooks";

// Mock the API client
vi.mock("./client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  streamPost: vi.fn(),
}));

import { api } from "./client";

const mockedApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useSources", () => {
    it("fetches sources from /sources", async () => {
      const sources = [
        { id: 1, name: "Test", type: "rss", config: { feedUrl: "u" }, enabled: true },
      ];
      mockedApi.get.mockResolvedValueOnce(sources);

      const { result } = renderHook(() => useSources(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(sources);
      expect(mockedApi.get).toHaveBeenCalledWith("/sources");
    });
  });

  describe("useArticles", () => {
    it("passes filter params to API", async () => {
      const response = { articles: [], total: 0, page: 1, limit: 50, totalPages: 0 };
      mockedApi.get.mockResolvedValueOnce(response);

      const filters = { sourceId: 1, sort: "score_desc" as const };
      const { result } = renderHook(() => useArticles(filters), {
        wrapper: createTestWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining("sourceId=1")
      );
      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining("sort=score_desc")
      );
    });
  });

  describe("useSaveArticle", () => {
    it("calls POST /articles/:id/save", async () => {
      mockedApi.post.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useSaveArticle(), {
        wrapper: createTestWrapper(),
      });

      result.current.mutate(42);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedApi.post).toHaveBeenCalledWith("/articles/42/save");
    });
  });

  describe("useDeleteSource", () => {
    it("calls DELETE /sources/:id", async () => {
      mockedApi.delete.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeleteSource(), {
        wrapper: createTestWrapper(),
      });

      result.current.mutate(5);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedApi.delete).toHaveBeenCalledWith("/sources/5");
    });
  });
});
