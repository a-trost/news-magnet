# News Magnet

A self-hosted news aggregator that pulls articles from RSS feeds, Hacker News, and web pages, then uses Claude AI to score and filter them based on customizable relevance criteria. Built for curating content for a web development YouTube news show, but the criteria are fully configurable.

## Features

- **Multi-source fetching** - Pull articles from RSS/Atom feeds, Hacker News (top/new/best), and arbitrary web pages
- **AI-powered relevance scoring** - Claude rates each article 0-1 with a written explanation based on your criteria
- **Customizable criteria** - Define what "relevant" means to you; swap criteria without changing code
- **Save articles** - Bookmark articles to a persistent saved list that survives fetch refreshes
- **Declarative source config** - Define sources in `sources.json`; they sync to the database on startup
- **Real-time fetch progress** - SSE streaming shows per-source progress as articles are fetched
- **Search, filter, and sort** - Filter by source, relevance, minimum score; search titles and summaries; sort by date or score
- **Fetch logging** - Every fetch attempt is logged with success/error status and article counts
- **Auto-cleanup** - Articles older than 2 weeks are purged on startup

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Server | [Hono](https://hono.dev) + bun:sqlite (WAL mode) |
| Client | [React 19](https://react.dev) + [Vite](https://vite.dev) + [Tailwind CSS v4](https://tailwindcss.com) |
| Routing | [React Router v7](https://reactrouter.com) |
| Data fetching | [TanStack Query v5](https://tanstack.com/query) |
| AI | [Anthropic API](https://docs.anthropic.com) (Claude) |
| RSS parsing | [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) |
| Web scraping | [Cheerio](https://cheerio.js.org) |

## Project Structure

```
find-news-stories/
├── packages/shared/       # Shared TypeScript types
│   └── src/types.ts
├── server/                # Hono API server
│   └── src/
│       ├── index.ts       # App entry point (port 3001)
│       ├── db/
│       │   ├── database.ts    # SQLite singleton, schema init, migrations
│       │   ├── schema.ts      # Table definitions
│       │   ├── sync-sources.ts # Syncs sources.json → DB on startup
│       │   └── repositories/  # Data access layer
│       ├── fetchers/      # Source-type fetchers (RSS, HN, webpage)
│       ├── llm/           # Anthropic API client and filtering logic
│       └── routes/        # API route handlers
├── client/                # React SPA
│   └── src/
│       ├── App.tsx        # Router + navigation
│       ├── api/           # API client + TanStack Query hooks
│       └── pages/         # Articles, Saved, Sources, Criteria, FetchLog
├── sources.json           # Declarative source definitions
├── .env                   # Environment variables (not committed)
└── package.json           # Bun workspace root
```

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- An [Anthropic API key](https://console.anthropic.com) (for AI scoring)

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

Copy the example env file and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-sonnet-4-5-20250929
```

`CLAUDE_MODEL` is optional and defaults to `claude-sonnet-4-5-20250929`.

### 3. Configure sources

Edit `sources.json` to define which sources to fetch. The file is a JSON array where each entry has:

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique identifier (used for DB sync) |
| `name` | string | Display name |
| `type` | `"rss"` \| `"hackernews"` \| `"webpage"` | Fetcher type |
| `config` | object | Type-specific configuration (see below) |
| `enabled` | boolean | Whether to include in "Fetch All" |

**Config by type:**

- **RSS**: `{ "feedUrl": "https://example.com/feed.xml" }`
- **Hacker News**: `{ "feedType": "top" | "new" | "best", "maxItems": 30 }`
- **Webpage**: `{ "pageUrl": "https://example.com/blog" }`

Sources are synced from `sources.json` into the database every time the server starts. You can also add/edit sources through the UI.

### 4. Start development

```bash
bun run dev
```

This starts both the server (port 3001) and client dev server (port 5174) concurrently. The Vite dev server proxies `/api/*` requests to the server.

Open **http://localhost:5174** in your browser.

You can also start them independently:

```bash
bun run dev:server   # Server only
bun run dev:client   # Client only
```

## Usage

### Typical workflow

1. **Fetch articles** - Click "Fetch All" on the Articles page. Progress streams in real-time as each source is fetched.
2. **Rate with AI** - Click "Rate with AI" to send unscored articles to Claude in batches of 20. Each article gets a relevance score (0-1) and explanation.
3. **Review results** - Sort by score, filter by relevance, or search to find the best stories.
4. **Save articles** - Bookmark articles you want to keep. Saved articles persist across fetches.

### Pages

| Page | Description |
|------|-------------|
| **Articles** | Main view. Fetch, filter, score, search, and save articles. |
| **Saved** | View bookmarked articles. |
| **Sources** | Manage news sources. Add, edit, enable/disable, or delete. |
| **Criteria** | Define and manage AI scoring criteria. Only one can be active at a time. |
| **Fetch Log** | View history of fetch attempts with success/error status. |

## API Endpoints

All endpoints are prefixed with `/api`.

### Sources
- `GET /api/sources` - List all sources
- `GET /api/sources/:id` - Get a source
- `POST /api/sources` - Create a source
- `PUT /api/sources/:id` - Update a source
- `DELETE /api/sources/:id` - Delete a source

### Articles
- `GET /api/articles` - List articles (supports query params: `sourceId`, `isRelevant`, `isSaved`, `minScore`, `search`, `sort`, `page`, `limit`)
- `POST /api/articles/:id/save` - Save an article
- `POST /api/articles/:id/unsave` - Unsave an article
- `POST /api/articles/clear-unsaved` - Delete all unsaved articles
- `DELETE /api/articles/:id` - Delete an article

### Fetch
- `POST /api/fetch` - Fetch all enabled sources (SSE stream)
- `POST /api/fetch/:sourceId` - Fetch a single source
- `POST /api/fetch/filter` - Run AI relevance scoring on unscored articles
- `POST /api/fetch/clear-scores` - Clear all relevance scores
- `GET /api/fetch/log` - Get fetch history

### Criteria
- `GET /api/criteria` - List all criteria
- `GET /api/criteria/:id` - Get a criteria
- `POST /api/criteria` - Create criteria
- `PUT /api/criteria/:id` - Update criteria
- `PUT /api/criteria/:id/activate` - Set criteria as active
- `DELETE /api/criteria/:id` - Delete criteria

### Health
- `GET /api/health` - Health check

## Database

SQLite with WAL mode, stored as `news.db` in the project root (gitignored). The schema is auto-created on first run with four tables:

- **sources** - News source definitions
- **articles** - Fetched articles with relevance scores (unique on `source_id` + `external_id`)
- **criteria** - AI scoring criteria definitions
- **fetch_log** - Fetch attempt history

A default criteria ("Web Dev YouTube Show Topics") is seeded on first run if no criteria exist.

## License

Private project.
