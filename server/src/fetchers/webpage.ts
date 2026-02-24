import * as cheerio from "cheerio";
import type { Fetcher } from "./base";
import type { RawArticle, Source, WebpageConfig } from "@shared/types";
import { callClaude } from "../llm/client";
import { BROWSER_HEADERS } from "./metadata";

export const webpageFetcher: Fetcher = {
  type: "webpage",
  async fetch(source: Source): Promise<RawArticle[]> {
    const config = source.config as WebpageConfig;
    const response = await fetch(config.pageUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract all links with their surrounding context
    const links: { href: string; text: string; context: string }[] = [];
    $("a[href]").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";

      // Skip obvious non-article links
      if (
        !href ||
        href === "#" ||
        href.startsWith("mailto:") ||
        href.startsWith("javascript:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      const text = $el.text().replace(/\s+/g, " ").trim();
      if (!text || text.length < 5) return;

      // Get parent context for more info (dates, summaries nearby)
      const $parent = $el.closest("article, li, div, section");
      const context = $parent.length
        ? $parent.text().replace(/\s+/g, " ").trim().slice(0, 500)
        : text;

      const resolved = resolveUrl(href, config.pageUrl);
      if (resolved) {
        links.push({ href: resolved, text, context });
      }
    });

    if (links.length === 0) return [];

    // Deduplicate by href
    const seen = new Set<string>();
    const uniqueLinks = links.filter((l) => {
      if (seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    });

    // Send the extracted links to Claude to identify which are articles
    const linkList = uniqueLinks
      .map(
        (l, i) =>
          `[${i}] URL: ${l.href}\n    Link text: ${l.text}\n    Context: ${l.context.slice(0, 300)}`
      )
      .join("\n\n");

    const claudeResponse = await callClaude(`Below is a list of links extracted from ${config.pageUrl}. Identify which ones are links to actual articles, blog posts, or news items (not navigation, category pages, author pages, social media, etc.).

For each article link, return a JSON object with:
- "index": the link index number
- "title": the article title (clean it up from the link text)
- "url": the URL exactly as shown
- "summary": extract a summary from the context if available, or null
- "published_at": extract the date in ISO 8601 format if visible in the context, or null

Return ONLY a JSON array. If no articles are found, return [].

Links:
${linkList}`);

    const jsonMatch = claudeResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    let items: Array<{
      index: number;
      title: string;
      url: string;
      summary?: string | null;
      published_at?: string | null;
    }>;
    try {
      items = JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }

    return items
      .filter((item) => item.title && item.url)
      .map((item) => ({
        external_id: item.url,
        title: item.title,
        url: item.url,
        summary: item.summary || undefined,
        published_at: item.published_at || undefined,
      }));
  },
};

function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return "";
  }
}
