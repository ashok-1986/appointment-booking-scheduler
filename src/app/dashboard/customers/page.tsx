import { requireUser } from "@/lib/auth-utils";
import { listCustomers } from "@/lib/customers";
import CustomersClient from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  await requireUser();
  const { customers, stats } = await listCustomers();

  // Safely serialize BigInt fields for client hydration
  const serializedCustomers = JSON.parse(
    JSON.stringify(customers, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );

  return (
    <CustomersClient
      initialCustomers={serializedCustomers}
      initialStats={stats}
    />
  );
}
