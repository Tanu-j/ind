"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";

interface SubmitResult {
  batchId: string;
  totalUrls: number;
  apiCount: number;
  crawlTrapCount: number;
  indexNowCount: number;
}

export default function SubmitPage() {
  const [rawUrls, setRawUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await api.post<SubmitResult>("/api/index/submit", { rawUrls });
      setResult(data);
      setRawUrls("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed.");
    } finally {
      setLoading(false);
    }
  }

  const lineCount = rawUrls.split(/\n/).filter((l) => l.trim()).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Submit URLs</h1>
        <p className="mt-1 text-zinc-400">
          Hybrid split: ~30% Google Indexing API · ~70% crawl trap + IndexNow
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk URL list</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            <textarea
              value={rawUrls}
              onChange={(e) => setRawUrls(e.target.value)}
              placeholder="https://example.com/page-1&#10;https://example.com/page-2"
              rows={14}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
              disabled={loading}
            />
            <p className="text-sm text-zinc-500">
              {lineCount} line(s) · 1 credit per valid URL
            </p>
            <Button type="submit" disabled={loading || !rawUrls.trim()}>
              {loading ? "Submitting…" : "Execute hybrid indexing"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="pt-6">
            <p className="font-semibold text-violet-300">Batch queued</p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              <li>Batch ID: {result.batchId}</li>
              <li>Total: {result.totalUrls}</li>
              <li>API lane: {result.apiCount}</li>
              <li>Crawl trap: {result.crawlTrapCount}</li>
              <li>IndexNow jobs: {result.indexNowCount}</li>
            </ul>
            <p className="mt-3 text-xs text-zinc-500">
              Jobs process automatically in development. In production, run{" "}
              <code className="text-violet-400">npm run worker</code> or cron{" "}
              <code className="text-violet-400">POST /api/worker/process</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
