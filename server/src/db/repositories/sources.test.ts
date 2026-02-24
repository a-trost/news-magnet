import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb } from "../../test/db-helper";
import * as sourcesRepo from "./sources";

describe("sources repository", () => {
  beforeEach(() => {
    setupTestDb();
  });

  it("creates a source", () => {
    const source = sourcesRepo.createSource({
      name: "Test RSS",
      type: "rss",
      config: { feedUrl: "https://example.com/feed" },
    });
    expect(source.id).toBeDefined();
    expect(source.name).toBe("Test RSS");
    expect(source.type).toBe("rss");
    expect(source.config).toEqual({ feedUrl: "https://example.com/feed" });
    expect(source.enabled).toBe(true);
  });

  it("gets source by id", () => {
    const created = sourcesRepo.createSource({
      name: "Get By Id",
      type: "hackernews",
      config: { feedType: "top", maxItems: 30 },
    });
    const found = sourcesRepo.getSourceById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Get By Id");
  });

  it("returns null for non-existent id", () => {
    sourcesRepo.createSource({ name: "X", type: "rss", config: { feedUrl: "x" } });
    expect(sourcesRepo.getSourceById(99999)).toBeNull();
  });

  it("gets all sources", () => {
    sourcesRepo.createSource({ name: "S1", type: "rss", config: { feedUrl: "u1" } });
    sourcesRepo.createSource({ name: "S2", type: "rss", config: { feedUrl: "u2" } });
    const all = sourcesRepo.getAllSources();
    expect(all.length).toBe(2);
  });

  it("updates source preserving unchanged fields", () => {
    const source = sourcesRepo.createSource({
      name: "Original",
      type: "rss",
      config: { feedUrl: "https://original.com" },
      enabled: true,
    });
    const updated = sourcesRepo.updateSource(source.id, { name: "Updated" });
    expect(updated!.name).toBe("Updated");
    expect(updated!.config).toEqual({ feedUrl: "https://original.com" });
    expect(updated!.enabled).toBe(true);
  });

  it("getEnabledSources returns only enabled", () => {
    sourcesRepo.createSource({ name: "Enabled", type: "rss", config: { feedUrl: "e" }, enabled: true });
    sourcesRepo.createSource({ name: "Disabled", type: "rss", config: { feedUrl: "d" }, enabled: false });
    const enabled = sourcesRepo.getEnabledSources();
    expect(enabled.length).toBe(1);
    expect(enabled[0].name).toBe("Enabled");
  });

  it("deletes a source", () => {
    const source = sourcesRepo.createSource({ name: "Delete Me", type: "rss", config: { feedUrl: "x" } });
    expect(sourcesRepo.deleteSource(source.id)).toBe(true);
    expect(sourcesRepo.getSourceById(source.id)).toBeNull();
  });

  it("delete returns false for missing source", () => {
    sourcesRepo.createSource({ name: "X", type: "rss", config: { feedUrl: "x" } });
    expect(sourcesRepo.deleteSource(99999)).toBe(false);
  });
});
