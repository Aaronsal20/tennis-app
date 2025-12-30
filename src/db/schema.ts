import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").default("user").notNull(), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id),
  name: text("name").notNull(), // e.g., "Men's Singles", "40+ Men"
  type: text("type"), // 'singles' or 'doubles'
  format: text("format"), // 'mini-set', 'full-set'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  userId: integer("user_id").references(() => users.id),
  partnerId: integer("partner_id").references(() => users.id), // Optional, for doubles
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  participant1Id: integer("participant1_id").references(() => participants.id),
  participant2Id: integer("participant2_id").references(() => participants.id),
  date: timestamp("date"),
  status: text("status").default("pending"), // 'pending', 'completed'
  set1Player1: integer("set1_p1"),
  set1Player2: integer("set1_p2"),
  set1TiebreakPlayer1: integer("set1_tb_p1"),
  set1TiebreakPlayer2: integer("set1_tb_p2"),
  set2Player1: integer("set2_p1"),
  set2Player2: integer("set2_p2"),
  set2TiebreakPlayer1: integer("set2_tb_p1"),
  set2TiebreakPlayer2: integer("set2_tb_p2"),
  set3Player1: integer("set3_p1"),
  set3Player2: integer("set3_p2"),
  set3TiebreakPlayer1: integer("set3_tb_p1"),
  set3TiebreakPlayer2: integer("set3_tb_p2"),
  winnerId: integer("winner_id").references(() => participants.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  categories: many(categories),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [categories.tournamentId],
    references: [tournaments.id],
  }),
  participants: many(participants),
  matches: many(matches),
}));

export const participantsRelations = relations(participants, ({ one }) => ({
  category: one(categories, {
    fields: [participants.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [participants.userId],
    references: [users.id],
  }),
  partner: one(users, {
    fields: [participants.partnerId],
    references: [users.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  category: one(categories, {
    fields: [matches.categoryId],
    references: [categories.id],
  }),
  participant1: one(participants, {
    fields: [matches.participant1Id],
    references: [participants.id],
    relationName: "participant1",
  }),
  participant2: one(participants, {
    fields: [matches.participant2Id],
    references: [participants.id],
    relationName: "participant2",
  }),
}));
