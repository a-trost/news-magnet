import type { RawArticle, Source, Criteria } from "@shared/types";

let idCounter = 1;
const randomSuffix = () => Math.random().toString(36).slice(2, 8);

export function makeSource(overrides: Partial<Source> = {}): Source {
  const id = overrides.id ?? idCounter++;
  return {
    id,
    name: `Source ${id}`,
    type: "rss",
    config: { feedUrl: `https://example.com/feed/${id}` },
    enabled: true,
    config_key: null,
    last_fetched_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeRawArticle(overrides: Partial<RawArticle> = {}): RawArticle {
  const id = idCounter++;
  const suffix = randomSuffix();
  return {
    external_id: `ext-${id}-${suffix}`,
    title: `Article ${id}`,
    url: `https://example.com/article/${id}-${suffix}`,
    summary: `Summary for article ${id}`,
    author: "Test Author",
    published_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeCriteria(overrides: Partial<Criteria> = {}): Criteria {
  const id = overrides.id ?? idCounter++;
  return {
    id,
    name: `Criteria ${id}`,
    description: `Description for criteria ${id}`,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function resetFixtureCounter() {
  idCounter = 1;
}
