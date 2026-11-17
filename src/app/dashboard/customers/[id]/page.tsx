import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-utils";
import { getCustomerProfile } from "@/lib/customers";
import CustomerDossierClient from "./customer-dossier-client";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const profile = await getCustomerProfile(id);

  if (!profile) {
    notFound();
  }

  // Safely serialize BigInt fields
  const serializedProfile = JSON.parse(
    JSON.stringify(profile, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

  return <CustomerDossierClient initialProfile={serializedProfile} />;
}
