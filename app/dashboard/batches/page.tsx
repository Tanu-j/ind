"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Batch {
  id: string;
  totalUrls: number;
  apiCount: number;
  crawlTrapCount: number;
  status: string;
  completedCount: number;
  failedCount: number;
  createdAt: string;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ batches: Batch[] }>("/api/batches?limit=50")
      .then((d) => setBatches(d.batches))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Batches</h1>
      <Card>
        <CardHeader>
          <CardTitle>Submission history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500">Loading…</p>
          ) : batches.length === 0 ? (
            <p className="text-zinc-500">No batches yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-400">
                    <th className="pb-3 pr-4">URLs</th>
                    <th className="pb-3 pr-4">API / Trap</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Progress</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b border-zinc-800/50">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/dashboard/batches/${b.id}`}
                          className="text-violet-400 hover:underline"
                        >
                          {b.totalUrls}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {b.apiCount} / {b.crawlTrapCount}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {b.completedCount} ok · {b.failedCount} fail
                      </td>
                      <td className="py-3 text-zinc-500">{formatDate(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
