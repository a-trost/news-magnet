import { Database } from "bun:sqlite";
import path from "path";
import { schema } from "./schema";

// Always store the DB in the project root (two levels up from server/src/db/)
const DB_PATH = path.resolve(import.meta.dir, "../../../news.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH, { create: true });
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(schema);
    migrateConfigKey(db);
    migrateIsSaved(db);
    seedDefaultCriteria(db);
  }
  return db;
}

function migrateConfigKey(db: Database) {
  const columns = db.query("PRAGMA table_info(sources)").all() as { name: string }[];
  const hasConfigKey = columns.some((c) => c.name === "config_key");
  if (!hasConfigKey) {
    db.exec("ALTER TABLE sources ADD COLUMN config_key TEXT");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_config_key ON sources(config_key)");
  }
}

function migrateIsSaved(db: Database) {
  const columns = db.query("PRAGMA table_info(articles)").all() as { name: string }[];
  const hasIsSaved = columns.some((c) => c.name === "is_saved");
  if (!hasIsSaved) {
    db.exec("ALTER TABLE articles ADD COLUMN is_saved INTEGER NOT NULL DEFAULT 0");
    db.exec("ALTER TABLE articles ADD COLUMN saved_at TEXT");
    db.exec("CREATE INDEX IF NOT EXISTS idx_articles_is_saved ON articles(is_saved)");
  }
}

function seedDefaultCriteria(db: Database) {
  const count = db.query("SELECT COUNT(*) as count FROM criteria").get() as { count: number };
  if (count.count === 0) {
    db.run(
      `INSERT INTO criteria (name, description, is_active) VALUES (?, ?, 1)`,
      [
        "Web Dev YouTube Show Topics",
        `You are filtering news for a web development YouTube news show. Stories need to be BIG enough to be worth talking about on camera — interesting to a broad web dev audience, not just niche updates.

HIGH relevance (score 0.7-1.0) — stories worth featuring:
- Major version releases of popular frameworks/tools (React 20, Next.js 15, Bun 2.0, etc.)
- New AI models or major AI model updates (new Claude, GPT, Gemini models) — developers care about these
- New AI developer tools or major updates (Copilot, Claude Code, Cursor, etc.)
- New web platform features landing in browsers (new CSS features, new APIs)
- Major acquisitions, launches, or shutdowns that affect the web dev ecosystem
- Significant security vulnerabilities affecting popular packages
- New tools/frameworks getting major traction or funding
- Industry shifts (e.g. new standards, big company adopting/dropping a technology)

MEDIUM relevance (score 0.4-0.6):
- Interesting technical blog posts from well-known developers or companies
- Notable conference talks or announcements
- New libraries/tools that solve a common pain point in a novel way

LOW relevance (score 0.0-0.3) — not worth covering:
- Minor/patch version releases (v1.3.9, v2.1.4, etc.) — not newsworthy
- Incremental updates or bugfix releases
- Niche tools with small audiences
- Corporate partnership announcements without technical substance
- AI safety/policy/ethics papers with no practical developer impact
- Mobile-only or game development news
- Hardware/chip news
- Opinion pieces or social media drama`,
      ]
    );
  }
}
