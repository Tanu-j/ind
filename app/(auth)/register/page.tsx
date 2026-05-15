"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api/client";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/api/auth/register", {
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
        <h1 className="text-2xl font-bold text-white">Create account</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-400 hover:underline">
            Sign in
          </Link>
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Name</label>
            <Input name="name" required minLength={2} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Email</label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Password</label>
            <Input name="password" type="password" required minLength={8} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
