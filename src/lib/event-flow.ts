/** Small rules shared by the request draft, the send step and the quotes tab. */

/** Quote deadline for a new request: 10 days from today, 6 pm (same as the last boxes request). */
export function quoteDeadline(from = new Date()) {
  const d = new Date(from.getTime() + 10 * 86400000);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

/** Supplier category that fits an event, from its name and category. */
export const supplierCategoryFor = (ev: { name: string; category: string }) =>
  /box|carton|corrugat/i.test(ev.name) ? "Corrugated boxes" : ev.category;

/** Company rule: invite at least this many suppliers. */
export const MIN_SUPPLIERS = 3;
