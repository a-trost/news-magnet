import { callClaude } from "./client";
import { marked } from "marked";
import type { Article } from "@shared/types";

const JINA_READER_BASE = "https://r.jina.ai/";

/**
 * Fetch full article content via Jina Reader API.
 * Returns clean markdown text, or null on failure.
 */
async function fetchFullContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(`${JINA_READER_BASE}${url}`, {
      headers: {
        Accept: "text/markdown",
        "X-Return-Format": "markdown",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    // Detect block/challenge pages that Jina returned as content
    if (isBlockPage(text)) return null;
    return text.trim();
  } catch {
    return null;
  }
}

const BLOCK_PATTERNS = [
  /cloudflare/i,
  /just a moment/i,
  /checking your browser/i,
  /access denied/i,
  /enable javascript/i,
  /captcha/i,
  /ray id/i,
  /403 forbidden/i,
  /please verify you are a human/i,
  /blocked/i,
  /security check/i,
];

function isBlockPage(text: string): boolean {
  // Check first 1000 chars — block pages are short and front-loaded with signals
  const sample = text.slice(0, 1000);
  const matches = BLOCK_PATTERNS.filter((p) => p.test(sample));
  return matches.length >= 2;
}

export interface ProcessedShowNotes {
  notes_summary: string;
  notes_why: string;
  notes_comedy: string;
  notes_talking: string;
}

const SECTION_KEYS: { heading: string; key: keyof ProcessedShowNotes }[] = [
  { heading: "Summary", key: "notes_summary" },
  { heading: "Why It Matters", key: "notes_why" },
  { heading: "Comedy Angles", key: "notes_comedy" },
  { heading: "Talking Points", key: "notes_talking" },
];

/**
 * Split raw LLM markdown on `## ` headings into 4 sections.
 * Returns an object keyed by section, each value is the raw markdown for that section.
 */
function splitMarkdownSections(markdown: string): Record<keyof ProcessedShowNotes, string> {
  const result: Record<string, string> = {
    notes_summary: "",
    notes_why: "",
    notes_comedy: "",
    notes_talking: "",
  };

  // Split on ## headings, keeping the heading text
  const parts = markdown.split(/^## /m);

  for (const part of parts) {
    if (!part.trim()) continue;
    const firstNewline = part.indexOf("\n");
    const heading = (firstNewline === -1 ? part : part.slice(0, firstNewline)).trim();
    const body = firstNewline === -1 ? "" : part.slice(firstNewline + 1).trim();

    for (const { heading: expected, key } of SECTION_KEYS) {
      if (heading.toLowerCase() === expected.toLowerCase()) {
        result[key] = body;
        break;
      }
    }
  }

  return result as Record<keyof ProcessedShowNotes, string>;
}

function buildShowPrepPrompt(article: Article, content: string): string {

  const today = new Date().toISOString().split("T")[0];

  return `You are a show prep researcher for an edutainment web development show (think John Oliver meets a tech podcast). Analyze this article and produce show notes.

Today's date is ${today}.

ARTICLE:
Title: ${article.title}
URL: ${article.url}
${article.summary ? `Summary: ${article.summary}` : ""}
${article.relevance_reason ? `Why it was flagged: ${article.relevance_reason}` : ""}

Content (may be truncated):
${content}

Write show notes in markdown with these sections:

## Summary
2-3 sentences explaining what happened / what this is about. Be specific and factual.

## Why It Matters
Why should a web developer audience care? What's the bigger picture? 1-2 short paragraphs.

## Comedy Angles
3-4 bullet points with comedic observations, analogies, or bits the host could riff on. Think witty, not cringey — the audience is technical and smart.

## Talking Points
4-6 bullet points the host can use as a guide when discussing on camera. Include any key stats, quotes, or context worth mentioning.

IMPORTANT: Work with whatever information is available. If the article content is limited, use the title, summary, and URL to infer what the story is about and write useful notes. Never comment on whether the article was accessible or not — just produce the best notes you can from what you have. Do not question the article's legitimacy.

Keep it concise and punchy. No fluff. Write like you're briefing a busy host 30 minutes before taping.`;
}

const DEFAULT_VOICE_PROMPT = `You're a witty, conversational tech host — think someone who genuinely loves web dev but doesn't take themselves too seriously. You explain things clearly for a broad developer audience, use casual language, and drop in humor naturally without forcing it. Your tone is confident but approachable, like you're chatting with a smart friend over coffee.`;

function buildDraftSegmentPrompt(article: Article, voicePrompt: string, context?: string): string {
  const voice = voicePrompt.trim() || DEFAULT_VOICE_PROMPT;

  const contextBlock = context?.trim()
    ? `\nHOST DIRECTION:\nThe host wants this angle/take on the story: ${context.trim()}\nIncorporate this direction into the draft — it should shape the tone, framing, and emphasis.\n`
    : "";

  return `You are a show segment writer. Using the research notes below, write a first draft of a script segment the host will read on camera.

VOICE / STYLE:
${voice}
${contextBlock}
RHYTHM: Follow this pattern throughout the segment:
Fact. Fact. Joke. Fact. Fact. Joke. Fact. Joke.
The jokes should flow naturally from the facts — observational humor, analogies, or quick asides, not forced punchlines.

RULES:
- Write in first person, conversational, flowing prose
- NO headers, bullets, or lists — just continuous paragraphs the host can read aloud
- 200-400 words
- Open with a hook that grabs attention
- Close with a takeaway or call-to-action for the audience
- Do NOT reference the show notes or source material — write as if you already know this stuff

ARTICLE: ${article.title}
URL: ${article.url}

SHOW NOTES:

## Summary
${article.notes_summary || "(none)"}

## Why It Matters
${article.notes_why || "(none)"}

## Comedy Angles
${article.notes_comedy || "(none)"}

## Talking Points
${article.notes_talking || "(none)"}

Write the draft segment now.`;
}

export async function generateDraftSegment(article: Article, voicePrompt: string, context?: string): Promise<string> {
  const prompt = buildDraftSegmentPrompt(article, voicePrompt, context);
  const markdown = await callClaude(prompt);
  return await marked(markdown);
}

export async function processArticleForShow(article: Article): Promise<ProcessedShowNotes> {
  // Use existing raw_content if substantial, otherwise fetch via Jina Reader
  let content = article.raw_content?.trim() || "";
  if (content.length < 500) {
    const fetched = await fetchFullContent(article.url);
    if (fetched) content = fetched;
  }
  content = content.slice(0, 8000) || "(no content available)";

  const prompt = buildShowPrepPrompt(article, content);
  const markdown = await callClaude(prompt);
  const sections = splitMarkdownSections(markdown);

  // Convert each section's markdown to HTML independently
  return {
    notes_summary: await marked(sections.notes_summary),
    notes_why: await marked(sections.notes_why),
    notes_comedy: await marked(sections.notes_comedy),
    notes_talking: await marked(sections.notes_talking),
  };
}
