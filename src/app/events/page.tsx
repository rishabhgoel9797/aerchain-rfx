import { PageHeader } from "@/components/ui";
import { AskBox } from "@/components/ask-box";
import { EventsTable } from "@/components/tables";

export default function EventsPage() {
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Sourcing events" }]}
        title="Sourcing events"
        subtitle="Requests for quotes you send to suppliers. Open one to follow it from request to award."
        info="A sourcing event (RFQ) is the buyer asking suppliers for prices. It usually starts from a team's internal request, but you can also start one directly."
      />
      <div className="space-y-6 px-8 py-6">
        <div>
          <div className="mb-2 text-[13px] font-semibold text-indigo">Start a new request for quotes</div>
          <AskBox mode="rfq" compact />
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <EventsTable />
        </div>
      </div>
    </div>
  );
}
