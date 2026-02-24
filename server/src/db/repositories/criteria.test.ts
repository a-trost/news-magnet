import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb } from "../../test/db-helper";
import * as criteriaRepo from "./criteria";

describe("criteria repository", () => {
  beforeEach(() => {
    setupTestDb();
  });

  it("creates criteria", () => {
    const criteria = criteriaRepo.createCriteria({
      name: "Test Criteria",
      description: "Test description",
    });
    expect(criteria.id).toBeDefined();
    expect(criteria.name).toBe("Test Criteria");
    expect(criteria.is_active).toBe(true);
  });

  it("gets criteria by id", () => {
    const created = criteriaRepo.createCriteria({ name: "Find Me", description: "desc" });
    const found = criteriaRepo.getCriteriaById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Find Me");
  });

  it("gets all criteria (including seeded)", () => {
    const all = criteriaRepo.getAllCriteria();
    // DB seeds one default criteria
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it("getActiveCriteria returns only active", () => {
    criteriaRepo.createCriteria({ name: "Active", description: "d", is_active: true });
    criteriaRepo.createCriteria({ name: "Inactive", description: "d", is_active: false });
    const active = criteriaRepo.getActiveCriteria();
    const names = active.map((c) => c.name);
    expect(names).toContain("Active");
    expect(names).not.toContain("Inactive");
  });

  it("updates criteria", () => {
    const criteria = criteriaRepo.createCriteria({ name: "Original", description: "d" });
    const updated = criteriaRepo.updateCriteria(criteria.id, { name: "Updated" });
    expect(updated!.name).toBe("Updated");
    expect(updated!.description).toBe("d");
  });

  it("deletes criteria", () => {
    const criteria = criteriaRepo.createCriteria({ name: "Delete Me", description: "d" });
    expect(criteriaRepo.deleteCriteria(criteria.id)).toBe(true);
    expect(criteriaRepo.getCriteriaById(criteria.id)).toBeNull();
  });
});
