"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface PlatformKey {
  id: string;
  label: string;
  clientEmail: string;
  isActive: boolean;
  dailyUsage: number;
  dailyLimit: number;
  remainingToday: number;
}

interface PoolSummary {
  totalKeys: number;
  activeKeys: number;
  totalDailyCapacity: number;
  remainingToday: number;
  usedToday: number;
}

export default function PlatformKeysAdminPage() {
  const [keys, setKeys] = useState<PlatformKey[]>([]);
  const [summary, setSummary] = useState<PoolSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<{ keys: PlatformKey[]; summary: PoolSummary }>(
        "/api/admin/platform-keys"
      );
      setKeys(data.keys);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    setError("");
    setSuccess("");
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/api/admin/platform-keys", {
        label: form.get("label"),
        serviceAccountJson: form.get("serviceAccountJson"),
      });
      setSuccess("Platform key added to rotation pool.");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add key.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await api.patch(`/api/admin/platform-keys/${id}`, { isActive: !isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    }
  }

  async function removeKey(id: string) {
    if (!confirm("Remove this key from the pool?")) return;
    try {
      await api.delete(`/api/admin/platform-keys/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    }
  }

  async function resetUsage(id: string) {
    try {
      await api.post(`/api/admin/platform-keys/${id}/reset-usage`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-start gap-3">
        <Shield className="h-8 w-8 text-violet-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Platform GCP key pool</h1>
          <p className="mt-1 text-zinc-400">
            Manage service accounts for automatic rotation — ~200 Google Indexing API
            requests per key per day.
          </p>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-zinc-400">Active keys</p>
              <p className="text-2xl font-bold text-violet-400">
                {summary.activeKeys} / {summary.totalKeys}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-zinc-400">Daily capacity</p>
              <p className="text-2xl font-bold">{summary.totalDailyCapacity}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-zinc-400">Used today</p>
              <p className="text-2xl font-bold text-amber-400">{summary.usedToday}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-zinc-400">Remaining today</p>
              <p className="text-2xl font-bold text-emerald-400">
                {summary.remainingToday}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add service account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-zinc-400">
            Each key must be added as <strong>Owner</strong> in Google Search Console for
            sites you index. Duplicate client emails are rejected.
          </p>
          <form onSubmit={onAdd} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Label</label>
              <Input name="label" placeholder="Key #1 — Main sites" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Service account JSON
              </label>
              <textarea
                name="serviceAccountJson"
                required
                rows={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 p-3 font-mono text-xs"
                placeholder='{"type":"service_account",...}'
              />
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? "Adding…" : "Add to pool"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Key pool ({keys.length})
          </CardTitle>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading && keys.length === 0 ? (
            <p className="text-zinc-500">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-zinc-500">
              No platform keys yet. Add service accounts above or run{" "}
              <code className="text-violet-400">npm run seed:keys</code> from env.
            </p>
          ) : (
            <ul className="space-y-4">
              {keys.map((k) => {
                const pct = Math.min(100, (k.dailyUsage / k.dailyLimit) * 100);
                return (
                  <li
                    key={k.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-100">
                          {k.label}
                          {!k.isActive && (
                            <span className="ml-2 text-xs text-zinc-500">(inactive)</span>
                          )}
                        </p>
                        <p className="text-sm text-zinc-400">{k.clientEmail}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => toggleActive(k.id, k.isActive)}
                        >
                          {k.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => resetUsage(k.id)}
                        >
                          Reset usage
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          onClick={() => removeKey(k.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-zinc-500">
                        <span>
                          {k.dailyUsage} / {k.dailyLimit} today
                        </span>
                        <span>{k.remainingToday} left</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-violet-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
