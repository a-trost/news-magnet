import { _resetForTest } from "../db/database";

/**
 * Call this in beforeEach to get a fresh in-memory DB for each test.
 * Uses `:memory:` which creates a brand new database each time
 * _resetForTest closes the old one first.
 */
export function setupTestDb() {
  _resetForTest(":memory:");
}
