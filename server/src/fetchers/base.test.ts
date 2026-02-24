import { describe, it, expect, beforeEach } from "bun:test";
import { registerFetcher, getFetcher, getAllFetchers } from "./base";
import type { Fetcher } from "./base";
import type { RawArticle, Source } from "@shared/types";

const makeMockFetcher = (type: string): Fetcher => ({
  type: type as any,
  async fetch(_source: Source): Promise<RawArticle[]> {
    return [];
  },
});

describe("fetcher registry", () => {
  it("registers and retrieves a fetcher", () => {
    const fetcher = makeMockFetcher("rss");
    registerFetcher(fetcher);
    expect(getFetcher("rss")).toBe(fetcher);
  });

  it("returns undefined for unknown type", () => {
    expect(getFetcher("unknown" as any)).toBeUndefined();
  });

  it("getAllFetchers returns all registered", () => {
    registerFetcher(makeMockFetcher("rss"));
    registerFetcher(makeMockFetcher("hackernews"));
    const all = getAllFetchers();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("register overwrites existing type", () => {
    const fetcher1 = makeMockFetcher("rss");
    const fetcher2 = makeMockFetcher("rss");
    registerFetcher(fetcher1);
    registerFetcher(fetcher2);
    expect(getFetcher("rss")).toBe(fetcher2);
  });
});
