import { Star } from "lucide-react";
import { PageHeader, Section } from "@/components/ui";
import { SupplierTable } from "@/components/tables";
import { AddSupplierButton } from "@/components/add-supplier";
import { Learn } from "@/components/stages/late";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Suppliers" }]}
        title="Suppliers"
        subtitle="Every supplier RSG Herbal House works with: contacts and channels, track record, documents and warnings."
        info="Performance recorded here is shown next to a supplier's name whenever you consider inviting them. New suppliers show 'No history', never zero."
        actions={<AddSupplierButton />}
      />
      <div className="space-y-4 px-8 py-6">
        <SupplierTable mode="directory" query={q} />
        <Section title="Performance after delivery" icon={<Star size={16} />} open={false} info="How suppliers actually delivered: on time, quality, and whether invoices matched the agreed price."><Learn /></Section>
      </div>
    </div>
  );
}
