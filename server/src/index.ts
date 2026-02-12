import fs from "fs";
import path from "path";

// Prevent unhandled errors from silently crashing the server
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

// Load .env from project root synchronously before anything uses env vars
const envPath = path.resolve(import.meta.dir, "../../.env");
console.log("Looking for .env at:", envPath, "exists:", fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getDb } from "./db/database";
import { syncSourcesFromConfig } from "./db/sync-sources";
import { deleteOldArticles } from "./db/repositories/articles";
import { registerAllFetchers } from "./fetchers";
import { sourcesRouter } from "./routes/sources";
import { articlesRouter } from "./routes/articles";
import { criteriaRouter } from "./routes/criteria";
import { fetchRouter } from "./routes/fetch";

console.log("ANTHROPIC_API_KEY loaded:", !!process.env.ANTHROPIC_API_KEY);

const app = new Hono();

app.use("*", logger());
app.use("/api/*", cors());

// Global error handler — always return JSON, never crash
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: err.message || "Internal server error" }, 500);
});

// Initialize database, sync config sources, and register fetchers
getDb();
syncSourcesFromConfig();
registerAllFetchers();
const purged = deleteOldArticles();
if (purged > 0) console.log(`Purged ${purged} articles older than 2 weeks`);

// API routes
app.route("/api/sources", sourcesRouter);
app.route("/api/articles", articlesRouter);
app.route("/api/criteria", criteriaRouter);
app.route("/api/fetch", fetchRouter);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

const port = Number(process.env.PORT) || 3001;
console.log(`Server running on http://localhost:${port}`);

// Wrap fetch handler to catch any errors Hono misses
export default {
  port,
  idleTimeout: 120, // seconds — fetch-all can take a while
  async fetch(req: Request, server: any) {
    try {
      return await app.fetch(req, server);
    } catch (err: any) {
      console.error("Fatal request error:", err);
      return new Response(
        JSON.stringify({ error: err.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
