export type IndexingErrorKind =
  | "QUOTA_OR_RATE_LIMIT"
  | "PERMISSION"
  | "INVALID"
  | "UNKNOWN";

export interface ClassifiedIndexingError {
  kind: IndexingErrorKind;
  retryable: boolean;
  userMessage: string;
}

/** Map Google Indexing API / Gaxios failures to actionable enterprise messaging. */
export function classifyIndexingApiError(
  rawMessage: string,
  httpStatus?: number
): ClassifiedIndexingError {
  const m = rawMessage.toLowerCase();

  if (
    httpStatus === 429 ||
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("resource exhausted") ||
    m.includes("too many requests")
  ) {
    return {
      kind: "QUOTA_OR_RATE_LIMIT",
      retryable: true,
      userMessage:
        "Google rate limit or daily quota reached. We will retry with backoff or another platform key. If this persists, add more service accounts to the pool or wait for UTC reset.",
    };
  }

  if (
    m.includes("permission") ||
    m.includes("forbidden") ||
    m.includes("not authorized") ||
    httpStatus === 403
  ) {
    return {
      kind: "PERMISSION",
      retryable: false,
      userMessage:
        "Permission denied — add this service account email as Owner in Google Search Console for the URL’s site (URL Inspection property), enable Indexing API on the GCP project, and verify the OAuth consent if applicable.",
    };
  }

  if (m.includes("invalid") || m.includes("malformed") || httpStatus === 400) {
    return {
      kind: "INVALID",
      retryable: false,
      userMessage: rawMessage || "Invalid request to Google Indexing API.",
    };
  }

  return {
    kind: "UNKNOWN",
    retryable: httpStatus === 503 || httpStatus === 502 || m.includes("timeout"),
    userMessage: rawMessage || "Indexing API error.",
  };
}

function readGaxios(err: unknown): { message: string; httpStatus?: number } {
  if (!err || typeof err !== "object") {
    return { message: err instanceof Error ? err.message : "Indexing API request failed." };
  }
  const e = err as {
    message?: string;
    code?: number | string;
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  const httpStatus = e.response?.status ?? (typeof e.code === "number" ? e.code : undefined);
  const apiMsg = e.response?.data?.error?.message;
  const message = apiMsg ?? e.message ?? "Indexing API request failed.";
  return { message, httpStatus };
}

export function classifyUnknownIndexingError(err: unknown): ClassifiedIndexingError {
  const { message, httpStatus } = readGaxios(err);
  return classifyIndexingApiError(message, httpStatus);
}
