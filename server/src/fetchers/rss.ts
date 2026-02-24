import { XMLParser } from "fast-xml-parser";
import type { Fetcher } from "./base";
import type { RawArticle, Source, RssConfig } from "@shared/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["item", "entry"].includes(name),
});

export const rssFetcher: Fetcher = {
  type: "rss",
  async fetch(source: Source): Promise<RawArticle[]> {
    const config = source.config as RssConfig;
    const response = await fetch(config.feedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);

    // Handle RSS 2.0
    if (parsed.rss?.channel) {
      const channel = parsed.rss.channel;
      const items = channel.item || [];
      return items.map((item: any) => parseRssItem(item, config.feedUrl));
    }

    // Handle Atom
    if (parsed.feed) {
      const entries = parsed.feed.entry || [];
      return entries.map((entry: any) => parseAtomEntry(entry, config.feedUrl));
    }

    // Handle RDF/RSS 1.0
    if (parsed["rdf:RDF"]) {
      const items = parsed["rdf:RDF"].item || [];
      return items.map((item: any) => parseRssItem(item, config.feedUrl));
    }

    return [];
  },
};

export function textOf(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (val["#text"] !== undefined) return String(val["#text"]);
  return String(val);
}

export function parseRssItem(item: any, baseUrl: string): RawArticle {
  const link = textOf(item.link) || textOf(item.guid) || "";
  const resolvedUrl = resolveUrl(link, baseUrl);
  const guid = textOf(item.guid);
  return {
    external_id: guid || resolvedUrl || textOf(item.title),
    title: stripCdata(textOf(item.title) || "Untitled"),
    url: resolvedUrl,
    summary: stripCdata(textOf(item.description) || textOf(item["content:encoded"]) || "").slice(0, 1000),
    author: textOf(item.author) || textOf(item["dc:creator"]) || undefined,
    published_at: item.pubDate ? new Date(textOf(item.pubDate)).toISOString() : undefined,
  };
}

export function parseAtomEntry(entry: any, baseUrl: string): RawArticle {
  let link = "";
  if (typeof entry.link === "string") {
    link = entry.link;
  } else if (Array.isArray(entry.link)) {
    const alt = entry.link.find((l: any) => l["@_rel"] === "alternate");
    link = alt?.["@_href"] || entry.link[0]?.["@_href"] || "";
  } else if (entry.link?.["@_href"]) {
    link = entry.link["@_href"];
  }

  const resolvedUrl = resolveUrl(link, baseUrl);
  return {
    external_id: entry.id || resolvedUrl || entry.title,
    title: stripCdata(typeof entry.title === "string" ? entry.title : entry.title?.["#text"] || "Untitled"),
    url: resolvedUrl,
    summary: stripCdata(textOf(entry.summary) || textOf(entry.content) || "").slice(0, 1000),
    author: entry.author?.name || undefined,
    published_at: entry.published || entry.updated
      ? new Date(entry.published || entry.updated).toISOString()
      : undefined,
  };
}

export function resolveUrl(url: string, base: string): string {
  if (!url) return "";
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

export function stripCdata(text: string): string {
  if (typeof text !== "string") return String(text || "");
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}
