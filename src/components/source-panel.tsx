"use client";

/* eslint-disable @next/next/no-img-element */
import { Download, Eye, FileSpreadsheet, FileText, Image as ImageIcon, Loader2, MessageCircle, Phone, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InfoTip } from "@/components/ui";

export type SourceInfo = {
  raw?: string;
  file?: string; // relative to data/files/RFQ-2026-014
  loc?: string;
  box?: { x: number; y: number; w: number; h: number };
  ocr?: number;
  steps?: string[];
  rematched?: string;
  byAI?: boolean;
};

const iconFor = (f = "") => (/\.xlsx$/i.test(f) ? FileSpreadsheet : /\.(jpg|jpeg|png)$/i.test(f) ? ImageIcon : /call/i.test(f) ? Phone : /whatsapp/i.test(f) ? MessageCircle : FileText);
const url = (file: string, box?: SourceInfo["box"]) => `/api/source?path=${encodeURIComponent(file)}${box ? `&x=${box.x}&y=${box.y}&w=${box.w}&h=${box.h}` : ""}`;

/** "Where it came from" + "How we got this number", for any value. */
export function SourcePanel({ s }: { s: SourceInfo }) {
  const I = iconFor(s.file);
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Where it came from <InfoTip text="The exact spot in the supplier's original file: a spreadsheet row, a PDF page and line, a paragraph, a chat line, or a crop of the photo." />
        </div>
        <div className="rounded-xl border border-line bg-bg p-3">
          {s.file ? (
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink"><I size={14} className="shrink-0 text-muted" /><span className="truncate">{s.file.split("/").pop()}</span></span>
              <FileViewerButton file={s.file} loc={s.loc} box={s.box} />
            </div>
          ) : <div className="text-[12px] text-muted">No source file</div>}
          {s.loc && <div className="mt-0.5 text-[11px] text-muted">{s.loc}{s.ocr != null ? ` · photo reading confidence ${s.ocr}%` : ""}</div>}
          {s.file && s.box && <img src={url(s.file, s.box)} alt="Crop of the supplier's photo where this value was read" className="mt-2 w-full rounded-lg border border-line bg-white" />}
          {s.raw && <div className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-[12.5px] text-ink shadow-sm"><mark className="rounded bg-orange/20 px-1">{s.raw}</mark></div>}
        </div>
      </div>
      {s.steps && s.steps.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
            How we got this number <InfoTip text="The AI only reads what's written. Every conversion below is done by code, step by step, so you can check it." />
          </div>
          <ol className="space-y-1 rounded-xl border border-line p-3 text-[12.5px] text-ink">
            {s.steps.map((st, i) => <li key={i} className="flex gap-2"><span className="w-4 shrink-0 text-right text-muted">{i + 1}.</span>{st}</li>)}
          </ol>
        </div>
      )}
      {s.rematched && <div className="rounded-lg bg-tint px-3 py-2 text-[12px] text-ink"><b className="text-purple">Matched by size: </b>{s.rematched}</div>}
      {s.byAI && <div className="flex items-center gap-1.5 text-[11px] text-muted"><Sparkles size={12} className="text-[#5a35cf]" /> Read by AI, converted and checked by code</div>}
    </div>
  );
}

type Seg = { loc: string; text: string };

/** Message bodies get a plain name; real attachments keep their file name. */
const NAMES: Record<string, string> = { "email.txt": "Email", "whatsapp.txt": "WhatsApp chat", "call_note.txt": "Call note", "out_of_office.txt": "Out-of-office reply" };
const REQ_NAMES: [RegExp, string][] = [[/^REQ-\d+_form\.json$/i, "Form submission"], [/^REQ-\d+_email\.txt$/i, "Email"], [/^REQ-\d+_whatsapp\.txt$/i, "WhatsApp message"], [/^REQ-\d+_message\.txt$/i, "Message"], [/^message\.txt$/i, "Message"]];
const friendlyName = (file: string) => { const n = (file.split("/").pop() ?? file).replace(/^upload-\d+_/, ""); return NAMES[n] ?? REQ_NAMES.find(([re]) => re.test(n))?.[1] ?? n; };

