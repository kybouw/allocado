import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
