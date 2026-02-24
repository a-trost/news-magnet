import { describe, it, expect, afterEach, mock } from "bun:test";
import type { Source } from "@shared/types";

const testSource: Source = {
  id: 1,
  name: "HN",
  type: "hackernews",
  config: { feedType: "top", maxItems: 3 },
  enabled: true,
  config_key: null,
  last_fetched_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const originalFetch = globalThis.fetch;

describe("HackerNews fetcher integration", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches stories and maps to RawArticle", async () => {
    const storyIds = [1, 2, 3];
    const items = {
      1: { id: 1, title: "Story One", url: "https://example.com/1", by: "user1", time: 1700000000, type: "story" },
      2: { id: 2, title: "Story Two", url: "https://example.com/2", by: "user2", time: 1700001000, type: "story" },
      3: { id: 3, title: "Story Three", url: "https://example.com/3", by: "user3", time: 1700002000, type: "story" },
    };

    globalThis.fetch = mock((url: string) => {
      if (url.includes("topstories.json")) {
        return Promise.resolve(new Response(JSON.stringify(storyIds)));
      }
      const id = Number(url.match(/item\/(\d+)/)?.[1]);
      return Promise.resolve(new Response(JSON.stringify((items as any)[id] || null)));
    }) as any;

    const { hackerNewsFetcher } = await import("./hackernews");
    const articles = await hackerNewsFetcher.fetch(testSource);
    expect(articles.length).toBe(3);
    expect(articles[0].title).toBe("Story One");
    expect(articles[0].url).toBe("https://example.com/1");
    expect(articles[0].author).toBe("user1");
  });

  it("filters dead/deleted/non-story items", async () => {
    const storyIds = [1, 2, 3];
    const items = {
      1: { id: 1, title: "Good", url: "https://example.com/good", type: "story" },
      2: { id: 2, title: "Dead", url: "https://example.com/dead", type: "story", dead: true },
      3: { id: 3, title: "Comment", type: "comment" },
    };

    globalThis.fetch = mock((url: string) => {
      if (url.includes("topstories.json")) {
        return Promise.resolve(new Response(JSON.stringify(storyIds)));
      }
      const id = Number(url.match(/item\/(\d+)/)?.[1]);
      return Promise.resolve(new Response(JSON.stringify((items as any)[id] || null)));
    }) as any;

    const { hackerNewsFetcher } = await import("./hackernews");
    const articles = await hackerNewsFetcher.fetch(testSource);
    expect(articles.length).toBe(1);
    expect(articles[0].title).toBe("Good");
  });

  it("uses HN URL fallback when item has no URL", async () => {
    globalThis.fetch = mock((url: string) => {
      if (url.includes("topstories.json")) {
        return Promise.resolve(new Response(JSON.stringify([42])));
      }
      return Promise.resolve(new Response(JSON.stringify({
        id: 42, title: "Ask HN", text: "Some text", type: "story", by: "user",
      })));
    }) as any;

    const { hackerNewsFetcher } = await import("./hackernews");
    const articles = await hackerNewsFetcher.fetch(testSource);
    expect(articles.length).toBe(1);
    expect(articles[0].url).toBe("https://news.ycombinator.com/item?id=42");
  });

  it("throws on HTTP error for story list", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Error", { status: 500 }))
    ) as any;

    const { hackerNewsFetcher } = await import("./hackernews");
    expect(hackerNewsFetcher.fetch(testSource)).rejects.toThrow("HN API error");
  });

  it("skips items that fail to fetch individually", async () => {
    let callCount = 0;
    globalThis.fetch = mock((url: string) => {
      if (url.includes("topstories.json")) {
        return Promise.resolve(new Response(JSON.stringify([1, 2])));
      }
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response(JSON.stringify({
          id: 1, title: "Success", url: "https://example.com/ok", type: "story",
        })));
      }
      return Promise.reject(new Error("Network error"));
    }) as any;

    const { hackerNewsFetcher } = await import("./hackernews");
    const articles = await hackerNewsFetcher.fetch(testSource);
    expect(articles.length).toBe(1);
    expect(articles[0].title).toBe("Success");
  });
});
