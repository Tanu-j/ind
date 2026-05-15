import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseUrlList(raw: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      const normalized = parsed.href;
      if (!seen.has(normalized) && normalized.length <= 2048) {
        seen.add(normalized);
        urls.push(normalized);
      }
    } catch {
      continue;
    }
  }

  return urls;
}

export function splitHybridUrls<T>(urls: T[], apiRatio: number): { api: T[]; crawlTrap: T[] } {
  const ratio = Math.min(1, Math.max(0, apiRatio));
  const splitIndex = Math.ceil(urls.length * ratio);
  return {
    api: urls.slice(0, splitIndex),
    crawlTrap: urls.slice(splitIndex),
  };
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
