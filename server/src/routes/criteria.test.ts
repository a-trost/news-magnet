import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { setupTestDb } from "../test/db-helper";
import * as criteriaRepo from "../db/repositories/criteria";
import { criteriaRouter } from "./criteria";

const app = new Hono();
app.route("/api/criteria", criteriaRouter);

describe("criteria routes", () => {
  beforeEach(() => {
    setupTestDb();
  });

  it("GET / returns all criteria", async () => {
    criteriaRepo.createCriteria({ name: "C1", description: "d1" });
    const res = await app.request("/api/criteria");
    expect(res.status).toBe(200);
    const body = await res.json();
    // At least the one we created + seeded default
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("POST / creates criteria", async () => {
    const res = await app.request("/api/criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Criteria", description: "desc" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("New Criteria");
    expect(body.data.is_active).toBe(true);
  });

  it("POST / returns 400 for missing fields", async () => {
    const res = await app.request("/api/criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Description" }),
    });
    expect(res.status).toBe(400);
  });

  it("PUT /:id/activate activates criteria", async () => {
    const criteria = criteriaRepo.createCriteria({ name: "Inactive", description: "d", is_active: false });
    const res = await app.request(`/api/criteria/${criteria.id}/activate`, { method: "PUT" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.is_active).toBe(true);
  });

  it("DELETE /:id deletes criteria", async () => {
    const criteria = criteriaRepo.createCriteria({ name: "Del", description: "d" });
    const res = await app.request(`/api/criteria/${criteria.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(criteriaRepo.getCriteriaById(criteria.id)).toBeNull();
  });
});
