import type { RawArticle, Source, SourceType } from "@shared/types";

export interface Fetcher {
  type: SourceType;
  fetch(source: Source): Promise<RawArticle[]>;
}

const registry = new Map<SourceType, Fetcher>();

export function registerFetcher(fetcher: Fetcher) {
  registry.set(fetcher.type, fetcher);
}

export function getFetcher(type: SourceType): Fetcher | undefined {
  return registry.get(type);
}

export function getAllFetchers(): Fetcher[] {
  return Array.from(registry.values());
}
