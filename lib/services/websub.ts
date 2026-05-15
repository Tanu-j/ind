const HUBS = [
  "https://pubsubhubbub.appspot.com/",
  "https://pubsubhubbub.superfeedr.com/",
];

export async function pingWebSub(feedUrl: string): Promise<{ ok: boolean; hubs: number }> {
  let okCount = 0;
  const body = new URLSearchParams({
    "hub.mode": "publish",
    "hub.url": feedUrl,
  });

  await Promise.allSettled(
    HUBS.map(async (hub) => {
      const res = await fetch(hub, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 204) okCount++;
    })
  );

  return { ok: okCount > 0, hubs: okCount };
}
