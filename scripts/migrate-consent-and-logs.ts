import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

export async function runMigration() {
  console.log("Applying schema alignment migration to PostgreSQL...");

  // 1. Add missing columns to consent_records
  await db.execute(sql`
    ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
  `);
  console.log("✓ Added consent_records.status");

  await db.execute(sql`
    ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone;
  `);
  console.log("✓ Added consent_records.reminder_sent_at");

  await db.execute(sql`
    ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;
  `);
  console.log("✓ Added consent_records.reminder_count");

  // 2. Relax NOT NULL constraints on consent_records
  await db.execute(sql`
    ALTER TABLE consent_records ALTER COLUMN legal_name DROP NOT NULL;
    ALTER TABLE consent_records ALTER COLUMN date_of_birth DROP NOT NULL;
    ALTER TABLE consent_records ALTER COLUMN health_disclosures DROP NOT NULL;
    ALTER TABLE consent_records ALTER COLUMN signature_image_url DROP NOT NULL;
    ALTER TABLE consent_records ALTER COLUMN signed_at DROP NOT NULL;
  `);
  console.log("✓ Relaxed NOT NULL constraints on consent_records");

  // 3. Create index on consent_records.status
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS consent_records_status_idx ON consent_records (status);
  `);
  console.log("✓ Created consent_records_status_idx");

  // 4. Create integration_logs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS integration_logs (
      id text PRIMARY KEY NOT NULL,
      booking_id text REFERENCES bookings(id) ON DELETE CASCADE,
      provider text NOT NULL,
      action text NOT NULL,
      status text NOT NULL,
      payload jsonb,
      error_message text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  console.log("✓ Created integration_logs table");

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS integration_logs_booking_id_idx ON integration_logs (booking_id);
    CREATE INDEX IF NOT EXISTS integration_logs_provider_idx ON integration_logs (provider);
    CREATE INDEX IF NOT EXISTS integration_logs_status_idx ON integration_logs (status);
    CREATE INDEX IF NOT EXISTS integration_logs_created_at_idx ON integration_logs (created_at);
  `);
  console.log("✓ Created integration_logs indexes");

  console.log("Migration successfully applied!");
}

if ((import.meta as any).main) {
  runMigration()
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    })
    .finally(() => process.exit(0));
}
