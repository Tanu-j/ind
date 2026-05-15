"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  History,
  Settings,
  LogOut,
  Zap,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/submit", label: "Submit URLs", icon: Link2 },
  { href: "/dashboard/batches", label: "Batches", icon: History },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; credits: number };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await api.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden w-64 flex-col border-r border-zinc-800 bg-zinc-900/30 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Zap className="h-4 w-4" />
          </span>
          <span className="font-semibold">WhiteIndexWay</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-violet-600/20 text-violet-300"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
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
          <p className="text-sm text-zinc-400">
            Welcome, <span className="text-zinc-100">{user.name}</span>
          </p>
          <p className="text-sm text-violet-400 lg:hidden">{user.credits} credits</p>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
