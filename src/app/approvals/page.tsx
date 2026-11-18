import { PageHeader } from "@/components/ui";
import { ApprovalsTable } from "@/components/tables";


export default function ApprovalsPage() {
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Approvals" }]}
        title="Approvals"
        subtitle="Award decisions waiting for sign-off. Each comes with the AI's written reasons and links to the original quotes."
        info="Company rule: awards above ₹1 crore also need the CFO's approval. If prices expire while waiting, the AI asks suppliers to reconfirm."
      />
      <div className="px-8 py-6">
        <ApprovalsTable />
      </div>
    </div>
  );
}
