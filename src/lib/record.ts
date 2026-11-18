/** Client helper: record a buyer decision in Change history. Returns false if it couldn't be saved. */
export async function recordDecision(area: string, what: string, tone?: "ok" | "warn") {
  try {
    const res = await fetch("/api/history", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ area, what, tone }) });
    return res.ok;
  } catch { return false; }
}
