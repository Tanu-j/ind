export const ROUTE_TYPES = ["API_INDEXING", "CRAWL_TRAP", "INDEX_NOW"] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export const INDEXING_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "SUBMITTED",
  "CRAWLED",
  "INDEXED",
  "FAILED",
] as const;
export type IndexingStatus = (typeof INDEXING_STATUSES)[number];

export const BATCH_STATUSES = ["PROCESSING", "COMPLETED", "FAILED", "PARTIAL"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const JOB_TYPES = [
  "API_INDEXING",
  "CRAWL_TRAP",
  "INDEX_NOW",
  "GOOGLE_VERIFY",
  "DISCOVERY_PING",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const INDEXING_MODES = ["google_instant", "hybrid", "maximum"] as const;
export type IndexingMode = (typeof INDEXING_MODES)[number];

export const DEFAULT_INDEXING_MODE: IndexingMode = "google_instant";

export const JOB_STATUSES = ["PENDING", "ACTIVE", "COMPLETED", "FAILED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const DEFAULT_CREDITS = 100;
export const DEFAULT_API_SPLIT = 0.3;
export const MAX_URLS_PER_BATCH = 5000;
export const MAX_URL_LENGTH = 2048;
