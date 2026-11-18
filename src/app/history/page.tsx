import { PageHeader } from "@/components/ui";
import { HistoryTable } from "@/components/tables";

export default function History() {
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Change history" }]} title="Change history" subtitle="Every change and decision across all requests and sourcing events: who made it, when, and why. Nothing is overwritten silently." info="This is what makes the numbers trustworthy: any value can be traced back to the original file and every edit since." />
      <div className="px-8 py-6">
        <HistoryTable />
      </div>
    </div>
  );
}
