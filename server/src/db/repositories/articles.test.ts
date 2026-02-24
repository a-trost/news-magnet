import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb } from "../../test/db-helper";
import { makeRawArticle, resetFixtureCounter } from "../../test/fixtures";
import * as articlesRepo from "./articles";
import * as sourcesRepo from "./sources";
import * as episodesRepo from "./episodes";
import { getDb } from "../database";

function createTestSource(name = "Test Source") {
  return sourcesRepo.createSource({
    name,
    type: "rss",
    config: { feedUrl: `https://example.com/feed/${Math.random()}` },
  });
}

describe("articles repository", () => {
  beforeEach(() => {
    setupTestDb();
    resetFixtureCounter();
  });

  describe("insertArticles", () => {
    it("inserts new articles and returns correct count", () => {
      const source = createTestSource();
      const articles = [makeRawArticle(), makeRawArticle(), makeRawArticle()];
      const inserted = articlesRepo.insertArticles(source.id, articles);
      expect(inserted).toBe(3);
    });

    it("deduplicates by URL within same source", () => {
      const source = createTestSource();
      const url = `https://example.com/dupe-${Math.random()}`;
      const articles = [
        makeRawArticle({ url }),
        makeRawArticle({ url }),
      ];
      const inserted = articlesRepo.insertArticles(source.id, articles);
      expect(inserted).toBe(1);
    });

    it("deduplicates against existing articles", () => {
      const source = createTestSource();
      const url = `https://example.com/existing-${Math.random()}`;
      articlesRepo.insertArticles(source.id, [makeRawArticle({ url })]);
      const inserted = articlesRepo.insertArticles(source.id, [makeRawArticle({ url })]);
      expect(inserted).toBe(0);
    });

    it("filters articles older than 2 weeks", () => {
      const source = createTestSource();
      const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
      const articles = [makeRawArticle({ published_at: threeWeeksAgo })];
      const inserted = articlesRepo.insertArticles(source.id, articles);
      expect(inserted).toBe(0);
    });

    it("keeps articles with no published_at", () => {
      const source = createTestSource();
      const articles = [makeRawArticle({ published_at: undefined })];
      const inserted = articlesRepo.insertArticles(source.id, articles);
      expect(inserted).toBe(1);
    });

    it("returns 0 for empty array", () => {
      const source = createTestSource();
      const inserted = articlesRepo.insertArticles(source.id, []);
      expect(inserted).toBe(0);
    });
  });

  describe("getArticles", () => {
    it("returns all articles with no filters", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
      const result = articlesRepo.getArticles();
      expect(result.articles.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("filters by sourceId", () => {
      const source1 = createTestSource("Source 1");
      const source2 = createTestSource("Source 2");
      articlesRepo.insertArticles(source1.id, [makeRawArticle()]);
      articlesRepo.insertArticles(source2.id, [makeRawArticle()]);
      const result = articlesRepo.getArticles({ sourceId: source1.id });
      expect(result.articles.length).toBe(1);
    });

    it("filters by isRelevant", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
      const all = articlesRepo.getArticles();
      articlesRepo.updateArticleRelevance(all.articles[0].id, 0.8, "Good", true);
      const relevant = articlesRepo.getArticles({ isRelevant: true });
      expect(relevant.articles.length).toBe(1);
    });

    it("filters by isSaved", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
      const all = articlesRepo.getArticles();
      articlesRepo.saveArticle(all.articles[0].id);
      const saved = articlesRepo.getArticles({ isSaved: true });
      expect(saved.articles.length).toBe(1);
      expect(saved.articles[0].is_saved).toBe(true);
    });

    it("filters by minScore", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
      const all = articlesRepo.getArticles();
      articlesRepo.updateArticleRelevance(all.articles[0].id, 0.9, "High", true);
      articlesRepo.updateArticleRelevance(all.articles[1].id, 0.3, "Low", false);
      const highScore = articlesRepo.getArticles({ minScore: 0.5 });
      expect(highScore.articles.length).toBe(1);
    });

    it("filters by search on title", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [
        makeRawArticle({ title: "React 20 Released" }),
        makeRawArticle({ title: "Vue Update" }),
      ]);
      const result = articlesRepo.getArticles({ search: "React" });
      expect(result.articles.length).toBe(1);
      expect(result.articles[0].title).toBe("React 20 Released");
    });

    it("filters by episodeId", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
      const episode = episodesRepo.createEpisode({ title: "Ep 1" });
      const all = articlesRepo.getArticles();
      episodesRepo.addArticleToEpisode(all.articles[0].id, episode.id);
      const result = articlesRepo.getArticles({ episodeId: episode.id });
      expect(result.articles.length).toBe(1);
    });

    it("filters unassigned saved articles", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
      const all = articlesRepo.getArticles();
      articlesRepo.saveArticle(all.articles[0].id);
      articlesRepo.saveArticle(all.articles[1].id);
      const episode = episodesRepo.createEpisode({ title: "Ep 1" });
      episodesRepo.addArticleToEpisode(all.articles[0].id, episode.id);
      const unassigned = articlesRepo.getArticles({ unassigned: true });
      expect(unassigned.articles.length).toBe(1);
    });

    it("hides articles from archived episodes by default", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
      const episode = episodesRepo.createEpisode({ title: "Old Ep" });
      const all = articlesRepo.getArticles();
      episodesRepo.addArticleToEpisode(all.articles[0].id, episode.id);
      episodesRepo.updateEpisode(episode.id, { is_archived: true });
      const visible = articlesRepo.getArticles();
      expect(visible.articles.length).toBe(1);
    });
  });

  describe("getArticles sorting", () => {
    it("sorts by newest (default)", () => {
      const source = createTestSource();
      const now = Date.now();
      articlesRepo.insertArticles(source.id, [
        makeRawArticle({ title: "Old", published_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() }),
        makeRawArticle({ title: "New", published_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() }),
      ]);
      const result = articlesRepo.getArticles({ sort: "newest", sourceId: source.id });
      expect(result.articles.length).toBe(2);
      expect(result.articles[0].title).toBe("New");
    });

    it("sorts by score_desc", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle()]);
      const all = articlesRepo.getArticles();
      articlesRepo.updateArticleRelevance(all.articles[0].id, 0.3, "Low", false);
      articlesRepo.updateArticleRelevance(all.articles[1].id, 0.9, "High", true);
      const result = articlesRepo.getArticles({ sort: "score_desc" });
      expect(result.articles[0].relevance_score).toBe(0.9);
    });
  });

  describe("getArticles pagination", () => {
    it("returns correct page slice", () => {
      const source = createTestSource();
      const articles = Array.from({ length: 5 }, () => makeRawArticle());
      articlesRepo.insertArticles(source.id, articles);
      const page1 = articlesRepo.getArticles({ page: 1, limit: 2 });
      expect(page1.articles.length).toBe(2);
      expect(page1.total).toBe(5);
    });

    it("calculates totalPages correctly", () => {
      const source = createTestSource();
      const articles = Array.from({ length: 7 }, () => makeRawArticle());
      articlesRepo.insertArticles(source.id, articles);
      const result = articlesRepo.getArticles({ page: 1, limit: 3 });
      expect(result.totalPages).toBe(3);
    });
  });

  describe("saveArticle / unsaveArticle", () => {
    it("saves article and sets saved_at", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle()]);
      const all = articlesRepo.getArticles();
      const id = all.articles[0].id;
      articlesRepo.saveArticle(id);
      const article = articlesRepo.getArticleById(id)!;
      expect(article.is_saved).toBe(true);
      expect(article.saved_at).not.toBeNull();
    });

    it("unsave clears episode_id", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle()]);
      const episode = episodesRepo.createEpisode({ title: "Ep" });
      const all = articlesRepo.getArticles();
      const id = all.articles[0].id;
      articlesRepo.saveArticle(id);
      episodesRepo.addArticleToEpisode(id, episode.id);
      articlesRepo.unsaveArticle(id);
      const article = articlesRepo.getArticleById(id)!;
      expect(article.is_saved).toBe(false);
      expect(article.episode_id).toBeNull();
    });
  });

  describe("updateDisplayOrder", () => {
    it("sets display_order for ordered IDs", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle(), makeRawArticle(), makeRawArticle()]);
      const all = articlesRepo.getArticles();
      const ids = all.articles.map((a) => a.id);
      articlesRepo.updateDisplayOrder(ids);
      for (let i = 0; i < ids.length; i++) {
        const article = articlesRepo.getArticleById(ids[i])!;
        expect(article.display_order).toBe(i);
      }
    });
  });

  describe("deleteOldArticles", () => {
    it("deletes old articles without episode", () => {
      const source = createTestSource();
      const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
      // Insert an article with an old date by inserting then updating via repo pattern
      articlesRepo.insertArticles(source.id, [
        makeRawArticle({ published_at: new Date().toISOString() }),
      ]);
      const all = articlesRepo.getArticles({ sourceId: source.id });
      // Use the DB from the same getDb call chain
      const db = getDb();
      db.run("UPDATE articles SET published_at = ? WHERE id = ?", [threeWeeksAgo, all.articles[0].id]);
      const deleted = articlesRepo.deleteOldArticles();
      expect(deleted).toBe(1);
    });

    it("keeps old articles with episode_id", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle()]);
      const episode = episodesRepo.createEpisode({ title: "Ep" });
      const all = articlesRepo.getArticles({ sourceId: source.id });
      episodesRepo.addArticleToEpisode(all.articles[0].id, episode.id);
      const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
      const db = getDb();
      db.run("UPDATE articles SET published_at = ? WHERE id = ?", [threeWeeksAgo, all.articles[0].id]);
      const deleted = articlesRepo.deleteOldArticles();
      expect(deleted).toBe(0);
    });
  });

  describe("deleteArticle", () => {
    it("deletes existing article", () => {
      const source = createTestSource();
      articlesRepo.insertArticles(source.id, [makeRawArticle()]);
      const all = articlesRepo.getArticles();
      expect(articlesRepo.deleteArticle(all.articles[0].id)).toBe(true);
      expect(articlesRepo.getArticles().total).toBe(0);
    });

    it("returns false for missing article", () => {
      createTestSource();
      expect(articlesRepo.deleteArticle(99999)).toBe(false);
    });
  });
});
