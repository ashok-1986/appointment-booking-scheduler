import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-utils";
import { getUnifiedCustomerWorkspaceData } from "@/lib/customers";
import CustomerWorkspaceClient from "./customer-workspace-client";
import { serializeBigInts } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export default async function CustomerWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bookingId?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { bookingId } = await searchParams;

  const workspaceData = await getUnifiedCustomerWorkspaceData(id);
  if (!workspaceData) {
    notFound();
  }

  // Guaranteed BigInt serialization for Next.js Client Component boundary
  const serializedWorkspaceData = serializeBigInts(workspaceData);

  return (
    <CustomerWorkspaceClient
      initialData={serializedWorkspaceData}
      initialBookingId={bookingId}
    />
  );
}
