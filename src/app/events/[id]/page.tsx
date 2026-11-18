import { redirect, notFound } from "next/navigation";
import { eventById } from "@/lib/portfolio";
import { eventSaved } from "@/lib/csv-file";

export default async function EventIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = eventById(id);
  if (!ev) {
    if (eventSaved(id)) return null; // the layout shows "Setting up…"
    notFound();
  }
  redirect(`/events/${id}/${ev.stage}`);
}
