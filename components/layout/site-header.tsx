import Link from "next/link";
import { Zap } from "lucide-react";
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Zap className="h-4 w-4 text-white" />
          </span>
          WhiteIndexWay
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100">
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-8 items-center rounded-lg bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-500"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
