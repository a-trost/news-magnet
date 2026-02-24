import { describe, it, expect } from "bun:test";
import { normalizeFilterResult, extractJsonArray } from "./filter";

describe("normalizeFilterResult", () => {
  it("clamps score above 1.0 to 1.0", () => {
    const result = normalizeFilterResult({ id: 1, score: 1.5, relevant: true, reason: "test" });
    expect(result.score).toBe(1.0);
  });

  it("clamps negative score to 0.0", () => {
    const result = normalizeFilterResult({ id: 1, score: -0.3, relevant: false, reason: "test" });
    expect(result.score).toBe(0.0);
  });

  it("passes through normal score", () => {
    const result = normalizeFilterResult({ id: 1, score: 0.7, relevant: true, reason: "test" });
    expect(result.score).toBe(0.7);
  });

  it("preserves explicit relevant: true", () => {
    const result = normalizeFilterResult({ id: 1, score: 0.3, relevant: true, reason: "test" });
    expect(result.relevant).toBe(true);
  });

  it("preserves explicit relevant: false", () => {
    const result = normalizeFilterResult({ id: 1, score: 0.8, relevant: false, reason: "test" });
    expect(result.relevant).toBe(false);
  });

  it("derives relevant from score >= 0.5 when missing", () => {
    const result = normalizeFilterResult({ id: 1, score: 0.6, relevant: undefined as any, reason: "test" });
    expect(result.relevant).toBe(true);
  });

  it("derives relevant as false when score < 0.5", () => {
    const result = normalizeFilterResult({ id: 1, score: 0.4, relevant: undefined as any, reason: "test" });
    expect(result.relevant).toBe(false);
  });

  it("treats exactly 0.5 as relevant", () => {
    const result = normalizeFilterResult({ id: 1, score: 0.5, relevant: undefined as any, reason: "test" });
    expect(result.relevant).toBe(true);
  });

  it("provides default reason when missing", () => {
    const result = normalizeFilterResult({ id: 1, score: 0.5, relevant: true, reason: "" });
    expect(result.reason).toBe("No reason provided");
  });
});

describe("extractJsonArray", () => {
  it("extracts array from surrounding text", () => {
    const text = 'Here are the results: [{"id": 1, "score": 0.8}] done.';
    const result = extractJsonArray(text);
    expect(result).toEqual([{ id: 1, score: 0.8 }]);
  });

  it("throws when no array found", () => {
    expect(() => extractJsonArray("no array here")).toThrow("No JSON array");
  });

  it("throws on invalid JSON", () => {
    expect(() => extractJsonArray("[{invalid json}]")).toThrow("Invalid JSON");
  });

  it("extracts multi-element array", () => {
    const text = `Results:
[
  {"id": 1, "score": 0.8, "relevant": true, "reason": "good"},
  {"id": 2, "score": 0.3, "relevant": false, "reason": "bad"}
]`;
    const result = extractJsonArray(text);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });
});
