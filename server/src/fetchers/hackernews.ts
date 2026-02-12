import type { Fetcher } from "./base";
import type { RawArticle, Source, HackerNewsConfig } from "@shared/types";

const HN_API = "https://hacker-news.firebaseio.com/v0";

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  text?: string;
  by?: string;
  time?: number;
  type?: string;
  dead?: boolean;
  deleted?: boolean;
  score?: number;
  descendants?: number;
}

export const hackerNewsFetcher: Fetcher = {
  type: "hackernews",
  async fetch(source: Source): Promise<RawArticle[]> {
    const config = source.config as HackerNewsConfig;
    const feedType = config.feedType || "top";
    const maxItems = config.maxItems || 30;

    const endpoint = feedType === "top" ? "topstories" : feedType === "new" ? "newstories" : "beststories";
    const response = await fetch(`${HN_API}/${endpoint}.json`);
    if (!response.ok) throw new Error(`HN API error: ${response.status}`);

    const ids: number[] = await response.json();
    const limitedIds = ids.slice(0, maxItems);

    // Fetch in batches of 10
    const articles: RawArticle[] = [];
    for (let i = 0; i < limitedIds.length; i += 10) {
      const batch = limitedIds.slice(i, i + 10);
      const items = await Promise.all(
        batch.map((id) =>
          fetch(`${HN_API}/item/${id}.json`)
            .then((r) => r.json() as Promise<HNItem | null>)
            .catch(() => null)
        )
      );

      for (const item of items) {
        if (!item || item.dead || item.deleted || item.type !== "story") continue;

        const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
        articles.push({
          external_id: String(item.id),
          title: item.title || "Untitled",
          url,
          summary: item.text?.slice(0, 1000) || undefined,
          author: item.by || undefined,
          published_at: item.time ? new Date(item.time * 1000).toISOString() : undefined,
        });
      }
    }

    return articles;
  },
};
