/**
 * After a save, wait until the app has reloaded its data (GET /api/ready), plus a short settle, then open the page.
 * Avoids landing on a page whose buttons aren't working yet while the app rebuilds. Gives up waiting after ~12 s.
 */
export async function goWhenReady(url: string, check: Record<string, string>) {
  const qs = new URLSearchParams(check).toString();
  for (let i = 0; i < 30; i++) {
    try {
      const j = await (await fetch(`/api/ready?${qs}`, { cache: "no-store" })).json();
      if (j.ready) break;
    } catch { /* server busy rebuilding: try again */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  await new Promise((r) => setTimeout(r, 1200)); // let the page code finish rebuilding too
  window.location.assign(url);
}
