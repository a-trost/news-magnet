import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface ArticleMetadata {
  title: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
}

export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    url;

  const summary =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  const author =
    $('meta[name="author"]').attr("content")?.trim() ||
    $('meta[property="article:author"]').attr("content")?.trim() ||
    null;

  const published_at =
    $('meta[property="article:published_time"]').attr("content")?.trim() ||
    $('meta[property="og:article:published_time"]').attr("content")?.trim() ||
    null;

  return { title, summary, author, published_at };
}
