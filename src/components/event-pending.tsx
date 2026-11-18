"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Shown for a sourcing event that was just created: it is already saved in the CSVs,
 * but the app data (seed.json) takes a moment to reload. Retries until the event shows up.
 */
export function EventPending({ id, label = "sourcing event" }: { id: string; label?: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 800);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-32 text-center">
      {/* Plain browser refresh as a fallback: works even while the app's scripts are still reloading. */}
      <meta httpEquiv="refresh" content="2" />
      <Loader2 size={22} className="animate-spin text-purple" />
      <div className="text-[15px] font-semibold text-navy">Setting up {id}…</div>
      <div className="text-[13px] text-muted">The {label} is saved. Opening it in a moment.</div>
    </div>
  );
}
