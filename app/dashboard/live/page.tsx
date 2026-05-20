"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import {
  UrlStatusRow,
  type UrlResponseMeta,
} from "@/components/dashboard/url-status-details";
import { cn } from "@/lib/utils";

interface LiveUrl {
  id: string;
  url: string;
  batchId: string;
  batchStatus?: string;
  batchMode?: string;
  routeUsed: string;
  status: string;
  errorMessage?: string;
  responseMeta?: UrlResponseMeta;
  updatedAt: string;
}

interface LiveStatusPayload {
  inProgressCount: number;
  processingBatchCount: number;
  shouldPollFast: boolean;
  statusBreakdown: Record<string, number>;
  urls: LiveUrl[];
}

type Filter = "all" | "in_progress" | "done" | "failed";

const IN_PROGRESS = new Set(["QUEUED", "PROCESSING", "SUBMITTED", "CRAWLED"]);

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Indexed" },
  { id: "failed", label: "Failed" },
];

export default function LiveStatusPage() {
  const [data, setData] = useState<LiveStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<LiveStatusPayload>("/api/live-status");
      setData(d);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load live status.");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const ms = data.shouldPollFast ? 2000 : data.urls.length > 0 ? 15000 : 0;
    if (!ms) return;
    const interval = setInterval(load, ms);
    return () => clearInterval(interval);
  }, [data?.shouldPollFast, data?.urls.length, load]);

  const filteredUrls = useMemo(() => {
    if (!data) return [];
    switch (filter) {
      case "in_progress":
        return data.urls.filter((u) => IN_PROGRESS.has(u.status));
      case "done":
        return data.urls.filter((u) => u.status === "INDEXED");
      case "failed":
        return data.urls.filter((u) => u.status === "FAILED");
      default:
        return data.urls;
    }
  }, [data, filter]);

  if (loading) return <p className="text-zinc-500">Loading live status…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Activity className="h-7 w-7 text-violet-400" />
            Live status
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Crawl and index progress across all active and recent submissions.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm text-zinc-500">
          {data?.shouldPollFast && (
            <span className="flex items-center gap-1.5 text-emerald-400/90">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live · updating every 2s
            </span>
          )}
          {data && !data.shouldPollFast && data.urls.length > 0 && (
            <span>Updating every 15s</span>
          )}
          {lastUpdated && (
            <span>Last refresh: {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {data && (data.inProgressCount > 0 || data.processingBatchCount > 0) && (
        <div className="flex flex-wrap gap-3">
          <Card className="min-w-[140px] flex-1 border-violet-500/20 bg-violet-500/5">
            <CardContent className="pt-4">
              <p className="text-xs text-zinc-500">In progress</p>
              <p className="text-2xl font-semibold text-violet-300">{data.inProgressCount}</p>
            </CardContent>
          </Card>
          {data.processingBatchCount > 0 && (
            <Card className="min-w-[140px] flex-1">
              <CardContent className="pt-4">
                <p className="text-xs text-zinc-500">Active batches</p>
                <p className="text-2xl font-semibold text-blue-300">
                  {data.processingBatchCount}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && Object.keys(data.statusBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All-time URL counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.statusBreakdown).map(([status, count]) => (
                <span
                  key={status}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm"
                >
                  <Badge variant={statusVariant(status)}>{status}</Badge>
                  <span className="ml-2 text-zinc-400">{count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>URLs</CardTitle>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.id
                    ? "bg-violet-600/25 text-violet-300"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filteredUrls.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-zinc-500">
                {data?.urls.length
                  ? "No URLs match this filter."
                  : "Nothing to monitor yet."}
              </p>
              {!data?.urls.length && (
                <Link
                  href="/dashboard/submit"
                  className="mt-3 inline-block text-sm text-violet-400 hover:underline"
                >
                  Submit URLs to index →
                </Link>
              )}
            </div>
          ) : (
            <ul className="max-h-[65vh] space-y-2 overflow-y-auto">
              {filteredUrls.map((u) => (
                <UrlStatusRow
                  key={u.id}
                  url={u.url}
                  routeUsed={u.routeUsed}
                  status={u.status}
                  errorMessage={u.errorMessage}
                  responseMeta={u.responseMeta}
                  trailing={
                    <Link
                      href={`/dashboard/batches/${u.batchId}`}
                      className="text-xs text-violet-400 hover:underline"
                      title="Open batch"
                    >
                      Batch
                    </Link>
                  }
                />
              ))}
            </ul>
          )}
          {data && data.urls.length >= 200 && (
            <p className="mt-3 text-xs text-zinc-500">
              Showing the 200 most recently updated URLs. Open a batch for the full list.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-zinc-600">
        In-progress URLs refresh every 2s. Recently finished (last 24h) refresh every 15s.
        <code className="mx-1 text-zinc-500">CRAWLED</code> means crawl-trap published;
        <code className="mx-1 text-zinc-500">INDEXED</code> means Google metadata or GSC PASS.
        Keep <code className="text-zinc-500">npm run worker</code> running.
      </p>
    </div>
  );
}
