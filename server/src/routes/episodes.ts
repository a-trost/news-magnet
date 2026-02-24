import { Hono } from "hono";
import TurndownService from "turndown";
import * as episodesRepo from "../db/repositories/episodes";
import * as articlesRepo from "../db/repositories/articles";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

export const episodesRouter = new Hono();

episodesRouter.get("/", (c) => {
  const episodes = episodesRepo.getAllEpisodes();
  return c.json({ data: episodes });
});

episodesRouter.get("/next-number", (c) => {
  const nextNumber = episodesRepo.getNextEpisodeNumber();
  return c.json({ data: { nextNumber } });
});

episodesRouter.get("/:id/export", (c) => {
  const id = Number(c.req.param("id"));
  const episode = episodesRepo.getEpisodeById(id);
  if (!episode) return c.json({ error: "Episode not found" }, 404);

  const { articles } = articlesRepo.getArticles({ episodeId: id, limit: 200, sort: "display_order" });

  const lines: string[] = [];

  // Title
  const titleParts = [];
  if (episode.title) titleParts.push(episode.title);
  if (episode.episode_number) titleParts.push(`Episode ${episode.episode_number}`);
  lines.push(`# ${titleParts.join(" - ") || "Untitled Episode"}`);
  lines.push("");

  // Episode notes
  if (episode.notes) {
    lines.push(turndown.turndown(episode.notes));
    lines.push("");
  }

  // Divider before articles
  if (articles.length > 0) {
    lines.push("---");
    lines.push("");
  }

  // Each article's script
  for (const article of articles) {
    lines.push(`## ${article.segment_title || article.title}`);
    lines.push("");
    if (article.script) {
      lines.push(turndown.turndown(article.script));
    } else {
      lines.push("*No script yet.*");
    }
    lines.push("");
  }

  const markdown = lines.join("\n");
  const filename = `episode-${episode.episode_number ?? episode.id}.md`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
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
