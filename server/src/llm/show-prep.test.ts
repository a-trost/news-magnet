import { describe, it, expect } from "bun:test";
import { splitMarkdownSections, isBlockPage } from "./show-prep";

describe("splitMarkdownSections", () => {
  it("splits all 4 sections correctly", () => {
    const md = `## Summary
This is the summary.

## Why It Matters
This matters because...

## Comedy Angles
- Joke 1
- Joke 2

## Talking Points
- Point 1
- Point 2`;
    const result = splitMarkdownSections(md);
    expect(result.notes_summary).toContain("This is the summary.");
    expect(result.notes_why).toContain("This matters because...");
    expect(result.notes_comedy).toContain("Joke 1");
    expect(result.notes_talking).toContain("Point 1");
  });

  it("returns empty strings for missing sections", () => {
    const md = `## Summary
Just a summary.`;
    const result = splitMarkdownSections(md);
    expect(result.notes_summary).toContain("Just a summary.");
    expect(result.notes_why).toBe("");
    expect(result.notes_comedy).toBe("");
    expect(result.notes_talking).toBe("");
  });

  it("ignores extra/unknown sections", () => {
    const md = `## Summary
Sum.

## Extra Section
This should be ignored.

## Why It Matters
Why.`;
    const result = splitMarkdownSections(md);
    expect(result.notes_summary).toContain("Sum.");
    expect(result.notes_why).toContain("Why.");
  });

  it("handles case-insensitive headings", () => {
    const md = `## summary
lower case summary.

## why it matters
lower case why.`;
    const result = splitMarkdownSections(md);
    expect(result.notes_summary).toContain("lower case summary.");
    expect(result.notes_why).toContain("lower case why.");
  });

  it("returns all empty strings for empty input", () => {
    const result = splitMarkdownSections("");
    expect(result.notes_summary).toBe("");
    expect(result.notes_why).toBe("");
    expect(result.notes_comedy).toBe("");
    expect(result.notes_talking).toBe("");
  });

  it("ignores content before first heading", () => {
    const md = `Some intro text

## Summary
Actual summary.`;
    const result = splitMarkdownSections(md);
    expect(result.notes_summary).toContain("Actual summary.");
  });

  it("handles headings with no body", () => {
    const md = `## Summary
## Why It Matters
Some content here.`;
    const result = splitMarkdownSections(md);
    expect(result.notes_summary).toBe("");
    expect(result.notes_why).toContain("Some content here.");
  });
});

describe("isBlockPage", () => {
  it("detects Cloudflare block page (2+ patterns)", () => {
    const text = "Just a moment... Checking your browser before accessing cloudflare protected site.";
    expect(isBlockPage(text)).toBe(true);
  });

  it("returns false for single pattern match", () => {
    const text = "This page is protected by cloudflare but has normal content about web development.";
    expect(isBlockPage(text)).toBe(false);
  });

  it("returns false for normal content", () => {
    const text = "This is a perfectly normal article about JavaScript frameworks and their performance.";
    expect(isBlockPage(text)).toBe(false);
  });

  it("only checks first 1000 chars", () => {
    const longContent = "A".repeat(1001) + "cloudflare just a moment checking your browser";
    expect(isBlockPage(longContent)).toBe(false);
  });

  it("detects captcha + access denied", () => {
    const text = "Access denied. Please complete the captcha to continue.";
    expect(isBlockPage(text)).toBe(true);
  });

  it("detects 403 + blocked", () => {
    const text = "403 Forbidden - Your request has been blocked by the server.";
    expect(isBlockPage(text)).toBe(true);
  });
});
