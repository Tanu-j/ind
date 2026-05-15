/** Detect JSON-LD schema types in HTML for Google API eligibility hints. */
export function detectSchemaTypes(html: string): string[] {
  const types = new Set<string>();
  const ldJsonBlocks = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!ldJsonBlocks) return [];

  for (const block of ldJsonBlocks) {
    const inner = block.replace(/<script[^>]*>|<\/script>/gi, "").trim();
    try {
      const data = JSON.parse(inner) as unknown;
      collectTypes(data, types);
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return [...types];
}

function collectTypes(data: unknown, types: Set<string>): void {
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data)) {
    data.forEach((item) => collectTypes(item, types));
    return;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj["@type"] === "string") types.add(obj["@type"]);
  if (Array.isArray(obj["@type"])) {
    obj["@type"].forEach((t) => typeof t === "string" && types.add(t));
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") collectTypes(value, types);
  }
}