/** "View original" — opens the supplier's file inside the app with the exact spot highlighted. */
export function FileViewerButton({ file, loc, box, label = "View original", chip }: { file: string; loc?: string; box?: SourceInfo["box"]; label?: string; chip?: boolean }) {
  const [open, setOpen] = useState(false);
  const I = iconFor(file);
  return (
    <>
      {chip ? (
        <button type="button" onClick={() => setOpen(true)} title={`Open ${file.split("/").pop()}`} className="inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-white px-1.5 py-0.5 text-[11.5px] font-medium text-ink hover:border-purple hover:text-purple">
          <I size={11} className="shrink-0 text-muted" /><span className="truncate">{label === "View original" ? friendlyName(file) : label}</span><Eye size={11} className="shrink-0 text-purple" />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-1 font-semibold text-purple hover:underline"><Eye size={13} /> {label}</button>
      )}
      {open && createPortal(<FileViewer file={file} loc={loc} box={box} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function FileViewer({ file, loc, box, onClose }: { file: string; loc?: string; box?: SourceInfo["box"]; onClose: () => void }) {
  const isImage = /\.(jpg|jpeg|png)$/i.test(file);
  const [data, setData] = useState<{ kind: string; segments: Seg[]; error?: string } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [pageView, setPageView] = useState(false);
  const isPdf = /\.pdf$/i.test(file);
  const hit = useRef<HTMLDivElement>(null);
  const I = iconFor(file);
  const where = loc?.split(" · ").pop();

  useEffect(() => {
    if (isImage) return;
    fetch(`/api/source/view?path=${encodeURIComponent(file)}`).then((r) => r.json()).then(setData).catch(() => setData({ kind: "", segments: [], error: "Couldn't load the file." }));
  }, [file, isImage]);
  useEffect(() => { hit.current?.scrollIntoView({ block: "center" }); }, [data, size]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  let lastPage = "";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/40 p-6" onClick={onClose}>
      <div className="flex h-full max-h-[860px] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <I size={18} className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-navy">{file.split("/").pop()}</div>
            <div className="text-[12px] text-muted">{data?.kind || (isImage ? "Photo" : "")}{where ? <> · highlighted: <span className="font-semibold text-orange">{where}</span></> : ""}</div>
          </div>
          {isPdf && (
            <div className="flex rounded-lg border border-line p-0.5 text-[12px] font-semibold">
              <button onClick={() => setPageView(false)} className={`rounded-md px-2.5 py-1 ${!pageView ? "bg-purple text-white" : "text-muted"}`}>As read</button>
              <button onClick={() => setPageView(true)} className={`rounded-md px-2.5 py-1 ${pageView ? "bg-purple text-white" : "text-muted"}`}>Page view</button>
            </div>
          )}
          <a href={url(file)} download={file.split("/").pop()} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-purple hover:bg-tint"><Download size={13} /> Download</a>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-bg"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-auto bg-bg p-5">
          {isPdf && pageView ? (
            <div className="mx-auto max-w-[820px] space-y-4">
              {Array.from({ length: Math.max(1, ...(data?.segments ?? []).map((sg) => Number(sg.loc.match(/^Page (\d+)/)?.[1] ?? 1))) }, (_, i) => (
                <div key={i}>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Page {i + 1}</div>
                  <img src={`${url(file)}&page=${i + 1}`} alt={`Page ${i + 1} of the supplier's PDF`} className="w-full rounded-lg border border-line bg-white shadow-sm" />
                </div>
              ))}
            </div>
          ) : isImage ? (
            <div className="relative mx-auto w-fit">
              <img src={url(file)} alt="Supplier's original photo" className="block max-w-full rounded-lg border border-line bg-white" onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
              {box && size && (
                <div ref={hit} className="pointer-events-none absolute rounded-md border-[3px] border-orange bg-orange/10" style={{ left: `${((box.x - 6) / size.w) * 100}%`, top: `${((box.y - 6) / size.h) * 100}%`, width: `${((box.w + 12) / size.w) * 100}%`, height: `${((box.h + 12) / size.h) * 100}%` }} />
              )}
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-muted"><Loader2 size={16} className="animate-spin text-purple" /> Opening file…</div>
          ) : data.error ? (
            <div className="py-20 text-center text-[13px] text-bad">{data.error}</div>
          ) : (
            <div className="mx-auto max-w-[820px] rounded-xl border border-line bg-white px-2 py-3 shadow-sm">
              {data.segments.map((sg, i) => {
                const page = sg.loc.match(/^Page (\d+)/)?.[1] ?? "";
                const showPage = page && page !== lastPage;
                lastPage = page || lastPage;
                const on = where === sg.loc;
                return (
                  <div key={i}>
                    {showPage && <div className="mx-3 mb-1 mt-3 border-b border-dashed border-line pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted first:mt-0">Page {page}</div>}
                    <div ref={on ? hit : undefined} className={`flex gap-3 rounded-lg px-3 py-1 text-[13px] ${on ? "bg-orange/15 ring-2 ring-orange" : ""}`}>
                      <span className="w-24 shrink-0 text-right text-[11px] leading-5 text-muted">{sg.loc.replace(/^Sheet "[^"]+", /, "").replace(/^Page \d+, /, "")}</span>
                      {data.kind === "Excel" ? (
                        <span className={`grid min-w-0 flex-1 gap-px text-[12px] leading-5 ${on ? "font-semibold text-navy" : "text-ink"}`} style={{ gridTemplateColumns: `repeat(${sg.text.split(" | ").length}, minmax(0, 1fr))` }}>
                          {sg.text.split(" | ").map((c, k) => <span key={k} className={`truncate border-l border-line px-2 ${/^[\d.,]+$/.test(c) ? "num text-right" : ""}`}>{c}</span>)}
                        </span>
                      ) : (
                        <span className={`min-w-0 whitespace-pre-wrap leading-5 ${on ? "font-semibold text-navy" : "text-ink"}`}>{sg.text}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-line px-5 py-2 text-[11.5px] text-muted">Shown exactly as the AI read it{where ? (isImage ? ". The orange box is where the price was read" : ", line by line. The orange line is where the price was read") : ""}. Download to open it in Excel, Word or a PDF reader.</div>
      </div>
    </div>
  );
}
