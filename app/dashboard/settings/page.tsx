"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";

interface Credential {
  id: string;
  label: string;
  propertyUrl: string;
  clientEmail: string;
  isActive: boolean;
  dailyUsage: number;
}

export default function SettingsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function loadCredentials() {
    api
      .get<{ credentials: Credential[] }>("/api/credentials")
      .then((d) => setCredentials(d.credentials))
      .catch(() => setError("Failed to load credentials."));
  }

  useEffect(() => {
    loadCredentials();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/api/credentials", {
        label: form.get("label"),
        propertyUrl: form.get("propertyUrl"),
        serviceAccountJson: form.get("serviceAccountJson"),
      });
      setSuccess("Credential saved.");
      e.currentTarget.reset();
      loadCredentials();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  async function removeCredential(id: string) {
    if (!confirm("Delete this credential?")) return;
    try {
      await api.delete(`/api/credentials/${id}`);
      loadCredentials();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
    }
  }

  async function toggleCredential(id: string, isActive: boolean) {
    try {
      await api.patch(`/api/credentials/${id}`, { isActive });
      loadCredentials();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Google Indexing API</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-zinc-400">
            Add a GCP service account with Indexing API enabled. The site must be verified in
            Search Console. Use only for JobPosting or BroadcastEvent pages per Google policy.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                {success}
              </p>
            )}
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Label</label>
              <Input name="label" placeholder="Production site" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Property URL</label>
              <Input
                name="propertyUrl"
                type="url"
                placeholder="https://yoursite.com"
                required
              />
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save credential"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <IndexNowSettings />

      {credentials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {credentials.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {c.label}
                    {!c.isActive && (
                      <span className="ml-2 text-xs text-zinc-500">(inactive)</span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-400">{c.propertyUrl}</p>
                  <p className="text-xs text-zinc-500">{c.clientEmail}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Daily usage: {c.dailyUsage} / 200
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => toggleCredential(c.id, !c.isActive)}
                  >
                    {c.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    type="button"
                    onClick={() => removeCredential(c.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IndexNowSettings() {
  const [host, setHost] = useState("");
  const [key, setKey] = useState("");
  const [keyFileUrl, setKeyFileUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get<{ configured: boolean; host?: string; key?: string; keyFileUrl?: string }>(
        "/api/settings/indexnow"
      )
      .then((d) => {
        if (d.configured && d.host && d.key) {
          setHost(d.host);
          setKey(d.key);
          setKeyFileUrl(d.keyFileUrl ?? "");
        }
      })
      .catch(() => null);
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const res = await api.post<{ keyFileUrl: string }>("/api/settings/indexnow", {
        host,
        key,
      });
      setKeyFileUrl(res.keyFileUrl);
      setMsg("IndexNow saved. Host the key file on your domain before submitting.");
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : "Save failed.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>IndexNow (your domain)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-zinc-400">
          Bing, Yandex, and other engines use IndexNow on your site. Host{" "}
          <code className="text-violet-400">{`{key}.txt`}</code> on your domain root.
        </p>
        <form onSubmit={save} className="space-y-4">
          {err && <p className="text-sm text-red-400">{err}</p>}
          {msg && <p className="text-sm text-emerald-400">{msg}</p>}
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Site host</label>
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="www.yoursite.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">IndexNow key</label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="your-indexnow-key"
              required
            />
          </div>
          {keyFileUrl && (
            <p className="text-xs text-zinc-500">
              Key file:{" "}
              <a href={keyFileUrl} className="text-violet-400" target="_blank" rel="noreferrer">
                {keyFileUrl}
              </a>
            </p>
          )}
          <Button type="submit">Save IndexNow</Button>
        </form>
      </CardContent>
    </Card>
  );
}
