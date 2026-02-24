import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb } from "../../test/db-helper";
import * as settingsRepo from "./settings";

describe("settings repository", () => {
  beforeEach(() => {
    setupTestDb();
  });

  it("inserts a new setting", () => {
    settingsRepo.upsertSetting("theme", "dark");
    expect(settingsRepo.getSettingValue("theme")).toBe("dark");
  });

  it("updates an existing setting", () => {
    settingsRepo.upsertSetting("theme", "dark");
    settingsRepo.upsertSetting("theme", "light");
    expect(settingsRepo.getSettingValue("theme")).toBe("light");
  });

  it("getSettingValue returns null for missing key", () => {
    expect(settingsRepo.getSettingValue("nonexistent")).toBeNull();
  });

  it("getAllSettings returns all settings", () => {
    settingsRepo.upsertSetting("key1", "val1");
    settingsRepo.upsertSetting("key2", "val2");
    const all = settingsRepo.getAllSettings();
    expect(all.length).toBe(2);
  });
});
