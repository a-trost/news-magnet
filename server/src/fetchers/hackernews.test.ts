import { describe, it, expect } from "bun:test";
import { stripHtml } from "./hackernews";

describe("stripHtml", () => {
  it("strips basic HTML tags", () => {
    expect(stripHtml("<p>hello</p> <b>world</b>")).toBe("hello world");
  });

  it("converts <p> and <br> to spaces", () => {
    expect(stripHtml("line1<p>line2<br>line3<br/>line4")).toBe("line1 line2 line3 line4");
  });

  it("decodes named entities", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot; &apos;")).toBe('& < > " \'');
  });

  it("decodes hex entities", () => {
    expect(stripHtml("&#x3C;tag&#x3E;")).toBe("<tag>");
  });

  it("decodes decimal entities", () => {
    expect(stripHtml("&#60;tag&#62;")).toBe("<tag>");
  });

  it("normalizes whitespace", () => {
    expect(stripHtml("  too   many    spaces  ")).toBe("too many spaces");
  });

  it("handles combined tags, entities, and whitespace", () => {
    const input = "<p>Hello &amp; welcome</p><br>  Check &#x3C;this&#x3E; out  ";
    expect(stripHtml(input)).toBe("Hello & welcome Check <this> out");
  });
});
