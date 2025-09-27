import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  uuid,
  pgEnum,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("viewer"), // release_manager, team_lead, poc, viewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Release Plans (iPlan)
export const releasePlans = pgTable("release_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  status: varchar("status").notNull().default("planning"), // planning, active, completed, cancelled
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Release Steps
export const releaseSteps = pgTable("release_steps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  releasePlanId: uuid("release_plan_id").notNull().references(() => releasePlans.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // before_release, actual_release, post_release
  status: varchar("status").notNull().default("not_started"), // not_started, started, in_progress, completed
  order: integer("order").notNull().default(0),
  
  // Assignment
  teamLeadId: varchar("team_lead_id").references(() => users.id),
  primaryPocId: varchar("primary_poc_id").references(() => users.id),
  backupPocId: varchar("backup_poc_id").references(() => users.id),
  
  // Scheduling
  schedulingType: varchar("scheduling_type").notNull().default("manual"), // fixed_time, after_step, simultaneous
  scheduledTime: timestamp("scheduled_time"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  dependsOnStepId: uuid("depends_on_step_id").references(() => releaseSteps.id),
  simultaneousWithStepId: uuid("simultaneous_with_step_id").references(() => releaseSteps.id),
  
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Step History
export const stepHistory = pgTable("step_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stepId: uuid("step_id").notNull().references(() => releaseSteps.id, { onDelete: "cascade" }),
  previousStatus: varchar("previous_status"),
  newStatus: varchar("new_status").notNull(),
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global Settings
export const globalSettings = pgTable("global_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shareable Dashboard Links
export const shareableLinks = pgTable("shareable_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  releasePlanId: uuid("release_plan_id").notNull().references(() => releasePlans.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdReleasePlans: many(releasePlans),
  leadSteps: many(releaseSteps, { relationName: "teamLead" }),
  primaryPocSteps: many(releaseSteps, { relationName: "primaryPoc" }),
  backupPocSteps: many(releaseSteps, { relationName: "backupPoc" }),
  stepHistories: many(stepHistory),
  shareableLinks: many(shareableLinks),
}));

export const releasePlansRelations = relations(releasePlans, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [releasePlans.createdBy],
    references: [users.id],
  }),
  steps: many(releaseSteps),
  shareableLinks: many(shareableLinks),
}));

export const releaseStepsRelations = relations(releaseSteps, ({ one, many }) => ({
  releasePlan: one(releasePlans, {
    fields: [releaseSteps.releasePlanId],
    references: [releasePlans.id],
  }),
  teamLead: one(users, {
    fields: [releaseSteps.teamLeadId],
    references: [users.id],
    relationName: "teamLead",
  }),
  primaryPoc: one(users, {
    fields: [releaseSteps.primaryPocId],
    references: [users.id],
    relationName: "primaryPoc",
  }),
  backupPoc: one(users, {
    fields: [releaseSteps.backupPocId],
    references: [users.id],
    relationName: "backupPoc",
  }),
  dependsOnStep: one(releaseSteps, {
    fields: [releaseSteps.dependsOnStepId],
    references: [releaseSteps.id],
    relationName: "dependency",
  }),
  dependentSteps: many(releaseSteps, { relationName: "dependency" }),
  simultaneousWithStep: one(releaseSteps, {
    fields: [releaseSteps.simultaneousWithStepId],
    references: [releaseSteps.id],
    relationName: "simultaneous",
  }),
  simultaneousSteps: many(releaseSteps, { relationName: "simultaneous" }),
  history: many(stepHistory),
}));

export const stepHistoryRelations = relations(stepHistory, ({ one }) => ({
  step: one(releaseSteps, {
    fields: [stepHistory.stepId],
    references: [releaseSteps.id],
  }),
  changedBy: one(users, {
    fields: [stepHistory.changedBy],
    references: [users.id],
  }),
}));

export const shareableLinksRelations = relations(shareableLinks, ({ one }) => ({
  releasePlan: one(releasePlans, {
    fields: [shareableLinks.releasePlanId],
    references: [releasePlans.id],
  }),
  createdBy: one(users, {
    fields: [shareableLinks.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const insertReleasePlanSchema = createInsertSchema(releasePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReleaseStepSchema = createInsertSchema(releaseSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertStepHistorySchema = createInsertSchema(stepHistory).omit({
  id: true,
  createdAt: true,
});

export const insertGlobalSettingSchema = createInsertSchema(globalSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertShareableLinkSchema = createInsertSchema(shareableLinks).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ReleasePlan = typeof releasePlans.$inferSelect;
export type InsertReleasePlan = z.infer<typeof insertReleasePlanSchema>;
export type ReleaseStep = typeof releaseSteps.$inferSelect;
export type InsertReleaseStep = z.infer<typeof insertReleaseStepSchema>;
export type StepHistory = typeof stepHistory.$inferSelect;
export type InsertStepHistory = z.infer<typeof insertStepHistorySchema>;
export type GlobalSetting = typeof globalSettings.$inferSelect;
export type InsertGlobalSetting = z.infer<typeof insertGlobalSettingSchema>;
export type ShareableLink = typeof shareableLinks.$inferSelect;
export type InsertShareableLink = z.infer<typeof insertShareableLinkSchema>;
