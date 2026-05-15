import { z } from "zod";
import { INDEXING_MODES, MAX_URLS_PER_BATCH } from "@/lib/constants";

export const submitUrlsSchema = z.object({
  rawUrls: z.string().min(1).max(2_000_000),
  mode: z.enum(INDEXING_MODES).optional(),
});

export const gcpCredentialSchema = z.object({
  label: z.string().min(1).max(100),
  serviceAccountJson: z.string().min(10),
  propertyUrl: z.string().url(),
});

export type SubmitUrlsInput = z.infer<typeof submitUrlsSchema>;
export type GcpCredentialInput = z.infer<typeof gcpCredentialSchema>;

export function validateUrlCount(count: number): string | null {
  if (count === 0) return "No valid URLs found. Use one http(s) URL per line.";
  if (count > MAX_URLS_PER_BATCH) {
    return `Maximum ${MAX_URLS_PER_BATCH} URLs per batch.`;
  }
  return null;
}
