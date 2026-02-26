// Source types
export type SourceType = "rss" | "hackernews" | "webpage";

export interface RssConfig {
  feedUrl: string;
}

export interface HackerNewsConfig {
  feedType: "top" | "new" | "best";
  maxItems: number;
}

export interface WebpageConfig {
  pageUrl: string;
}

export type SourceConfig = RssConfig | HackerNewsConfig | WebpageConfig;

export interface Source {
  id: number;
  name: string;
  type: SourceType;
  config: SourceConfig;
  enabled: boolean;
  config_key: string | null;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSourceInput {
  name: string;
  type: SourceType;
  config: SourceConfig;
  enabled?: boolean;
}

export interface UpdateSourceInput {
  name?: string;
  config?: SourceConfig;
  enabled?: boolean;
}

// Episode types
export interface Episode {
  id: number;
  title: string;
  episode_number: number | null;
  air_date: string | null;
  is_archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEpisodeInput {
  title?: string;
  episode_number?: number;
  air_date?: string;
}

export interface UpdateEpisodeInput {
  title?: string;
  episode_number?: number;
  air_date?: string;
  is_archived?: boolean;
  notes?: string;
}

// Article types
export interface Article {
  id: number;
  source_id: number;
  external_id: string;
  title: string;
  url: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
  raw_content: string | null;
  relevance_score: number | null;
  relevance_reason: string | null;
  is_relevant: boolean | null;
  filtered_at: string | null;
  is_saved: boolean;
  saved_at: string | null;
  show_notes: string | null;
  notes_summary: string | null;
  notes_why: string | null;
  notes_comedy: string | null;
  notes_skit: string | null;
  notes_talking: string | null;
  notes_draft: string | null;
  script: string | null;
  segment_title: string | null;
  processed_at: string | null;
  display_order: number | null;
  episode_id: number | null;
  created_at: string;
}

export interface RawArticle {
  external_id: string;
  title: string;
  url: string;
  summary?: string;
  author?: string;
  published_at?: string;
  raw_content?: string;
}

export interface ArticleFilters {
  sourceId?: number;
  isRelevant?: boolean;
  isSaved?: boolean;
  minScore?: number;
  search?: string;
  sort?: "newest" | "oldest" | "score_desc" | "score_asc" | "display_order";
  page?: number;
  limit?: number;
  episodeId?: number;
  unassigned?: boolean;
}

export interface PaginatedArticles {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Criteria types
export interface Criteria {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCriteriaInput {
  name: string;
  description: string;
  is_active?: boolean;
}

export interface UpdateCriteriaInput {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// Fetch log types
export interface FetchLog {
  id: number;
  source_id: number;
  status: "success" | "error";
  articles_found: number;
  error_message: string | null;
  started_at: string;
  completed_at: string;
}

// LLM filter types
export interface FilterResult {
  id: number;
  score: number;
  relevant: boolean;
  reason: string;
}

// App settings types
export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}
