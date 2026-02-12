import type { Article, Criteria } from "@shared/types";

export function buildFilterPrompt(
  articles: Article[],
  criteria: Criteria[]
): string {
  const criteriaText = criteria
    .map((c) => `### ${c.name}\n${c.description}`)
    .join("\n\n");

  const articleList = articles
    .map(
      (a) =>
        `- ID: ${a.id} | Title: ${a.title}${a.summary ? ` | Summary: ${a.summary.slice(0, 300)}` : ""}${a.url ? ` | URL: ${a.url}` : ""}`
    )
    .join("\n");

  return `You are a news article relevance filter. Evaluate each article against the criteria below and return a JSON array.

## Criteria
${criteriaText}

## Articles
${articleList}

## Instructions
For each article, evaluate its relevance to the criteria above. Return a JSON array with one object per article:
- "id": the article ID (number)
- "score": relevance score from 0.0 to 1.0 (0 = not relevant, 1 = highly relevant)
- "relevant": boolean, true if score >= 0.5
- "reason": brief explanation (1-2 sentences) of why the article is or isn't relevant

Return ONLY the JSON array, no other text. Example:
[{"id": 1, "score": 0.8, "relevant": true, "reason": "Article covers React 19 release with new features."}]`;
}
