import Link from "next/link";
import { ArrowRight, Check, Clock, Globe, Zap } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { CREDIT_PACKAGES } from "@/lib/constants/credits";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/40 via-zinc-950 to-zinc-950" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-sm text-emerald-300">
              <Zap className="h-4 w-4" />
              Google Indexing API · Results in minutes
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Get your URLs indexed on{" "}
              <span className="text-violet-400">Google faster</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
              Paste your website URLs, spend credits, and we submit them to Google
              Indexing API instantly — the same method used by professional indexing
              services. Track every URL live until Google confirms receipt.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-violet-600 px-8 font-medium text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
              >
                Start indexing free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-lg border border-zinc-700 px-6 text-zinc-300 hover:bg-zinc-900"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              100 free credits on signup · No card required
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Instant submission",
                desc: "URLs hit Google Indexing API within seconds of paste — not hours.",
              },
              {
                icon: Globe,
                title: "Multi-signal boost",
                desc: "IndexNow, sitemap pings, and discovery feeds reinforce crawl priority.",
              },
              {
                icon: Clock,
                title: "Live tracking",
                desc: "See SUBMITTED → INDEXED status per URL as Google processes notifications.",
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
          </div>
        </section>

        <section className="border-t border-zinc-800 bg-zinc-900/20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-3xl font-bold text-white">Simple credit pricing</h2>
            <p className="mt-2 text-zinc-400">1 credit = 1 URL indexed</p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-xl border p-6 text-left ${
                    pkg.popular
                      ? "border-violet-500/50 bg-violet-500/5"
                      : "border-zinc-800 bg-zinc-950/50"
                  }`}
                >
                  {pkg.popular && (
                    <span className="mb-3 inline-block text-xs font-medium text-violet-400">
                      Most popular
                    </span>
                  )}
                  <p className="text-lg font-semibold text-white">{pkg.name}</p>
                  <p className="mt-1 text-3xl font-bold text-violet-400">
                    ${pkg.priceUsd}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {pkg.credits.toLocaleString()} credits
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Google Indexing API
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Live status dashboard
                    </li>
                  </ul>
                </div>
              ))}
            </div>
            <Link
              href="/register"
              className="mt-10 inline-flex h-12 items-center gap-2 rounded-lg bg-violet-600 px-8 font-medium text-white hover:bg-violet-500"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24 text-center sm:px-6">
          <p className="text-sm text-zinc-500">
            Google decides final indexing. We deliver official Indexing API notifications
            and discovery signals — the fastest legitimate path to crawl. For JobPosting
            and BroadcastEvent pages, results are typically fastest.
          </p>
        </section>
      </main>
    </div>
  );
}
