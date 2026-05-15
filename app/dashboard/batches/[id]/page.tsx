"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";

interface UrlRow {
  id: string;
  url: string;
  routeUsed: string;
  status: string;
  errorMessage?: string;
  responseMeta?: {
    message?: string;
    googleNotifiedAt?: string;
    googleIndexedAt?: string;
    preflight?: { warnings?: string[]; googleApiEligible?: boolean };
    gscInspection?: { verdict?: string; coverageState?: string };
  };
}

interface BatchInfo {
  id: string;
  totalUrls: number;
  apiCount: number;
  crawlTrapCount: number;
  indexNowCount: number;
  status: string;
  completedCount: number;
  failedCount: number;
}

export default function BatchDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [urls, setUrls] = useState<UrlRow[]>([]);
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBatch = useCallback(async () => {
    if (!id) return;
    try {
      const d = await api.get<{
        batch: BatchInfo;
        urls: UrlRow[];
        statusBreakdown: Record<string, number>;
      }>(`/api/batches/${id}`);
      setBatch(d.batch);
      setUrls(d.urls);
      setStatusBreakdown(d.statusBreakdown);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load batch.");
    }
  }, [id]);

  useEffect(() => {
    loadBatch().finally(() => setLoading(false));
  }, [loadBatch]);

  useEffect(() => {
    if (!batch || batch.status !== "PROCESSING") return;
    const interval = setInterval(loadBatch, 2000);
    return () => clearInterval(interval);
  }, [batch?.status, loadBatch]);

  if (loading) return <p className="text-zinc-500">Loading batch…</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!batch) return <p className="text-red-400">Batch not found.</p>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/batches" className="text-sm text-violet-400 hover:underline">
        ← Back to batches
      </Link>
      <h1 className="text-2xl font-bold text-white">
        Batch · {batch.totalUrls} URLs
      </h1>
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
        <span>
          Status:{" "}
          <Badge variant={statusVariant(batch.status)}>{batch.status}</Badge>
        </span>
        <span>API: {batch.apiCount}</span>
        <span>Crawl trap: {batch.crawlTrapCount}</span>
        <span>IndexNow: {batch.indexNowCount}</span>
        <span>Done: {batch.completedCount}</span>
        <span>Failed: {batch.failedCount}</span>
      </div>

      {Object.keys(statusBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusBreakdown).map(([status, count]) => (
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
        <CardHeader>
          <CardTitle>URLs ({urls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {urls.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm"
              >
                <span className="truncate font-mono text-zinc-300">{u.url}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{u.routeUsed}</span>
                  <Badge variant={statusVariant(u.status)}>{u.status}</Badge>
                </div>
                {u.status === "SUBMITTED" && u.responseMeta?.message && (
                  <p className="w-full text-xs text-emerald-400/80">{u.responseMeta.message}</p>
                )}
                {u.status === "INDEXED" && u.responseMeta?.googleIndexedAt && (
                  <p className="w-full text-xs text-emerald-400">
                    Google confirmed · {new Date(u.responseMeta.googleIndexedAt).toLocaleString()}
                  </p>
                )}
                {u.responseMeta?.gscInspection && (
                  <p className="w-full text-xs text-zinc-500">
                    GSC:{" "}
                    {typeof u.responseMeta.gscInspection === "object"
                      ? (u.responseMeta.gscInspection as { verdict?: string }).verdict ??
                        JSON.stringify(u.responseMeta.gscInspection)
                      : String(u.responseMeta.gscInspection)}
                  </p>
                )}
                {u.responseMeta?.preflight?.warnings?.map((w) => (
                  <p key={w} className="w-full text-xs text-amber-500/80">
                    {w}
                  </p>
                ))}
                {u.errorMessage && (
                  <p className="w-full text-xs text-red-400">{u.errorMessage}</p>
                )}
              </li>
            ))}
          </ul>
          {batch.totalUrls > urls.length && (
            <p className="mt-3 text-xs text-zinc-500">
              Showing first {urls.length} of {batch.totalUrls} URLs.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
