import type { ReactNode } from "react";
import { Badge, statusVariant } from "@/components/ui/badge";

export interface UrlResponseMeta {
  message?: string;
  googleNotifiedAt?: string;
  googleIndexedAt?: string;
  preflight?: { warnings?: string[]; googleApiEligible?: boolean };
  gscInspection?: {
    verdict?: string;
    coverageState?: string;
    lastCrawlTime?: string;
  };
  gscInspectionTimeline?: Array<{
    at?: string;
    round?: number;
    verdict?: string;
    coverageState?: string;
    lastCrawlTime?: string;
    error?: string;
  }>;
}

export function UrlStatusDetails({
  status,
  errorMessage,
  responseMeta,
}: {
  status: string;
  errorMessage?: string;
  responseMeta?: UrlResponseMeta;
}) {
  const timeline = responseMeta?.gscInspectionTimeline;

  return (
    <>
      {status === "SUBMITTED" && responseMeta?.message && (
        <p className="w-full text-xs text-emerald-400/80">{responseMeta.message}</p>
      )}
      {status === "INDEXED" && responseMeta?.googleIndexedAt && (
        <p className="w-full text-xs text-emerald-400">
          Google confirmed · {new Date(responseMeta.googleIndexedAt).toLocaleString()}
        </p>
      )}
      {responseMeta?.gscInspection && (
        <p className="w-full text-xs text-zinc-500">
          GSC (latest): {responseMeta.gscInspection.verdict ?? "—"}
          {responseMeta.gscInspection.coverageState
            ? ` · ${responseMeta.gscInspection.coverageState}`
            : ""}
          {responseMeta.gscInspection.lastCrawlTime
            ? ` · crawled ${new Date(responseMeta.gscInspection.lastCrawlTime).toLocaleString()}`
            : ""}
        </p>
      )}
      {timeline && timeline.length > 0 && <GscInspectionTimeline timeline={timeline} />}
      {responseMeta?.preflight?.warnings?.map((w) => (
        <p key={w} className="w-full text-xs text-amber-500/80">
          {w}
        </p>
      ))}
      {errorMessage && <p className="w-full text-xs text-red-400">{errorMessage}</p>}
    </>
  );
}

function GscInspectionTimeline({
  timeline,
}: {
  timeline: NonNullable<UrlResponseMeta["gscInspectionTimeline"]>;
}) {
  return (
    <div className="w-full rounded border border-zinc-800/80 bg-zinc-950/40 px-2 py-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        GSC inspection timeline
      </p>
      <ul className="space-y-1 font-mono text-[10px] text-zinc-500">
        {timeline.map((row, i) => (
          <li key={`${row.at}-${i}`}>
            {row.at ? new Date(row.at).toLocaleTimeString() : "—"} · round{" "}
            {row.round ?? i + 1}
            {row.verdict ? ` · ${row.verdict}` : ""}
            {row.coverageState ? ` · ${row.coverageState}` : ""}
            {row.lastCrawlTime
              ? ` · crawled ${new Date(row.lastCrawlTime).toLocaleTimeString()}`
              : ""}
            {row.error ? ` · ${row.error}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UrlStatusRow({
  url,
  routeUsed,
  status,
  errorMessage,
  responseMeta,
  trailing,
}: {
  url: string;
  routeUsed: string;
  status: string;
  errorMessage?: string;
  responseMeta?: UrlResponseMeta;
  trailing?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate font-mono text-zinc-300">{url}</span>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        <span className="text-xs text-zinc-500">{routeUsed}</span>
        <Badge variant={statusVariant(status)}>{status}</Badge>
      </div>
      <UrlStatusDetails
        status={status}
        errorMessage={errorMessage}
        responseMeta={responseMeta}
      />
    </li>
  );
}
