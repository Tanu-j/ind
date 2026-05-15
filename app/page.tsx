import Link from "next/link";
import { ArrowRight, Layers, Shield, Zap } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/30 via-zinc-950 to-zinc-950" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1 text-sm text-violet-300">
              Hybrid indexing · MongoDB · Next.js
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Index URLs faster with a{" "}
              <span className="text-violet-400">production hybrid pipeline</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
              WhiteIndexWay routes your URLs through Google Indexing API, crawl-trap
              discovery feeds, and IndexNow — with real-time batch tracking and credit
              management.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-violet-600 px-6 font-medium text-white hover:bg-violet-500"
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-lg border border-zinc-700 px-6 text-zinc-300 hover:bg-zinc-900"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-24 sm:grid-cols-3 sm:px-6">
          {[
            {
              icon: Zap,
              title: "API lane (30%)",
              desc: "Google Indexing API for verified properties with your GCP service account.",
            },
            {
              icon: Layers,
              title: "Crawl trap (70%)",
              desc: "RSS seed feeds, discovery pings, and contextual link placement.",
            },
            {
              icon: Shield,
              title: "IndexNow + tracking",
              desc: "Cross-engine signals with per-URL status in your dashboard.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6"
            >
              <f.icon className="mb-4 h-8 w-8 text-violet-400" />
              <h3 className="font-semibold text-zinc-100">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
