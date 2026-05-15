"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/api/auth/login", {
        email: form.get("email"),
        password: form.get("password"),
      });
      const redirect = searchParams.get("redirect") ?? "/dashboard";
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm text-zinc-400">Email</label>
        <Input name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-zinc-400">Password</label>
        <Input name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
        <h1 className="text-2xl font-bold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-400">
          No account?{" "}
          <Link href="/register" className="text-violet-400 hover:underline">
            Register
          </Link>
        </p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
