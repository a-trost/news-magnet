import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb } from "../../test/db-helper";
import { makeRawArticle, resetFixtureCounter } from "../../test/fixtures";
import * as episodesRepo from "./episodes";
import * as sourcesRepo from "./sources";
import * as articlesRepo from "./articles";

describe("episodes repository", () => {
  beforeEach(() => {
    setupTestDb();
    resetFixtureCounter();
  });

  it("creates an episode", () => {
    const episode = episodesRepo.createEpisode({ title: "Episode 1", episode_number: 1 });
    expect(episode.id).toBeDefined();
    expect(episode.title).toBe("Episode 1");
    expect(episode.episode_number).toBe(1);
    expect(episode.is_archived).toBe(false);
  });

  it("gets episode by id", () => {
    const created = episodesRepo.createEpisode({ title: "Find Me" });
    const found = episodesRepo.getEpisodeById(created.id);
    expect(found).not.toBeNull();
    expect(found!.title).toBe("Find Me");
  });

  it("gets all episodes", () => {
    episodesRepo.createEpisode({ title: "Ep 1" });
    episodesRepo.createEpisode({ title: "Ep 2" });
    const all = episodesRepo.getAllEpisodes();
    expect(all.length).toBe(2);
  });

  it("getActiveEpisodes excludes archived", () => {
    episodesRepo.createEpisode({ title: "Active" });
    const ep2 = episodesRepo.createEpisode({ title: "Archived" });
    episodesRepo.updateEpisode(ep2.id, { is_archived: true });
    const active = episodesRepo.getActiveEpisodes();
    expect(active.length).toBe(1);
    expect(active[0].title).toBe("Active");
  });

  it("updates an episode", () => {
    const ep = episodesRepo.createEpisode({ title: "Original" });
    const updated = episodesRepo.updateEpisode(ep.id, { title: "Updated", notes: "Some notes" });
    expect(updated!.title).toBe("Updated");
    expect(updated!.notes).toBe("Some notes");
  });

  it("deletes an episode", () => {
    const ep = episodesRepo.createEpisode({ title: "Delete Me" });
    expect(episodesRepo.deleteEpisode(ep.id)).toBe(true);
    expect(episodesRepo.getEpisodeById(ep.id)).toBeNull();
  });

  it("adds and removes article from episode", () => {
    const source = sourcesRepo.createSource({ name: "S", type: "rss", config: { feedUrl: "f" } });
    articlesRepo.insertArticles(source.id, [makeRawArticle()]);
    const episode = episodesRepo.createEpisode({ title: "Ep" });
    const articles = articlesRepo.getArticles();
    const articleId = articles.articles[0].id;

    episodesRepo.addArticleToEpisode(articleId, episode.id);
    let article = articlesRepo.getArticleById(articleId)!;
    expect(article.episode_id).toBe(episode.id);

    episodesRepo.removeArticleFromEpisode(articleId);
    article = articlesRepo.getArticleById(articleId)!;
    expect(article.episode_id).toBeNull();
  });

  it("getNextEpisodeNumber returns MAX+1", () => {
    episodesRepo.createEpisode({ title: "Ep", episode_number: 5 });
    episodesRepo.createEpisode({ title: "Ep", episode_number: 10 });
    expect(episodesRepo.getNextEpisodeNumber()).toBe(11);
  });

  it("getNextEpisodeNumber returns 1 for empty table", () => {
    expect(episodesRepo.getNextEpisodeNumber()).toBe(1);
  });
});
