import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, unique, integer, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (identical to ContaApp's users table to share the DB)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  marca: text("marca").notNull(),
  correo: text("correo").notNull(),
  correos: text("correos").array(), // Additional emails array
  contacto: text("contacto"),
  contactos: text("contactos").array(), // Additional contacts array
  nicho: text("nicho").notNull(),
  campania: text("campania"),
  estado: text("estado").default("Pending"),
  fechaEnvio: timestamp("fecha_envio"),
  seguimientoModelo: text("seguimiento_modelo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const contentTemplates = pgTable("content_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  nicho: text("nicho").notNull(),
  contenido: text("contenido").notNull(),
  idea: text("idea"),
  videoLinks: text("video_links").array(),
  videoTitles: text("video_titles").array(), // Titles for each video link
  videoIdeas: text("video_ideas").array(), // Ideas for each video link
  videoViews: text("video_views").array(), // Views for each video link
  fullTemplate: text("full_template"), // Complete template from Excel
  originalIdea: text("original_idea"), // Extracted original idea
  proposedIdea: text("proposed_idea"), // Extracted proposed idea
  views: text("views"), // Video views metrics
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => [
  unique("user_nicho_unique").on(table.userId, table.nicho)
]);

export const followupTemplates = pgTable("followup_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  template: text("template").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  brandId: varchar("brand_id").references(() => brands.id, { onDelete: 'cascade' }),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  status: text("status").notNull(), // sent, failed, pending
  sentAt: timestamp("sent_at").default(sql`now()`),
  error: text("error"),
  opened: boolean("opened").default(false),
  openedAt: timestamp("opened_at"),
  openCount: integer("open_count").default(0),
  lastOpenedAt: timestamp("last_opened_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertContentTemplateSchema = createInsertSchema(contentTemplates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFollowupTemplateSchema = createInsertSchema(followupTemplates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  userId: true,
  sentAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brands.$inferSelect;

export type InsertContentTemplate = z.infer<typeof insertContentTemplateSchema>;
export type ContentTemplate = typeof contentTemplates.$inferSelect;

export type InsertFollowupTemplate = z.infer<typeof insertFollowupTemplateSchema>;
export type FollowupTemplate = typeof followupTemplates.$inferSelect;

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// ─── YouTube Videos (synced from YouTube Data API v3) ────────────────────────
export const youtubeVideos = pgTable("youtube_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  youtubeId: varchar("youtube_id").notNull(),       // YouTube video ID
  title: text("title").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  viewCount: bigint("view_count", { mode: "number" }).default(0),
  likeCount: bigint("like_count", { mode: "number" }).default(0),
  commentCount: bigint("comment_count", { mode: "number" }).default(0),
  duration: text("duration"),                        // ISO 8601 duration, e.g. PT5M30S
  isShort: boolean("is_short").default(false),       // true = Shorts/vertical (<= 60s)
  nicho: text("nicho"),                              // AI-detected niche / category
  tags: text("tags").array(),                        // YouTube tags
  publishedAt: timestamp("published_at"),
  syncedAt: timestamp("synced_at").default(sql`now()`),
}, (table) => [
  unique("user_youtube_id_unique").on(table.userId, table.youtubeId),
]);

export const insertYoutubeVideoSchema = createInsertSchema(youtubeVideos).omit({
  id: true,
  userId: true,
  syncedAt: true,
});

export type InsertYoutubeVideo = z.infer<typeof insertYoutubeVideoSchema>;
export type YoutubeVideo = typeof youtubeVideos.$inferSelect;

// ─── Notion Upcoming Videos (content calendar) ────────────────────────────────
export const notionUpcomingVideos = pgTable("notion_upcoming_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  notionPageId: varchar("notion_page_id").notNull(),
  title: text("title").notNull(),
  nicho: text("nicho"),
  targetDate: timestamp("target_date"),              // Estimated publish date
  sponsorshipAvailable: boolean("sponsorship_available").default(true),
  status: text("status").default("Planned"),        // Planned, Recording, Editing, Published
  notionUrl: text("notion_url"),
  syncedAt: timestamp("synced_at").default(sql`now()`),
}, (table) => [
  unique("user_notion_page_unique").on(table.userId, table.notionPageId),
]);

export const insertNotionUpcomingVideoSchema = createInsertSchema(notionUpcomingVideos).omit({
  id: true,
  userId: true,
  syncedAt: true,
});

export type InsertNotionUpcomingVideo = z.infer<typeof insertNotionUpcomingVideoSchema>;
export type NotionUpcomingVideo = typeof notionUpcomingVideos.$inferSelect;

// ─── Integrations Config (API credentials per user) ───────────────────────────
export const integrationsConfig = pgTable("integrations_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  youtubeApiKey: text("youtube_api_key"),
  youtubeChannelId: text("youtube_channel_id"),
  notionToken: text("notion_token"),
  notionDatabaseId: text("notion_database_id"),
  notionTitleProperty: text("notion_title_property").default("Name"),    // Notion property name for video title
  notionDateProperty: text("notion_date_property").default("Date"),       // Notion property name for target date
  notionStatusProperty: text("notion_status_property").default("Status"), // Notion property name for status
  notionNicheProperty: text("notion_niche_property").default("Niche"),   // Notion property name for niche
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertIntegrationsConfigSchema = createInsertSchema(integrationsConfig).omit({
  id: true,
  userId: true,
  updatedAt: true,
});

export type InsertIntegrationsConfig = z.infer<typeof insertIntegrationsConfigSchema>;
export type IntegrationsConfig = typeof integrationsConfig.$inferSelect;
