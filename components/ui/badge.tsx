import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-zinc-800 text-zinc-300",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
  info: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusVariant(
  status: string
): keyof typeof variants {
  switch (status) {
    case "COMPLETED":
    case "INDEXED":
    case "SUBMITTED":
    case "CRAWLED":
      return "success";
    case "PROCESSING":
    case "QUEUED":
    case "ACTIVE":
    case "PENDING":
      return "processing";
    case "FAILED":
      return "error";
    case "PARTIAL":
      return "warning";
    default:
      return "default";
  }
}
