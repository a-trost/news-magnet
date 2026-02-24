import { describe, it, expect, beforeEach, mock } from "bun:test";
import { Hono } from "hono";
import { setupTestDb } from "../test/db-helper";
import { makeRawArticle, resetFixtureCounter } from "../test/fixtures";
import * as articlesRepo from "../db/repositories/articles";
import * as sourcesRepo from "../db/repositories/sources";
import { articlesRouter } from "./articles";

const app = new Hono();
app.route("/api/articles", articlesRouter);

function createTestSource() {
  return sourcesRepo.createSource({
    name: "Test",
    type: "rss",
    config: { feedUrl: `https://example.com/${Math.random()}` },
  });
}

function seedArticle() {
  const source = createTestSource();
  articlesRepo.insertArticles(source.id, [makeRawArticle()]);
  return articlesRepo.getArticles().articles[0];
}

describe("articles routes", () => {
  beforeEach(() => {
    setupTestDb();
    resetFixtureCounter();
  });

  it("GET / returns articles with default filters", async () => {
    const source = createTestSource();
    articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
    const res = await app.request("/api/articles");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.articles.length).toBe(2);
    expect(body.data.total).toBe(2);
  });

  it("GET / passes query params as filters", async () => {
    const source = createTestSource();
    articlesRepo.insertArticles(source.id, [makeRawArticle()]);
    const res = await app.request(`/api/articles?sourceId=${source.id}&sort=score_desc`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.articles.length).toBe(1);
  });

  it("POST /:id/save saves and returns success", async () => {
    const article = seedArticle();
    const res = await app.request(`/api/articles/${article.id}/save`, { method: "POST" });
    expect(res.status).toBe(200);
    const saved = articlesRepo.getArticleById(article.id)!;
    expect(saved.is_saved).toBe(true);
  });

  it("POST /:id/unsave unsaves", async () => {
    const article = seedArticle();
    articlesRepo.saveArticle(article.id);
    const res = await app.request(`/api/articles/${article.id}/unsave`, { method: "POST" });
    expect(res.status).toBe(200);
    const unsaved = articlesRepo.getArticleById(article.id)!;
    expect(unsaved.is_saved).toBe(false);
  });

  it("PUT /:id/show-notes updates section", async () => {
    const article = seedArticle();
    const res = await app.request(`/api/articles/${article.id}/show-notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "notes_summary", content: "<p>Test summary</p>" }),
    });
    expect(res.status).toBe(200);
    const updated = articlesRepo.getArticleById(article.id)!;
    expect(updated.notes_summary).toBe("<p>Test summary</p>");
  });

  it("DELETE /:id deletes article", async () => {
    const article = seedArticle();
    const res = await app.request(`/api/articles/${article.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(articlesRepo.getArticleById(article.id)).toBeNull();
  });

  it("DELETE /:id returns 404 for missing", async () => {
    createTestSource(); // init DB
    const res = await app.request("/api/articles/99999", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("PUT /reorder updates display order", async () => {
    const source = createTestSource();
    articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
    const all = articlesRepo.getArticles();
    const ids = all.articles.map((a) => a.id).reverse();
    const res = await app.request("/api/articles/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ids }),
    });
    expect(res.status).toBe(200);
  });

  it("POST /clear-unsaved deletes unsaved articles", async () => {
    const source = createTestSource();
    articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
    const res = await app.request("/api/articles/clear-unsaved", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(2);
  });
});
