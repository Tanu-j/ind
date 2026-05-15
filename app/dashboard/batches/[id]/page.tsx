"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";

interface UrlRow {
  id: string;
  url: string;
  routeUsed: string;
  status: string;
  errorMessage?: string;
}

export default function BatchDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [urls, setUrls] = useState<UrlRow[]>([]);
  const [batch, setBatch] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ batch: Record<string, unknown>; urls: UrlRow[] }>(`/api/batches/${id}`)
      .then((d) => {
        setBatch(d.batch);
        setUrls(d.urls);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-zinc-500">Loading batch…</p>;
  if (!batch) return <p className="text-red-400">Batch not found.</p>;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/batches" className="text-sm text-violet-400 hover:underline">
        ← Back to batches
      </Link>
      <h1 className="text-2xl font-bold text-white">
        Batch · {String(batch.totalUrls)} URLs
      </h1>
      <p className="text-zinc-400">
        Status: <Badge variant={statusVariant(String(batch.status))}>{String(batch.status)}</Badge>
      </p>

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
                {u.errorMessage && (
                  <p className="w-full text-xs text-red-400">{u.errorMessage}</p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
