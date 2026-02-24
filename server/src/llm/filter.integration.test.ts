import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb } from "../test/db-helper";
import { resetFixtureCounter } from "../test/fixtures";
import { normalizeFilterResult, extractJsonArray } from "./filter";

describe("filter integration", () => {
  beforeEach(() => {
    setupTestDb();
    resetFixtureCounter();
  });

  it("normalizes results through the full pipeline", () => {
    const rawResults = [
      { id: 1, score: 1.5, relevant: true, reason: "Very relevant" },
      { id: 2, score: -0.3, relevant: false, reason: "" },
      { id: 3, score: 0.6, relevant: undefined as any, reason: "Medium" },
    ];

    const normalized = rawResults.map(normalizeFilterResult);
    expect(normalized[0].score).toBe(1.0);
    expect(normalized[1].score).toBe(0.0);
    expect(normalized[1].reason).toBe("No reason provided");
    expect(normalized[2].relevant).toBe(true);
  });

  it("extractJsonArray + normalizeFilterResult round-trips correctly", () => {
    const claudeResponse = `Here are the results:
[
  {"id": 1, "score": 0.85, "relevant": true, "reason": "Major framework release"},
  {"id": 2, "score": 0.15, "relevant": false, "reason": "Minor patch"}
]
Done.`;
    const raw = extractJsonArray(claudeResponse);
    const normalized = raw.map(normalizeFilterResult);
    expect(normalized.length).toBe(2);
    expect(normalized[0].score).toBe(0.85);
    expect(normalized[0].relevant).toBe(true);
    expect(normalized[1].score).toBe(0.15);
    expect(normalized[1].relevant).toBe(false);
  });

  it("score clamping through full pipeline", () => {
    const text = '[{"id":1,"score":2.5,"relevant":true,"reason":"over"},{"id":2,"score":-1,"reason":"under"}]';
    const raw = extractJsonArray(text);
    const normalized = raw.map(normalizeFilterResult);
    expect(normalized[0].score).toBe(1.0);
    expect(normalized[1].score).toBe(0.0);
    expect(normalized[1].relevant).toBe(false);
  });

  it("handles edge case: empty array response", () => {
    const text = "No articles to filter: []";
    const raw = extractJsonArray(text);
    expect(raw.length).toBe(0);
  });

  it("handles mixed valid/invalid scores", () => {
    const text = '[{"id":1,"score":0.5,"reason":"boundary"},{"id":2,"score":0.499,"reason":"just below"}]';
    const raw = extractJsonArray(text);
    const normalized = raw.map(normalizeFilterResult);
    expect(normalized[0].relevant).toBe(true); // exactly 0.5
    expect(normalized[1].relevant).toBe(false); // just below 0.5
  });
});
