import { describe, it, expect } from "bun:test";
import { textOf, parseRssItem, parseAtomEntry, stripCdata, resolveUrl } from "./rss";

describe("textOf", () => {
  it("returns empty string for null", () => {
    expect(textOf(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(textOf(undefined)).toBe("");
  });

  it("passes through strings", () => {
    expect(textOf("hello")).toBe("hello");
  });

  it("coerces numbers to strings", () => {
    expect(textOf(42)).toBe("42");
  });

  it("extracts #text property", () => {
    expect(textOf({ "#text": "extracted" })).toBe("extracted");
  });

  it("stringifies other objects", () => {
    expect(textOf({ foo: "bar" })).toBe("[object Object]");
  });
});

describe("stripCdata", () => {
  it("removes CDATA wrappers", () => {
    expect(stripCdata("<![CDATA[hello world]]>")).toBe("hello world");
  });

  it("strips HTML tags", () => {
    expect(stripCdata("<p>hello</p> <b>world</b>")).toBe("hello world");
  });

  it("handles combined CDATA and HTML", () => {
    expect(stripCdata("<![CDATA[<p>hello</p>]]>")).toBe("hello");
  });

  it("handles non-string input gracefully", () => {
    expect(stripCdata(123 as any)).toBe("123");
  });

  it("returns empty string for falsy non-string", () => {
    expect(stripCdata(null as any)).toBe("");
  });
});

describe("resolveUrl", () => {
  it("resolves relative URL against base", () => {
    expect(resolveUrl("/article/1", "https://example.com/feed")).toBe(
      "https://example.com/article/1"
    );
  });

  it("returns empty string for empty URL", () => {
    expect(resolveUrl("", "https://example.com")).toBe("");
  });

  it("returns absolute URL unchanged", () => {
    expect(resolveUrl("https://other.com/page", "https://example.com")).toBe(
      "https://other.com/page"
    );
  });

  it("returns original URL on invalid base", () => {
    expect(resolveUrl("not-a-url", "not-a-base")).toBe("not-a-url");
  });
});

describe("parseRssItem", () => {
  const baseUrl = "https://example.com/feed.xml";

  it("parses minimal item", () => {
    const item = { title: "Test Title", link: "https://example.com/post" };
    const result = parseRssItem(item, baseUrl);
    expect(result.title).toBe("Test Title");
    expect(result.url).toBe("https://example.com/post");
    expect(result.external_id).toBe("https://example.com/post");
  });

  it("parses full item with pubDate, author, and description", () => {
    const item = {
      title: "Full Article",
      link: "https://example.com/full",
      guid: "guid-123",
      description: "A summary of the article",
      author: "Jane Doe",
      pubDate: "Mon, 01 Jan 2024 00:00:00 GMT",
    };
    const result = parseRssItem(item, baseUrl);
    expect(result.title).toBe("Full Article");
    expect(result.url).toBe("https://example.com/full");
    expect(result.external_id).toBe("guid-123");
    expect(result.summary).toBe("A summary of the article");
    expect(result.author).toBe("Jane Doe");
    expect(result.published_at).toBe("2024-01-01T00:00:00.000Z");
  });

  it("handles CDATA-wrapped fields", () => {
    const item = {
      title: "<![CDATA[<b>Bold Title</b>]]>",
      link: "https://example.com/cdata",
      description: "<![CDATA[<p>Paragraph content</p>]]>",
    };
    const result = parseRssItem(item, baseUrl);
    expect(result.title).toBe("Bold Title");
    expect(result.summary).toBe("Paragraph content");
  });

  it("uses guid as external_id when present", () => {
    const item = {
      title: "Test",
      link: "https://example.com/test",
      guid: "unique-guid",
    };
    const result = parseRssItem(item, baseUrl);
    expect(result.external_id).toBe("unique-guid");
  });

  it("falls back to title for external_id when no link or guid", () => {
    const item = { title: "Fallback Title" };
    const result = parseRssItem(item, baseUrl);
    expect(result.external_id).toBe("Fallback Title");
  });
});

describe("parseAtomEntry", () => {
  const baseUrl = "https://example.com/feed";

  it("extracts link from single link object with @_href", () => {
    const entry = {
      title: "Atom Article",
      link: { "@_href": "https://example.com/atom-post", "@_rel": "alternate" },
      id: "atom-id-1",
    };
    const result = parseAtomEntry(entry, baseUrl);
    expect(result.url).toBe("https://example.com/atom-post");
    expect(result.external_id).toBe("atom-id-1");
  });

  it("extracts alternate link from array", () => {
    const entry = {
      title: "Multi-link",
      link: [
        { "@_rel": "self", "@_href": "https://example.com/self" },
        { "@_rel": "alternate", "@_href": "https://example.com/alternate" },
      ],
      id: "atom-id-2",
    };
    const result = parseAtomEntry(entry, baseUrl);
    expect(result.url).toBe("https://example.com/alternate");
  });

  it("falls back to first link in array when no alternate", () => {
    const entry = {
      title: "First-link",
      link: [
        { "@_rel": "self", "@_href": "https://example.com/first" },
      ],
      id: "atom-id-3",
    };
    const result = parseAtomEntry(entry, baseUrl);
    expect(result.url).toBe("https://example.com/first");
  });

  it("handles plain string link", () => {
    const entry = {
      title: "String Link",
      link: "https://example.com/string-link",
      id: "atom-id-4",
    };
    const result = parseAtomEntry(entry, baseUrl);
    expect(result.url).toBe("https://example.com/string-link");
  });

  it("extracts author name", () => {
    const entry = {
      title: "Authored",
      link: { "@_href": "https://example.com/authored" },
      author: { name: "John Smith" },
      id: "atom-id-5",
    };
    const result = parseAtomEntry(entry, baseUrl);
    expect(result.author).toBe("John Smith");
  });

  it("uses published or updated for date", () => {
    const entry = {
      title: "Dated",
      link: { "@_href": "https://example.com/dated" },
      published: "2024-06-15T12:00:00Z",
      id: "atom-id-6",
    };
    const result = parseAtomEntry(entry, baseUrl);
    expect(result.published_at).toBe("2024-06-15T12:00:00.000Z");
  });

  it("handles missing fields gracefully", () => {
    const entry = {};
    const result = parseAtomEntry(entry, baseUrl);
    expect(result.title).toBe("Untitled");
    expect(result.url).toBe("");
    expect(result.author).toBeUndefined();
    expect(result.published_at).toBeUndefined();
  });
});
