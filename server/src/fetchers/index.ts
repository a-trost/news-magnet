import { registerFetcher } from "./base";
import { rssFetcher } from "./rss";
import { hackerNewsFetcher } from "./hackernews";
import { webpageFetcher } from "./webpage";

export function registerAllFetchers() {
  registerFetcher(rssFetcher);
  registerFetcher(hackerNewsFetcher);
  registerFetcher(webpageFetcher);
}

export { getFetcher, getAllFetchers } from "./base";
