import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { setupTestDb } from "../test/db-helper";
import * as sourcesRepo from "../db/repositories/sources";
import { sourcesRouter } from "./sources";

const app = new Hono();
app.route("/api/sources", sourcesRouter);

describe("sources routes", () => {
  beforeEach(() => {
    setupTestDb();
  });

  it("GET / returns all sources", async () => {
    sourcesRepo.createSource({ name: "S1", type: "rss", config: { feedUrl: "u1" } });
    const res = await app.request("/api/sources");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
  });

  it("POST / creates a source", async () => {
    const res = await app.request("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New", type: "rss", config: { feedUrl: "https://new.com" } }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe("New");
  });

  it("POST / returns 400 for missing fields", async () => {
    const res = await app.request("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Incomplete" }),
    });
    expect(res.status).toBe(400);
  });

  it("PUT /:id updates a source", async () => {
    const source = sourcesRepo.createSource({ name: "Original", type: "rss", config: { feedUrl: "u" } });
    const res = await app.request(`/api/sources/${source.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Updated");
  });

  it("DELETE /:id deletes a source", async () => {
    const source = sourcesRepo.createSource({ name: "Del", type: "rss", config: { feedUrl: "u" } });
    const res = await app.request(`/api/sources/${source.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(sourcesRepo.getSourceById(source.id)).toBeNull();
  });
});
