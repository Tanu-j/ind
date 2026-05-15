import Link from "next/link";
import { ArrowRight, Coins, Link2, Layers } from "lucide-react";
import { connectDB } from "@/lib/db/mongodb";
import { getCurrentUser } from "@/lib/auth/get-user";
import { IndexBatch, IndexedUrl, ProcessingJob } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import mongoose from "mongoose";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectDB();
  const userId = new mongoose.Types.ObjectId(user.id);

  const [recentBatches, pendingJobs, urlStats] = await Promise.all([
    IndexBatch.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ProcessingJob.countDocuments({ userId, status: "PENDING" }),
    IndexedUrl.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const submitted = urlStats.find((s) => s._id === "SUBMITTED")?.count ?? 0;
  const indexed = urlStats.find((s) => s._id === "INDEXED")?.count ?? 0;
  const failed = urlStats.find((s) => s._id === "FAILED")?.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-zinc-400">
          Instant Google Indexing API — paste URLs, track live status
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Credits</p>
            <p className="text-3xl font-bold text-violet-400">{user.credits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Pending jobs</p>
            <p className="text-3xl font-bold">{pendingJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Google submitted</p>
            <p className="text-3xl font-bold text-emerald-400">{submitted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Google confirmed</p>
            <p className="text-3xl font-bold text-violet-300">{indexed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Failed</p>
            <p className="text-3xl font-bold text-red-400">{failed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/submit"
          className="flex items-center gap-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-6 hover:bg-violet-500/15"
        >
          <Link2 className="h-8 w-8 text-violet-400" />
          <div>
            <p className="font-semibold">Index URLs now</p>
            <p className="text-sm text-zinc-400">Paste & submit to Google</p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5 text-violet-400" />
        </Link>
        <Link
          href="/dashboard/credits"
          className="flex items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 hover:bg-zinc-800/50"
        >
          <Coins className="h-8 w-8 text-amber-400" />
          <div>
            <p className="font-semibold">Buy credits</p>
            <p className="text-sm text-zinc-400">Scale your indexing</p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5" />
        </Link>
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900/50 p-6 hover:bg-zinc-800/50"
        >
          <Layers className="h-8 w-8 text-zinc-400" />
          <div>
            <p className="font-semibold">GCP credentials</p>
            <p className="text-sm text-zinc-400">Connect Indexing API</p>
          </div>
          <ArrowRight className="ml-auto h-5 w-5" />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent batches</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBatches.length === 0 ? (
            <p className="text-sm text-zinc-500">No batches yet. Submit your first URLs.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {recentBatches.map((b) => (
                <li key={b._id.toString()} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/dashboard/batches/${b._id}`}
                      className="font-medium text-violet-400 hover:underline"
                    >
                      {b.totalUrls} URLs
                    </Link>
                    <p className="text-xs text-zinc-500">{formatDate(b.createdAt)}</p>
                  </div>
                  <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
