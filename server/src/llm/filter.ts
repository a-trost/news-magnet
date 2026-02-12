import { getApiKey, callClaude } from "./client";
import { buildFilterPrompt } from "./prompts";
import * as articlesRepo from "../db/repositories/articles";
import * as criteriaRepo from "../db/repositories/criteria";
import type { Article, FilterResult } from "@shared/types";

const BATCH_SIZE = 20;

export async function filterArticles(): Promise<{
  filtered: number;
  batches: number;
  errors: string[];
}> {
  const activeCriteria = criteriaRepo.getActiveCriteria();
  if (activeCriteria.length === 0) {
    throw new Error("No active criteria. Add or activate criteria before filtering.");
  }

  // Verify API key before starting
  getApiKey();

  const unfiltered = articlesRepo.getUnfilteredArticles(200);
  if (unfiltered.length === 0) {
    return { filtered: 0, batches: 0, errors: [] };
  }

  let totalFiltered = 0;
  let totalBatches = 0;
  const errors: string[] = [];

  for (let i = 0; i < unfiltered.length; i += BATCH_SIZE) {
    const batch = unfiltered.slice(i, i + BATCH_SIZE);
    totalBatches++;

    try {
      console.log(`Filtering batch ${totalBatches} (${batch.length} articles)...`);
      const results = await filterBatch(batch, activeCriteria);

      for (const result of results) {
        articlesRepo.updateArticleRelevance(
          result.id,
          result.score,
          result.reason,
          result.relevant
        );
        totalFiltered++;
      }
      console.log(`Batch ${totalBatches} done: ${results.length} scored`);
    } catch (err: any) {
      const msg = `Batch ${totalBatches} failed: ${err.message}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  return { filtered: totalFiltered, batches: totalBatches, errors };
}

async function filterBatch(
  articles: Article[],
  criteria: any[]
): Promise<FilterResult[]> {
  const prompt = buildFilterPrompt(articles, criteria);
  const text = await callClaude(prompt);

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`No JSON array in response: ${text.slice(0, 200)}`);
  }

  let results: FilterResult[];
  try {
    results = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Invalid JSON in response: ${jsonMatch[0].slice(0, 200)}`);
  }

  return results.map((r) => ({
    id: r.id,
    score: Math.max(0, Math.min(1, r.score)),
    relevant: r.relevant ?? r.score >= 0.5,
    reason: r.reason || "No reason provided",
  }));
}
