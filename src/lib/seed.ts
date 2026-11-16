import "dotenv/config";
import { db } from "./db";
import { serviceTypes, users, userRoles } from "./schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function seed() {
  const existing = await db.select().from(serviceTypes).limit(1);
  if (existing.length === 0) {
    await db.insert(serviceTypes).values([
      {
        id: randomUUID(),
        name: "Tattoo",
        description: "Custom tattoo session",
        defaultDepositPercentage: 30,
        defaultDurationMinutes: 120,
        basePrice: BigInt(5000),
      },
      {
        id: randomUUID(),
        name: "Commission Artwork",
        description: "Custom illustration or painting",
        defaultDepositPercentage: 30,
        defaultDurationMinutes: 60,
        basePrice: BigInt(10000),
      },
      {
        id: randomUUID(),
        name: "Cover Up",
        description: "Cover up an existing tattoo",
        defaultDepositPercentage: 30,
        defaultDurationMinutes: 180,
        basePrice: BigInt(8000),
      },
    ]);
    console.log("Seeded service types");
  }

  const existingUser = await db.select().from(users).limit(1);
  if (existingUser.length === 0) {
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      name: "Studio Artist",
      email: "artist@studio.com",
      emailVerified: true,
    });
    await db.insert(userRoles).values({
      id: randomUUID(),
      userId,
      role: "artist",
    });
    console.log("Seeded default artist user");
  } else {
    const userId = existingUser[0].id;
    const existingRole = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);
    if (existingRole.length === 0) {
      await db.insert(userRoles).values({
        id: randomUUID(),
        userId,
        role: "artist",
      });
      console.log("Seeded artist role for existing user");
    }
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
