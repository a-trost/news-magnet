import * as cheerio from "cheerio";

export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

const JINA_READER_BASE = "https://r.jina.ai/";

const BLOCK_PAGE_PATTERNS = [
  "just a moment", "access denied", "attention required",
  "checking your browser", "please wait", "one moment",
  "verify you are human", "security check",
];

export interface ArticleMetadata {
  title: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
}

export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  // Try direct fetch first
  const directResult = await tryDirectFetch(url);
  if (directResult) return directResult;

  // Fallback: use Jina Reader
  const jinaResult = await tryJinaReader(url);
  if (jinaResult) return jinaResult;

  throw new Error("Failed to fetch article metadata — site may be behind Cloudflare or a paywall");
}

async function tryDirectFetch(url: string): Promise<ArticleMetadata | null> {
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    return parseHtmlMetadata(await response.text());
  } catch {
    return null;
  }
}

async function tryJinaReader(url: string): Promise<ArticleMetadata | null> {
  try {
    const res = await fetch(`${JINA_READER_BASE}${url}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      data?: { title?: string; description?: string };
    };
    const title = json.data?.title?.trim();
    if (!title || isBlockPage(title)) return null;
    return {
      title,
      summary: json.data?.description?.trim() || null,
      author: null,
      published_at: null,
    };
  } catch {
    return null;
  }
}

function parseHtmlMetadata(html: string): ArticleMetadata | null {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim();

  if (!title || isBlockPage(title)) return null;

  return {
    title,
    summary:
      $('meta[property="og:description"]').attr("content")?.trim() ||
      $('meta[name="description"]').attr("content")?.trim() ||
      null,
    author:
      $('meta[name="author"]').attr("content")?.trim() ||
      $('meta[property="article:author"]').attr("content")?.trim() ||
      null,
    published_at:
      $('meta[property="article:published_time"]').attr("content")?.trim() ||
      $('meta[property="og:article:published_time"]').attr("content")?.trim() ||
      null,
  };
}

function isBlockPage(title: string): boolean {
  const lower = title.toLowerCase();
  return BLOCK_PAGE_PATTERNS.some((p) => lower.includes(p));
}
