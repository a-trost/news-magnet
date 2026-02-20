import { Hono } from "hono";
import * as episodesRepo from "../db/repositories/episodes";

export const episodesRouter = new Hono();

episodesRouter.get("/", (c) => {
  const episodes = episodesRepo.getAllEpisodes();
  return c.json({ data: episodes });
});

episodesRouter.get("/next-number", (c) => {
  const nextNumber = episodesRepo.getNextEpisodeNumber();
  return c.json({ data: { nextNumber } });
});

episodesRouter.get("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const episode = episodesRepo.getEpisodeById(id);
  if (!episode) return c.json({ error: "Episode not found" }, 404);
  return c.json({ data: episode });
});

episodesRouter.post("/", async (c) => {
  const input = await c.req.json();
  const episode = episodesRepo.createEpisode(input);
  return c.json({ data: episode }, 201);
});

episodesRouter.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const input = await c.req.json();
  const episode = episodesRepo.updateEpisode(id, input);
  if (!episode) return c.json({ error: "Episode not found" }, 404);
  return c.json({ data: episode });
});

episodesRouter.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const deleted = episodesRepo.deleteEpisode(id);
  if (!deleted) return c.json({ error: "Episode not found" }, 404);
  return c.json({ data: { success: true } });
});

episodesRouter.post("/:id/articles/:articleId", (c) => {
  const episodeId = Number(c.req.param("id"));
  const articleId = Number(c.req.param("articleId"));
  const episode = episodesRepo.getEpisodeById(episodeId);
  if (!episode) return c.json({ error: "Episode not found" }, 404);
  const added = episodesRepo.addArticleToEpisode(articleId, episodeId);
  if (!added) return c.json({ error: "Article not found" }, 404);
  return c.json({ data: { success: true } });
});

episodesRouter.delete("/:id/articles/:articleId", (c) => {
  const articleId = Number(c.req.param("articleId"));
  const removed = episodesRepo.removeArticleFromEpisode(articleId);
  if (!removed) return c.json({ error: "Article not found" }, 404);
  return c.json({ data: { success: true } });
});
