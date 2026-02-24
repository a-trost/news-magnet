import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import type { Source } from "@shared/types";

const RSS_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Article One</title>
      <link>https://example.com/one</link>
      <description>First article</description>
      <pubDate>Mon, 20 Jan 2025 12:00:00 GMT</pubDate>
      <author>John</author>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/two</link>
      <description>Second article</description>
    </item>
  </channel>
</rss>`;

const ATOM_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Test</title>
  <entry>
    <title>Atom Article</title>
    <link href="https://example.com/atom" rel="alternate"/>
    <id>atom-1</id>
    <summary>Atom summary</summary>
    <author><name>Jane</name></author>
    <published>2025-01-15T10:00:00Z</published>
  </entry>
</feed>`;

const RDF_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/">
  <item>
    <title>RDF Article</title>
    <link>https://example.com/rdf</link>
    <description>RDF content</description>
  </item>
</rdf:RDF>`;

const testSource: Source = {
  id: 1,
  name: "Test RSS",
  type: "rss",
  config: { feedUrl: "https://example.com/feed.xml" },
  enabled: true,
  config_key: null,
  last_fetched_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const originalFetch = globalThis.fetch;

describe("RSS fetcher integration", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("parses RSS 2.0 feed with multiple items", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(RSS_FEED, { status: 200 }))
    ) as any;

    const { rssFetcher } = await import("./rss");
    const articles = await rssFetcher.fetch(testSource);
    expect(articles.length).toBe(2);
    expect(articles[0].title).toBe("Article One");
    expect(articles[0].url).toBe("https://example.com/one");
    expect(articles[0].author).toBe("John");
    expect(articles[1].title).toBe("Article Two");
  });

  it("parses Atom feed", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(ATOM_FEED, { status: 200 }))
    ) as any;

    const { rssFetcher } = await import("./rss");
    const articles = await rssFetcher.fetch(testSource);
    expect(articles.length).toBe(1);
    expect(articles[0].title).toBe("Atom Article");
    expect(articles[0].url).toBe("https://example.com/atom");
    expect(articles[0].author).toBe("Jane");
    expect(articles[0].external_id).toBe("atom-1");
  });

  it("parses RDF/RSS 1.0 format", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(RDF_FEED, { status: 200 }))
    ) as any;

    const { rssFetcher } = await import("./rss");
    const articles = await rssFetcher.fetch(testSource);
    expect(articles.length).toBe(1);
    expect(articles[0].title).toBe("RDF Article");
  });

  it("throws on HTTP error", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Not Found", { status: 404, statusText: "Not Found" }))
    ) as any;

    const { rssFetcher } = await import("./rss");
    expect(rssFetcher.fetch(testSource)).rejects.toThrow("Failed to fetch RSS feed");
  });

  it("returns empty array for empty feed", async () => {
    const emptyFeed = `<?xml version="1.0"?><rss version="2.0"><channel><title>Empty</title></channel></rss>`;
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(emptyFeed, { status: 200 }))
    ) as any;

    const { rssFetcher } = await import("./rss");
    const articles = await rssFetcher.fetch(testSource);
    expect(articles.length).toBe(0);
  });

  it("handles malformed XML gracefully", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("not xml at all {}", { status: 200 }))
    ) as any;

    const { rssFetcher } = await import("./rss");
    const articles = await rssFetcher.fetch(testSource);
    expect(articles.length).toBe(0);
  });
});
