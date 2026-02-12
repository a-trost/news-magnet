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
  sort?: "newest" | "oldest" | "score_desc" | "score_asc";
  page?: number;
  limit?: number;
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

// API response types
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}
