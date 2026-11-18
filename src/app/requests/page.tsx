import { PageHeader, Stat } from "@/components/ui";
import { RequestsTable } from "@/components/tables";
import { AskBox } from "@/components/ask-box";
import { REQUESTS } from "@/lib/portfolio";


export default function RequestsPage() {
  const open = REQUESTS.filter((r) => r.status === "new" || r.status === "needs_info");
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Requests" }]}
        title="Requests"
        subtitle="What company teams need you to buy. They arrive by WhatsApp, email or form. Review each one, then start sourcing or close it."
        info="An internal request is a team (a plant, admin, IT) asking the buyer to buy something. When you convert it, it becomes a sourcing event that goes to suppliers."
      />
      <div className="space-y-6 px-8 py-6">
        <div>
          <div className="mb-2 text-[13px] font-semibold text-indigo">Raise a request for a team</div>
          <AskBox mode="internal" compact />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Stat label="Waiting for you" value={open.length} tone="warn" info="New requests, plus requests waiting on details from the requester." />
          <Stat label="Sourcing started" value={REQUESTS.filter((r) => r.status === "converted").length} info="Requests already turned into sourcing events." />
          <Stat label="Covered by contract" value={REQUESTS.filter((r) => r.status === "covered").length} info="Requests that could be bought from an existing price agreement, so no new quotes were needed." />
          <Stat label="Avg. time to start sourcing" value="1.4 days" info="From the request arriving to the sourcing event being created." />
        </div>

        <RequestsTable />
      </div>
    </div>
  );
}
