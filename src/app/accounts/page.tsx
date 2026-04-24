import { auth } from "@clerk/nextjs/server";
import { db } from "@allocado/db";
import { accounts } from "@allocado/db/schema";
import { eq } from "drizzle-orm";

export default async function Accounts() {
  const { userId } = await auth();
  const rows = userId
    ? await db.select().from(accounts).where(eq(accounts.userId, userId))
    : [];

  return <pre>{JSON.stringify(rows, null, 2)}</pre>;
}
