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
import { serveStatic } from "hono/bun";
import { getDb } from "./db/database";
import { syncSourcesFromConfig } from "./db/sync-sources";
import { deleteOldArticles } from "./db/repositories/articles";
import { registerAllFetchers } from "./fetchers";
import { sourcesRouter } from "./routes/sources";
import { articlesRouter } from "./routes/articles";
import { criteriaRouter } from "./routes/criteria";
import { fetchRouter } from "./routes/fetch";
import { episodesRouter } from "./routes/episodes";
import { settingsRouter } from "./routes/settings";
import { liveblocksRouter } from "./routes/liveblocks";
import { auth } from "./auth";

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

// Auth handler — must come before the session middleware
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Session middleware — protect all /api/* except auth and health
app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith("/api/auth") || path === "/api/health") {
    return next();
  }
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

// API routes
app.route("/api/sources", sourcesRouter);
app.route("/api/articles", articlesRouter);
app.route("/api/criteria", criteriaRouter);
app.route("/api/fetch", fetchRouter);
app.route("/api/episodes", episodesRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/liveblocks", liveblocksRouter);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Serve client static files in production
const clientDist = path.resolve(import.meta.dir, "../../client/dist");
app.use("/*", serveStatic({ root: clientDist }));

// SPA fallback — serve index.html for any non-API route not matched by static files
app.get("*", async (c) => {
  const html = fs.readFileSync(path.join(clientDist, "index.html"), "utf-8");
  return c.html(html);
});

const port = Number(process.env.PORT) || 3150;
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
