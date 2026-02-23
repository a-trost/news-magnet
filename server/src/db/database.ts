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
    migrateShowNotes(db);
    migrateScript(db);
    migrateAuthTables(db);
    migrateUrlIndex(db);
    migrateDisplayOrder(db);
    migrateEpisodes(db);
    migrateEpisodesArchived(db);
    migrateShowNotesSections(db);
    migrateSettings(db);
    migrateNotesDraft(db);
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

function migrateShowNotes(db: Database) {
  const columns = db.query("PRAGMA table_info(articles)").all() as { name: string }[];
  const hasShowNotes = columns.some((c) => c.name === "show_notes");
  if (!hasShowNotes) {
    db.exec("ALTER TABLE articles ADD COLUMN show_notes TEXT");
    db.exec("ALTER TABLE articles ADD COLUMN processed_at TEXT");
  }
}

function migrateScript(db: Database) {
  const columns = db.query("PRAGMA table_info(articles)").all() as { name: string }[];
  const hasScript = columns.some((c) => c.name === "script");
  if (!hasScript) {
    db.exec("ALTER TABLE articles ADD COLUMN script TEXT");
  }
}

function migrateAuthTables(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "session" (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL REFERENCES "user"(id),
      token TEXT NOT NULL UNIQUE,
      expiresAt INTEGER NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "account" (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL REFERENCES "user"(id),
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      accessToken TEXT,
      refreshToken TEXT,
      accessTokenExpiresAt INTEGER,
      refreshTokenExpiresAt INTEGER,
      scope TEXT,
      idToken TEXT,
      password TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "verification" (
      id TEXT PRIMARY KEY NOT NULL,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
}

function migrateDisplayOrder(db: Database) {
  const columns = db.query("PRAGMA table_info(articles)").all() as { name: string }[];
  const hasDisplayOrder = columns.some((c) => c.name === "display_order");
  if (!hasDisplayOrder) {
    db.exec("ALTER TABLE articles ADD COLUMN display_order INTEGER");
  }
}

function migrateEpisodes(db: Database) {
  const columns = db.query("PRAGMA table_info(articles)").all() as { name: string }[];
  const hasEpisodeId = columns.some((c) => c.name === "episode_id");
  if (!hasEpisodeId) {
    db.exec("ALTER TABLE articles ADD COLUMN episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL");
    db.exec("CREATE INDEX IF NOT EXISTS idx_articles_episode_id ON articles(episode_id)");
  }
}

function migrateEpisodesArchived(db: Database) {
  const columns = db.query("PRAGMA table_info(episodes)").all() as { name: string }[];
  const hasIsArchived = columns.some((c) => c.name === "is_archived");
  if (!hasIsArchived) {
    db.exec("ALTER TABLE episodes ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0");
  }
}

function migrateUrlIndex(db: Database) {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url ON articles(url)");
}

function migrateShowNotesSections(db: Database) {
  const columns = db.query("PRAGMA table_info(articles)").all() as { name: string }[];
  const hasSections = columns.some((c) => c.name === "notes_summary");
  if (hasSections) return;

  db.exec("ALTER TABLE articles ADD COLUMN notes_summary TEXT");
  db.exec("ALTER TABLE articles ADD COLUMN notes_why TEXT");
  db.exec("ALTER TABLE articles ADD COLUMN notes_comedy TEXT");
  db.exec("ALTER TABLE articles ADD COLUMN notes_talking TEXT");

  // Migrate existing show_notes HTML by splitting on <h2> tags
  const rows = db.query("SELECT id, show_notes FROM articles WHERE show_notes IS NOT NULL").all() as {
    id: number;
    show_notes: string;
  }[];

  const sectionHeadings = [
    { heading: "summary", key: "notes_summary" },
    { heading: "why it matters", key: "notes_why" },
    { heading: "comedy angles", key: "notes_comedy" },
    { heading: "talking points", key: "notes_talking" },
  ];

  const stmt = db.prepare(
    "UPDATE articles SET notes_summary = ?, notes_why = ?, notes_comedy = ?, notes_talking = ?, show_notes = NULL WHERE id = ?"
  );

  const migrateAll = db.transaction((items: typeof rows) => {
    for (const row of items) {
      const result: Record<string, string> = {
        notes_summary: "",
        notes_why: "",
        notes_comedy: "",
        notes_talking: "",
      };

      // Split HTML on <h2> tags
      const parts = row.show_notes.split(/<h2>/i);
      for (const part of parts) {
        if (!part.trim()) continue;
        const closingIdx = part.indexOf("</h2>");
        if (closingIdx === -1) {
          // No heading — this is content before first h2, treat as summary
          if (part.trim()) result.notes_summary = part.trim();
          continue;
        }
        const heading = part.slice(0, closingIdx).trim().toLowerCase();
        const body = part.slice(closingIdx + 5).trim();
        for (const { heading: expected, key } of sectionHeadings) {
          if (heading === expected) {
            result[key] = body;
            break;
          }
        }
      }

      stmt.run(
        result.notes_summary || null,
        result.notes_why || null,
        result.notes_comedy || null,
        result.notes_talking || null,
        row.id,
      );
    }
  });

  migrateAll(rows);
}

function migrateSettings(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    )
  `);
}

function migrateNotesDraft(db: Database) {
  const columns = db.query("PRAGMA table_info(articles)").all() as { name: string }[];
  const hasNotesDraft = columns.some((c) => c.name === "notes_draft");
  if (!hasNotesDraft) {
    db.exec("ALTER TABLE articles ADD COLUMN notes_draft TEXT");
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
- New AI models or major AI model updates (new Claude, GPT, Gemini models) — developers care about these. BUT only the initial launch/announcement of the model is high relevance. An existing model becoming available on a different platform (e.g. "Gemini now in GitHub Copilot", "Claude now on Azure") is LOW — that's a platform integration, not a new model.
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
- Existing AI models becoming available on new platforms or tools (e.g. "Model X now in Platform Y") — the story is the model launch, not platform integrations
- Corporate partnership announcements without technical substance
- AI safety/policy/ethics papers with no practical developer impact
- Mobile-only or game development news
- Hardware/chip news
- Opinion pieces or social media drama`,
      ]
    );
  }
}
