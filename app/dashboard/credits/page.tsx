"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api/client";
import type { CreditPackage } from "@/lib/constants/credits";
import { cn } from "@/lib/utils";

export default function CreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [stripeOn, setStripeOn] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{
        packages: CreditPackage[];
        demoPurchasesEnabled: boolean;
        stripeCheckoutAvailable?: boolean;
      }>("/api/credits/packages")
      .then((data) => {
        setPackages(data.packages);
        setDemoEnabled(data.demoPurchasesEnabled);
        setStripeOn(Boolean(data.stripeCheckoutAvailable));
      })
      .catch(() => setError("Failed to load packages."));
  }, []);

  async function checkoutStripe(packageId: string) {
    setLoading(`s:${packageId}`);
    setError("");
    setMessage("");
    try {
      const { url } = await api.post<{ url: string }>("/api/credits/checkout", { packageId });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed.");
    } finally {
      setLoading(null);
    }
  }

  async function purchase(packageId: string) {
    setLoading(`d:${packageId}`);
    setError("");
    setMessage("");
    try {
      const result = await api.post<{
        creditsAdded: number;
        newBalance: number;
        package: string;
      }>("/api/credits/purchase", { packageId });
      setBalance(result.newBalance);
      setMessage(`+${result.creditsAdded} credits added (${result.package}). Balance: ${result.newBalance}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Purchase failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Buy credits</h1>
        <p className="mt-1 text-zinc-400">
          1 credit = 1 URL submitted to Google Indexing API + discovery signals
        </p>
        {balance !== null && (
          <p className="mt-2 text-sm text-violet-400">
            Balance: <span className="font-semibold">{balance}</span> credits
          </p>
        )}
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={cn(
              "relative",
              pkg.popular && "border-violet-500/50 ring-1 ring-violet-500/30"
            )}
          >
            {pkg.popular && (
              <span className="absolute -top-3 left-4 flex items-center gap-1 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-medium text-white">
                <Sparkles className="h-3 w-3" /> Most popular
              </span>
            )}
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {pkg.name}
                <span className="text-violet-400">${pkg.priceUsd}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-bold text-white">
                {pkg.credits.toLocaleString()}
                <span className="ml-2 text-sm font-normal text-zinc-500">credits</span>
              </p>
              <p className="text-sm text-zinc-400">{pkg.description}</p>
              <ul className="space-y-1 text-sm text-zinc-500">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Google Indexing API
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  IndexNow + discovery pings
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Live Google status
                </li>
              </ul>
              <div className="flex flex-col gap-2">
                {stripeOn && (
                  <Button
                    className="w-full"
                    disabled={loading === `s:${pkg.id}` || loading === `d:${pkg.id}`}
                    onClick={() => checkoutStripe(pkg.id)}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {loading === `s:${pkg.id}` ? "Redirecting…" : "Pay with card (Stripe)"}
                  </Button>
                )}
                <Button
                  className="w-full"
                  variant={stripeOn ? "secondary" : "primary"}
                  disabled={
                    !demoEnabled ||
                    loading === `d:${pkg.id}` ||
                    loading === `s:${pkg.id}`
                  }
                  onClick={() => purchase(pkg.id)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {loading === `d:${pkg.id}`
                    ? "Processing…"
                    : demoEnabled
                      ? stripeOn
                        ? "Add demo credits (no charge)"
                        : "Buy now"
                      : "Payments coming soon"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!demoEnabled && (
        <p className="text-center text-xs text-zinc-600">
          Set ALLOW_DEMO_CREDITS=true in .env to enable test purchases.
        </p>
      )}
    </div>
  );
}
