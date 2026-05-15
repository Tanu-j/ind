"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  History,
  Settings,
  LogOut,
  Zap,
  CreditCard,
  Coins,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, short: "Home" },
  { href: "/dashboard/submit", label: "Index URLs", icon: Link2, short: "Index" },
  { href: "/dashboard/batches", label: "Batches", icon: History, short: "Batches" },
  { href: "/dashboard/credits", label: "Buy credits", icon: Coins, short: "Credits" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, short: "Settings" },
];

const adminNav = {
  href: "/dashboard/platform-keys",
  label: "GCP key pool",
  icon: Shield,
  short: "Keys",
};

export function DashboardShell({
  children,
  user,
  isAdmin = false,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; credits: number };
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const navItems = isAdmin ? [...nav, adminNav] : nav;

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* still navigate; stale session will fail on next protected request */
    }
    // Full navigation so the browser applies Set-Cookie and RSC cache cannot keep the old session layout.
    window.location.assign("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 pb-16 lg:pb-0">
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900/30 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Zap className="h-4 w-4" />
          </span>
          <span className="font-semibold">WhiteIndexWay</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                  item.href === "/dashboard/platform-keys" &&
                    "border border-amber-500/20"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-800 p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-zinc-800/50 px-3 py-2 text-sm">
            <CreditCard className="h-4 w-4 text-violet-400" />
            <span className="text-zinc-400">Credits:</span>
            <span className="font-semibold text-violet-300">{user.credits}</span>
          </div>
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="flex h-16 items-center justify-between border-b border-zinc-800 px-4 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Zap className="h-4 w-4" />
            </span>
            <span className="font-semibold">WhiteIndexWay</span>
          </div>
          <p className="hidden text-sm text-zinc-400 lg:block">
            Welcome, <span className="text-zinc-100">{user.name}</span>
          </p>
          <div className="flex items-center gap-3">
            <p className="text-sm text-violet-400">{user.credits} credits</p>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 lg:hidden"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Sign out</span>
            </button>
          </div>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-zinc-800 bg-zinc-950/95 backdrop-blur lg:hidden">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                active ? "text-violet-400" : "text-zinc-500"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
