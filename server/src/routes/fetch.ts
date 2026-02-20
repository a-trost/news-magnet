import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getFetcher } from "../fetchers";
import { getDb } from "../db/database";
import * as sourcesRepo from "../db/repositories/sources";
import * as articlesRepo from "../db/repositories/articles";
import * as fetchLogRepo from "../db/repositories/fetch-log";
import { filterArticles } from "../llm/filter";

export const fetchRouter = new Hono();

// Fetch all enabled sources (SSE stream)
fetchRouter.post("/", async (c) => {
  const sources = sourcesRepo.getEnabledSources();
  if (sources.length === 0) {
    return c.json({ data: { message: "No enabled sources", results: [] } });
  }

  return streamSSE(c, async (stream) => {
    // Purge articles older than the cutoff — keep everything else
    const purged = articlesRepo.deleteOldArticles();
    if (purged > 0) console.log(`[fetch-all] Purged ${purged} articles older than 2 weeks`);

    let totalNew = 0;
    let failedCount = 0;

    for (const source of sources) {
      await stream.writeSSE({
        event: "source-start",
        data: JSON.stringify({ sourceId: source.id, sourceName: source.name }),
      });

      console.log(`[fetch-all] Fetching ${source.name} (${source.id})...`);
      const result = await fetchSource(source.id);

      if (result.error) {
        console.error(`[fetch-all] FAILED: ${source.name} — ${result.error}`);
        failedCount++;
        await stream.writeSSE({
          event: "source-done",
          data: JSON.stringify({
            sourceId: source.id,
            sourceName: source.name,
            status: "error",
            error: result.error,
            articlesFound: 0,
            newArticles: 0,
          }),
        });
      } else {
        console.log(`[fetch-all] OK: ${source.name} — ${result.articlesFound} found, ${result.newArticles} new`);
        totalNew += result.newArticles;
        await stream.writeSSE({
          event: "source-done",
          data: JSON.stringify({
            sourceId: source.id,
            sourceName: source.name,
            status: "success",
            articlesFound: result.articlesFound,
            newArticles: result.newArticles,
          }),
        });
      }
    }

    await stream.writeSSE({
      event: "fetch-complete",
      data: JSON.stringify({ total: sources.length, failed: failedCount, newArticles: totalNew }),
    });

    // Automatically rate new articles with AI
    if (totalNew > 0) {
      await stream.writeSSE({
        event: "filter-start",
        data: JSON.stringify({ unfiltered: totalNew }),
      });

      try {
        const result = await filterArticles();
        console.log(`[fetch-all] Auto-filter complete: ${result.filtered} rated in ${result.batches} batches`);
        await stream.writeSSE({
          event: "filter-done",
          data: JSON.stringify(result),
        });
      } catch (err: any) {
        console.error("[fetch-all] Auto-filter failed:", err.message);
        await stream.writeSSE({
          event: "filter-done",
          data: JSON.stringify({ filtered: 0, batches: 0, errors: [err.message] }),
        });
      }
    }
  });
});

// Clear all scores — must be before /:sourceId to avoid route conflict
fetchRouter.post("/clear-scores", (c) => {
  const cleared = articlesRepo.clearAllScores();
  return c.json({ data: { cleared } });
});

// Filter articles with LLM
fetchRouter.post("/filter", async (c) => {
  try {
    console.log("Starting LLM filter...");
    console.log("ANTHROPIC_API_KEY set:", !!process.env.ANTHROPIC_API_KEY);
    const result = await filterArticles();
    console.log("Filter complete:", result);
    return c.json({ data: result });
  } catch (err: any) {
    console.error("Filter error:", err);
    return c.json({ error: `Filter failed: ${err.message}` }, 500);
  }
});

// Get fetch logs
fetchRouter.get("/log", (c) => {
  const logs = fetchLogRepo.getFetchLogs(100);
  return c.json({ data: logs });
});

// Fetch a single source
fetchRouter.post("/:sourceId", async (c) => {
  const sourceId = Number(c.req.param("sourceId"));
  const result = await fetchSource(sourceId);
  if (result.error && result.error.includes("not found")) {
    return c.json({ error: result.error }, 404);
  }
  return c.json({ data: result });
});

async function fetchSource(sourceId: number) {
  const source = sourcesRepo.getSourceById(sourceId);
  if (!source) {
    return { sourceId, error: "Source not found", articlesFound: 0, newArticles: 0 };
  }

  const fetcher = getFetcher(source.type);
  if (!fetcher) {
    return { sourceId, error: `No fetcher for type: ${source.type}`, articlesFound: 0, newArticles: 0 };
  }

  try {
    const rawArticles = await fetcher.fetch(source);
    const newCount = articlesRepo.insertArticles(source.id, rawArticles);
    sourcesRepo.updateLastFetchedAt(source.id);
    fetchLogRepo.createFetchLog(source.id, "success", rawArticles.length);

    return {
      sourceId: source.id,
      sourceName: source.name,
      articlesFound: rawArticles.length,
      newArticles: newCount,
    };
  } catch (err: any) {
    console.error(`Fetch error for source ${source.id} (${source.name}):`, err);
    fetchLogRepo.createFetchLog(source.id, "error", 0, err.message);
    return {
      sourceId: source.id,
      sourceName: source.name,
      error: err.message,
      articlesFound: 0,
      newArticles: 0,
    };
  }
}
