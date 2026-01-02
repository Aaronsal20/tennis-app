import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  password: text("password"),
  phone: text("phone"),
  role: text("role").default("user").notNull(), // 'admin' or 'user'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  location: text("location"),
  status: text("status").default("ongoing").notNull(), // 'upcoming', 'ongoing', 'completed'
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
  round: text("round").default("group"), // 'group', 'semi-final', 'final'
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

export const courtSlots = pgTable("court_slots", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id),
  courtName: text("court_name").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isBooked: boolean("is_booked").default(false),
  isActive: boolean("is_active").default(true).notNull(),
  bookedBy: integer("booked_by").references(() => users.id),
  categoryId: integer("category_id").references(() => categories.id),
  opponentId: integer("opponent_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// export const courtBookings = pgTable("court_bookings", {
//   id: serial("id").primaryKey(),
//   courtId: integer("court_id").references(() => courts.id),
//   userId: integer("user_id").references(() => users.id),
//   date: timestamp("date").notNull(),
//   startTime: text("start_time").notNull(),
//   endTime: text("end_time").notNull(),
//   isBooked: boolean("is_booked").default(false).notNull(),
//   createdAt: timestamp("created_at").defaultNow(),
// });

export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  categories: many(categories),
  courtSlots: many(courtSlots),
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

export const courtSlotsRelations = relations(courtSlots, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [courtSlots.tournamentId],
    references: [tournaments.id],
  }),
  bookedByUser: one(users, {
    fields: [courtSlots.bookedBy],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [courtSlots.categoryId],
    references: [categories.id],
  }),
  opponent: one(users, {
    fields: [courtSlots.opponentId],
    references: [users.id],
  }),
}));

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'registration', 'booking'
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  data: text("data"), // JSON string for extra data
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  participants: many(participants),
  courtSlots: many(courtSlots),
  notifications: many(notifications),
}));
