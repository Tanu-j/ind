"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Globe, Layers, Rocket, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { IndexingMode } from "@/lib/constants";

interface SubmitResult {
  batchId: string;
  totalUrls: number;
  apiCount: number;
  crawlTrapCount: number;
  indexNowCount: number;
  mode: IndexingMode;
  hasGoogleCredential: boolean;
  preflightFailed?: number;
  creditsUsed?: number;
}

interface AppConfig {
  indexingModes: IndexingMode[];
  defaultMode: IndexingMode;
  platformGoogleEnabled: boolean;
  maxUrlsPerBatch: number;
  turboCreditMultiplier?: number;
}

const MODE_INFO: Record<
  IndexingMode,
  { label: string; desc: string; icon: typeof Zap }
> = {
  google_instant: {
    label: "Google Instant",
    desc: "100% Google Indexing API + IndexNow + pings — fastest, like pro indexers",
    icon: Zap,
  },
  hybrid: {
    label: "Hybrid",
    desc: "Split between Google API and crawl-trap discovery",
    icon: Layers,
  },
  maximum: {
    label: "Maximum",
    desc: "Google API + crawl trap + IndexNow — all signals",
    icon: Rocket,
  },
  turbo: {
    label: "Turbo",
    desc: "Everything: Google API, GSC sitemap, batch IndexNow, crawl trap, WebSub (2 credits/URL)",
    icon: Flame,
  },
};

export default function SubmitPage() {
  const [rawUrls, setRawUrls] = useState("");
  const [mode, setMode] = useState<IndexingMode>("google_instant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    api.get<AppConfig>("/api/config").then((c) => {
      setConfig(c);
      setMode(c.defaultMode);
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await api.post<SubmitResult>("/api/index/submit", { rawUrls, mode });
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Instant Google Indexing</h1>
        <p className="mt-1 text-zinc-400">
          Paste your page URLs — we notify Google Indexing API within seconds
        </p>
        {config?.platformGoogleEnabled && (
          <p className="mt-2 flex items-center gap-2 text-sm text-emerald-400">
            <Globe className="h-4 w-4" />
            Platform Google API ready — no GCP setup required
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(config?.indexingModes ?? ["google_instant", "hybrid", "maximum", "turbo"]).map((m) => {
          const info = MODE_INFO[m] ?? MODE_INFO.google_instant;
          const Icon = info.icon;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                mode === m
                  ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/40"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              )}
            >
              <Icon
                className={cn(
                  "mb-2 h-6 w-6",
                  mode === m ? "text-violet-400" : "text-zinc-500"
                )}
              />
              <p className="font-semibold text-zinc-100">{info.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{info.desc}</p>
            </button>
          );
        })}
      </div>

      <Card className="border-violet-500/20">
        <CardHeader>
          <CardTitle>Paste your URLs (one per line)</CardTitle>
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
              placeholder={"https://yoursite.com/blog/post-1\nhttps://yoursite.com/products/item-2"}
              rows={16}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
              disabled={loading}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">
                {lineCount} URL(s) ·{" "}
                {lineCount *
                  (mode === "turbo" ? (config?.turboCreditMultiplier ?? 2) : 1)}{" "}
                credit(s)
                {config ? ` · max ${config.maxUrlsPerBatch}` : ""}
              </p>
              <div className="flex gap-2">
                <Link href="/dashboard/credits">
                  <Button type="button" variant="secondary">
                    Buy credits
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !rawUrls.trim()}>
                  {loading ? "Submitting to Google…" : "Index now"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-6">
            <p className="flex items-center gap-2 font-semibold text-emerald-300">
              <Zap className="h-5 w-5" />
              Submitted — processing in real time
            </p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-300">
              <li>Batch: {result.batchId}</li>
              <li>Mode: {result.mode}</li>
              <li>Google API: {result.apiCount} URLs</li>
              <li>IndexNow batch: {result.indexNowCount} URLs</li>
              {result.preflightFailed ? (
                <li className="text-amber-400">
                  Skipped {result.preflightFailed} URL(s) (failed preflight)
                </li>
              ) : null}
              {result.creditsUsed ? <li>Credits used: {result.creditsUsed}</li> : null}
            </ul>
            <Link
              href={`/dashboard/batches/${result.batchId}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:underline"
            >
              Watch live Google status →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
