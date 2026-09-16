import { 
  type User, 
  type InsertUser, 
  type Brand, 
  type InsertBrand,
  type ContentTemplate,
  type InsertContentTemplate,
  type FollowupTemplate,
  type InsertFollowupTemplate,
  type EmailLog,
  type InsertEmailLog,
  type YoutubeVideo,
  type NotionUpcomingVideo,
  type IntegrationsConfig,
  users,
  brands,
  contentTemplates,
  followupTemplates,
  emailLogs,
  youtubeVideos,
  notionUpcomingVideos,
  integrationsConfig,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc, sql, isNotNull } from "drizzle-orm";

// Minimal type for YouTube video data coming from the service
import type { YouTubeVideoData } from "./services/youtube";
import type { NotionVideoData } from "./services/notion";


export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: any): Promise<User>;

  // Brands
  getBrands(userId: string): Promise<Brand[]>;
  getBrand(id: string, userId: string): Promise<Brand | undefined>;
  createBrand(userId: string, brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, userId: string, brand: Partial<Brand>): Promise<Brand | undefined>;
  deleteBrand(id: string, userId: string): Promise<boolean>;
  createManyBrands(userId: string, brands: InsertBrand[]): Promise<Brand[]>;
  getUniqueNiches(userId: string): Promise<string[]>;
  renameNiche(userId: string, oldNiche: string, newNiche: string): Promise<void>;

  // Content Templates
  getContentTemplates(userId: string): Promise<ContentTemplate[]>;
  getContentTemplateByNiche(userId: string, nicho: string): Promise<ContentTemplate | undefined>;
  createContentTemplate(userId: string, template: InsertContentTemplate): Promise<ContentTemplate>;
  updateContentTemplate(id: string, userId: string, template: Partial<ContentTemplate>): Promise<ContentTemplate | undefined>;
  deleteContentTemplate(id: string, userId: string): Promise<boolean>;
  upsertContentTemplateByNiche(userId: string, nicho: string, template: Partial<InsertContentTemplate>): Promise<ContentTemplate>;

  // Followup Templates
  getFollowupTemplates(userId: string): Promise<FollowupTemplate[]>;
  getFollowupTemplate(id: string, userId: string): Promise<FollowupTemplate | undefined>;
  createFollowupTemplate(userId: string, template: InsertFollowupTemplate): Promise<FollowupTemplate>;
  updateFollowupTemplate(id: string, userId: string, template: Partial<FollowupTemplate>): Promise<FollowupTemplate | undefined>;
  deleteFollowupTemplate(id: string, userId: string): Promise<boolean>;

  // Email Logs
  getEmailLogs(userId: string): Promise<EmailLog[]>;
  createEmailLog(userId: string, log: InsertEmailLog & { id?: string }): Promise<EmailLog>;
  registerEmailOpen(logId: string): Promise<void>;

  // YouTube Videos
  getYoutubeVideos(userId: string, filters?: { niche?: string; isShort?: boolean }): Promise<YoutubeVideo[]>;
  upsertYoutubeVideo(userId: string, video: YouTubeVideoData): Promise<YoutubeVideo>;

  // Notion Upcoming Videos
  getNotionVideos(userId: string): Promise<NotionUpcomingVideo[]>;
  getNotionVideo(userId: string, id: string): Promise<NotionUpcomingVideo | undefined>;
  upsertNotionVideo(userId: string, video: NotionVideoData): Promise<NotionUpcomingVideo>;
  clearNotionVideos(userId: string): Promise<void>;

  // Integrations Config
  getIntegrationsConfig(userId: string): Promise<IntegrationsConfig | undefined>;
  upsertIntegrationsConfig(userId: string, config: Partial<IntegrationsConfig>): Promise<IntegrationsConfig>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private brands: Map<string, Brand>;
  private contentTemplates: Map<string, ContentTemplate>;
  private followupTemplates: Map<string, FollowupTemplate>;
  private emailLogs: Map<string, EmailLog>;

  constructor() {
    this.users = new Map();
    this.brands = new Map();
    this.contentTemplates = new Map();
    this.followupTemplates = new Map();
    this.emailLogs = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: any): Promise<User> {
    const id = userData.id || randomUUID();
    const user: User = {
      id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Brands
  async getBrands(userId: string): Promise<Brand[]> {
    return Array.from(this.brands.values())
      .filter((b) => b.userId === userId)
      .sort((a, b) => a.marca.localeCompare(b.marca));
  }

  async getBrand(id: string, userId: string): Promise<Brand | undefined> {
    const brand = this.brands.get(id);
    return brand && brand.userId === userId ? brand : undefined;
  }

  async createBrand(userId: string, insertBrand: InsertBrand): Promise<Brand> {
    const id = randomUUID();
    const brand: Brand = { 
      ...insertBrand, 
      id,
      userId,
      createdAt: new Date(),
      contacto: insertBrand.contacto ?? null,
      contactos: insertBrand.contactos ?? null,
      correos: insertBrand.correos ?? null,
      campania: insertBrand.campania ?? null,
      estado: insertBrand.estado ?? null,
      fechaEnvio: insertBrand.fechaEnvio ?? null,
      seguimientoModelo: insertBrand.seguimientoModelo ?? null,
      notes: insertBrand.notes ?? null
    };
    this.brands.set(id, brand);
    return brand;
  }

  async updateBrand(id: string, userId: string, brandUpdate: Partial<Brand>): Promise<Brand | undefined> {
    const existing = await this.getBrand(id, userId);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...brandUpdate };
    this.brands.set(id, updated);
    return updated;
  }

  async deleteBrand(id: string, userId: string): Promise<boolean> {
    const existing = await this.getBrand(id, userId);
    if (!existing) return false;
    return this.brands.delete(id);
  }

  async createManyBrands(userId: string, insertBrands: InsertBrand[]): Promise<Brand[]> {
    const createdBrands: Brand[] = [];
    for (const insertBrand of insertBrands) {
      const brand = await this.createBrand(userId, insertBrand);
      createdBrands.push(brand);
    }
    return createdBrands;
  }

  async getUniqueNiches(userId: string): Promise<string[]> {
    const userBrands = await this.getBrands(userId);
    const userTemplates = await this.getContentTemplates(userId);
    const niches = new Set<string>();
    
    userBrands.forEach(brand => {
      if (brand.nicho && brand.nicho.trim() !== '') {
        niches.add(brand.nicho.trim());
      }
    });

    userTemplates.forEach(template => {
      if (template.nicho && template.nicho.trim() !== '') {
        niches.add(template.nicho.trim());
      }
    });
    
    return Array.from(niches).sort();
  }

  async renameNiche(userId: string, oldNiche: string, newNiche: string): Promise<void> {
    const trimmedOld = oldNiche.trim();
    const trimmedNew = newNiche.trim();
    
    this.brands.forEach((brand, id) => {
      if (brand.userId === userId && brand.nicho === trimmedOld) {
        this.brands.set(id, { ...brand, nicho: trimmedNew });
      }
    });
    
    this.contentTemplates.forEach((template, id) => {
      if (template.userId === userId && template.nicho === trimmedOld) {
        this.contentTemplates.set(id, { ...template, nicho: trimmedNew });
      }
    });
  }

  // Content Templates
  async getContentTemplates(userId: string): Promise<ContentTemplate[]> {
    return Array.from(this.contentTemplates.values()).filter((t) => t.userId === userId);
  }

  async getContentTemplateByNiche(userId: string, nicho: string): Promise<ContentTemplate | undefined> {
    return Array.from(this.contentTemplates.values()).find(
      template => template.userId === userId && template.nicho.toLowerCase() === nicho.toLowerCase()
    );
  }

  async createContentTemplate(userId: string, insertTemplate: InsertContentTemplate): Promise<ContentTemplate> {
    const id = randomUUID();
    const template: ContentTemplate = {
      ...insertTemplate,
      id,
      userId,
      idea: insertTemplate.idea ?? null,
      videoLinks: insertTemplate.videoLinks ?? null,
      videoTitles: insertTemplate.videoTitles ?? null,
      videoIdeas: insertTemplate.videoIdeas ?? null,
      videoViews: insertTemplate.videoViews ?? null,
      fullTemplate: insertTemplate.fullTemplate ?? null,
      originalIdea: insertTemplate.originalIdea ?? null,
      proposedIdea: insertTemplate.proposedIdea ?? null,
      views: insertTemplate.views ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contentTemplates.set(id, template);
    return template;
  }

  async updateContentTemplate(id: string, userId: string, templateUpdate: Partial<ContentTemplate>): Promise<ContentTemplate | undefined> {
    const existing = Array.from(this.contentTemplates.values()).find(
      (t) => t.id === id && t.userId === userId
    );
    if (!existing) return undefined;
    
    const updated = { ...existing, ...templateUpdate, updatedAt: new Date() };
    this.contentTemplates.set(id, updated);
    return updated;
  }

  async deleteContentTemplate(id: string, userId: string): Promise<boolean> {
    const existing = Array.from(this.contentTemplates.values()).find(
      (t) => t.id === id && t.userId === userId
    );
    if (!existing) return false;
    return this.contentTemplates.delete(id);
  }

  async upsertContentTemplateByNiche(userId: string, nicho: string, templateUpdate: Partial<InsertContentTemplate>): Promise<ContentTemplate> {
    const existing = await this.getContentTemplateByNiche(userId, nicho);
    
    if (existing) {
      // Merge video links (dedupe)
      const mergedVideoLinks = existing.videoLinks || [];
      if (templateUpdate.videoLinks) {
        for (const link of templateUpdate.videoLinks) {
          if (!mergedVideoLinks.includes(link)) {
            mergedVideoLinks.push(link);
          }
        }
      }
      
      const mergedVideoIdeas = existing.videoIdeas || [];
      const mergedVideoViews = existing.videoViews || [];
      
      const updated = await this.updateContentTemplate(existing.id, userId, {
        ...templateUpdate,
        videoLinks: mergedVideoLinks,
        videoIdeas: mergedVideoIdeas,
        videoViews: mergedVideoViews
      });
      return updated!;
    } else {
      return await this.createContentTemplate(userId, {
        nicho,
        contenido: templateUpdate.contenido || `Content for ${nicho}`,
        idea: templateUpdate.idea,
        videoLinks: templateUpdate.videoLinks
      });
    }
  }

  // Followup Templates
  async getFollowupTemplates(userId: string): Promise<FollowupTemplate[]> {
    return Array.from(this.followupTemplates.values()).filter((t) => t.userId === userId);
  }

  async getFollowupTemplate(id: string, userId: string): Promise<FollowupTemplate | undefined> {
    const template = this.followupTemplates.get(id);
    return template && template.userId === userId ? template : undefined;
  }

  async createFollowupTemplate(userId: string, insertTemplate: InsertFollowupTemplate): Promise<FollowupTemplate> {
    const id = randomUUID();
    const template: FollowupTemplate = {
      ...insertTemplate,
      id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.followupTemplates.set(id, template);
    return template;
  }

  async updateFollowupTemplate(id: string, userId: string, templateUpdate: Partial<FollowupTemplate>): Promise<FollowupTemplate | undefined> {
    const existing = await this.getFollowupTemplate(id, userId);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...templateUpdate, updatedAt: new Date() };
    this.followupTemplates.set(id, updated);
    return updated;
  }

  async deleteFollowupTemplate(id: string, userId: string): Promise<boolean> {
    const existing = await this.getFollowupTemplate(id, userId);
    if (!existing) return false;
    return this.followupTemplates.delete(id);
  }

  // Email Logs
  async getEmailLogs(userId: string): Promise<EmailLog[]> {
    return Array.from(this.emailLogs.values())
      .filter((l) => l.userId === userId)
      .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
  }

  async createEmailLog(userId: string, insertLog: InsertEmailLog & { id?: string }): Promise<EmailLog> {
    const id = insertLog.id || randomUUID();
    const log: EmailLog = {
      ...insertLog,
      id,
      userId,
      sentAt: new Date(),
      error: insertLog.error ?? null,
      brandId: insertLog.brandId ?? null,
      opened: false,
      openedAt: null,
      openCount: 0,
      lastOpenedAt: null,
    };
    this.emailLogs.set(id, log);
    return log;
  }

  async registerEmailOpen(logId: string): Promise<void> {
    const log = this.emailLogs.get(logId);
    if (!log) return;
    
    const now = new Date();
    this.emailLogs.set(logId, {
      ...log,
      opened: true,
      openCount: (log.openCount || 0) + 1,
      openedAt: log.openedAt || now,
      lastOpenedAt: now
    });
    
    if (log.brandId) {
      const brand = this.brands.get(log.brandId);
      if (brand && brand.estado !== "Responded") {
        this.brands.set(log.brandId, {
          ...brand,
          estado: "👀 Abierto"
        });
      }
    }
  }

  // MemStorage stubs for new integration methods (not used in production)
  async getYoutubeVideos(_userId: string, _filters?: any): Promise<YoutubeVideo[]> { return []; }
  async upsertYoutubeVideo(_userId: string, _video: YouTubeVideoData): Promise<YoutubeVideo> { throw new Error("Not implemented in MemStorage"); }
  async getNotionVideos(_userId: string): Promise<NotionUpcomingVideo[]> { return []; }
  async getNotionVideo(_userId: string, _id: string): Promise<NotionUpcomingVideo | undefined> { return undefined; }
  async upsertNotionVideo(_userId: string, _video: NotionVideoData): Promise<NotionUpcomingVideo> { return {} as NotionUpcomingVideo; }
  async clearNotionVideos(_userId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getIntegrationsConfig(_userId: string): Promise<IntegrationsConfig | undefined> { return undefined; }
  async upsertIntegrationsConfig(_userId: string, config: Partial<IntegrationsConfig>): Promise<IntegrationsConfig> { throw new Error("Not implemented in MemStorage"); }
}

// Database Storage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    this.db = drizzle(pool);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: any): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Brands
  async getBrands(userId: string): Promise<Brand[]> {
    const result = await this.db.select().from(brands).where(eq(brands.userId, userId)).orderBy(brands.marca);
    return result;
  }

  async getBrand(id: string, userId: string): Promise<Brand | undefined> {
    const result = await this.db.select().from(brands).where(sql`${brands.id} = ${id} AND ${brands.userId} = ${userId}`);
    return result[0];
  }

  async createBrand(userId: string, insertBrand: InsertBrand): Promise<Brand> {
    const result = await this.db.insert(brands).values({ ...insertBrand, userId }).returning();
    return result[0];
  }

  async updateBrand(id: string, userId: string, brandUpdate: Partial<Brand>): Promise<Brand | undefined> {
    const result = await this.db
      .update(brands)
      .set(brandUpdate)
      .where(sql`${brands.id} = ${id} AND ${brands.userId} = ${userId}`)
      .returning();
    return result[0];
  }

  async deleteBrand(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(brands).where(sql`${brands.id} = ${id} AND ${brands.userId} = ${userId}`);
    return result.rowCount! > 0;
  }

  async createManyBrands(userId: string, insertBrands: InsertBrand[]): Promise<Brand[]> {
    if (insertBrands.length === 0) return [];
    const values = insertBrands.map(b => ({ ...b, userId }));
    const result = await this.db.insert(brands).values(values).returning();
    return result;
  }

  async getUniqueNiches(userId: string): Promise<string[]> {
    try {
      const brandNichesResult = await this.db
        .selectDistinct({ nicho: brands.nicho })
        .from(brands)
        .where(sql`${brands.userId} = ${userId} AND ${brands.nicho} IS NOT NULL`);
        
      const templateNichesResult = await this.db
        .selectDistinct({ nicho: contentTemplates.nicho })
        .from(contentTemplates)
        .where(sql`${contentTemplates.userId} = ${userId} AND ${contentTemplates.nicho} IS NOT NULL`);
        
      const nichesSet = new Set<string>();
      brandNichesResult.forEach(row => {
        if (row.nicho && row.nicho.trim()) {
          nichesSet.add(row.nicho.trim());
        }
      });
      templateNichesResult.forEach(row => {
        if (row.nicho && row.nicho.trim()) {
          nichesSet.add(row.nicho.trim());
        }
      });
      
      return Array.from(nichesSet).sort();
    } catch (error) {
      console.error('Error fetching unique niches:', error);
      throw error;
    }
  }

  async renameNiche(userId: string, oldNiche: string, newNiche: string): Promise<void> {
    const trimmedOld = oldNiche.trim();
    const trimmedNew = newNiche.trim();
    
    await this.db
      .update(brands)
      .set({ nicho: trimmedNew })
      .where(sql`${brands.userId} = ${userId} AND ${brands.nicho} = ${trimmedOld}`);

    await this.db
      .update(contentTemplates)
      .set({ nicho: trimmedNew })
      .where(sql`${contentTemplates.userId} = ${userId} AND ${contentTemplates.nicho} = ${trimmedOld}`);
  }

  // Content Templates
  async getContentTemplates(userId: string): Promise<ContentTemplate[]> {
    const result = await this.db.select().from(contentTemplates).where(eq(contentTemplates.userId, userId));
    return result;
  }

  async getContentTemplateByNiche(userId: string, nicho: string): Promise<ContentTemplate | undefined> {
    const result = await this.db
      .select()
      .from(contentTemplates)
      .where(sql`${contentTemplates.userId} = ${userId} AND lower(${contentTemplates.nicho}) = lower(${nicho})`);
    return result[0];
  }

  async createContentTemplate(userId: string, insertTemplate: InsertContentTemplate): Promise<ContentTemplate> {
    const result = await this.db.insert(contentTemplates).values({ ...insertTemplate, userId }).returning();
    return result[0];
  }

  async updateContentTemplate(id: string, userId: string, templateUpdate: Partial<ContentTemplate>): Promise<ContentTemplate | undefined> {
    const updateData = { ...templateUpdate, updatedAt: new Date() };
    const result = await this.db
      .update(contentTemplates)
      .set(updateData)
      .where(sql`${contentTemplates.id} = ${id} AND ${contentTemplates.userId} = ${userId}`)
      .returning();
    return result[0];
  }

  async deleteContentTemplate(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(contentTemplates).where(sql`${contentTemplates.id} = ${id} AND ${contentTemplates.userId} = ${userId}`);
    return result.rowCount! > 0;
  }

  async upsertContentTemplateByNiche(userId: string, nicho: string, templateUpdate: Partial<InsertContentTemplate>): Promise<ContentTemplate> {
    const existing = await this.getContentTemplateByNiche(userId, nicho);
    
    if (existing) {
      // Merge video links (dedupe)
      const mergedVideoLinks = existing.videoLinks || [];
      if (templateUpdate.videoLinks) {
        for (const link of templateUpdate.videoLinks) {
          if (!mergedVideoLinks.includes(link)) {
            mergedVideoLinks.push(link);
          }
        }
      }
      
      const mergedVideoIdeas = existing.videoIdeas || [];
      const mergedVideoViews = existing.videoViews || [];
      
      const updated = await this.updateContentTemplate(existing.id, userId, {
        ...templateUpdate,
        videoLinks: mergedVideoLinks,
        videoIdeas: mergedVideoIdeas,
        videoViews: mergedVideoViews
      });
      return updated!;
    } else {
      const result = await this.db.insert(contentTemplates).values({
        userId,
        nicho,
        contenido: templateUpdate.contenido || `Content for ${nicho}`,
        idea: templateUpdate.idea,
        videoLinks: templateUpdate.videoLinks
      }).returning();
      return result[0];
    }
  }

  // Followup Templates
  async getFollowupTemplates(userId: string): Promise<FollowupTemplate[]> {
    const result = await this.db.select().from(followupTemplates).where(eq(followupTemplates.userId, userId));
    return result;
  }

  async getFollowupTemplate(id: string, userId: string): Promise<FollowupTemplate | undefined> {
    const result = await this.db.select().from(followupTemplates).where(sql`${followupTemplates.id} = ${id} AND ${followupTemplates.userId} = ${userId}`);
    return result[0];
  }

  async createFollowupTemplate(userId: string, insertTemplate: InsertFollowupTemplate): Promise<FollowupTemplate> {
    const result = await this.db.insert(followupTemplates).values({ ...insertTemplate, userId }).returning();
    return result[0];
  }

  async updateFollowupTemplate(id: string, userId: string, templateUpdate: Partial<FollowupTemplate>): Promise<FollowupTemplate | undefined> {
    const updateData = { ...templateUpdate, updatedAt: new Date() };
    const result = await this.db
      .update(followupTemplates)
      .set(updateData)
      .where(sql`${followupTemplates.id} = ${id} AND ${followupTemplates.userId} = ${userId}`)
      .returning();
    return result[0];
  }

  async deleteFollowupTemplate(id: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(followupTemplates).where(sql`${followupTemplates.id} = ${id} AND ${followupTemplates.userId} = ${userId}`);
    return result.rowCount! > 0;
  }

  // Email Logs
  async getEmailLogs(userId: string): Promise<EmailLog[]> {
    const result = await this.db.select().from(emailLogs).where(eq(emailLogs.userId, userId)).orderBy(desc(emailLogs.sentAt));
    return result;
  }

  async createEmailLog(userId: string, insertLog: InsertEmailLog & { id?: string }): Promise<EmailLog> {
    const result = await this.db.insert(emailLogs).values({ ...insertLog, userId }).returning();
    return result[0];
  }

  async registerEmailOpen(logId: string): Promise<void> {
    const now = new Date();
    
    // 1. Get the email log to find the brand ID
    const log = await this.db.select().from(emailLogs).where(eq(emailLogs.id, logId)).then(res => res[0]);
    if (!log) return;
    
    // 2. Update the email log tracking fields
    await this.db
      .update(emailLogs)
      .set({
        opened: true,
        openCount: sql`${emailLogs.openCount} + 1`,
        openedAt: sql`COALESCE(${emailLogs.openedAt}, ${now})`,
        lastOpenedAt: now
      })
      .where(eq(emailLogs.id, logId));
      
    // 3. Update the brand status to "👀 Abierto" (Opened) if the brand isn't already "Responded"
    if (log.brandId) {
      const brand = await this.db.select().from(brands).where(eq(brands.id, log.brandId)).then(res => res[0]);
      if (brand && brand.estado !== "Responded") {
        await this.db
          .update(brands)
          .set({ estado: "👀 Abierto" })
          .where(eq(brands.id, log.brandId));
      }
    }
  }

  // ─── YouTube Videos ──────────────────────────────────────────────────────────
  async getYoutubeVideos(userId: string, filters?: { niche?: string; isShort?: boolean }): Promise<YoutubeVideo[]> {
    let query = this.db.select().from(youtubeVideos).where(eq(youtubeVideos.userId, userId));
    const results = await query.orderBy(desc(youtubeVideos.viewCount));
    return results.filter(v => {
      if (filters?.isShort !== undefined && v.isShort !== filters.isShort) return false;
      if (filters?.niche && v.nicho && !v.nicho.toLowerCase().includes(filters.niche.toLowerCase())) return false;
      return true;
    });
  }

  async upsertYoutubeVideo(userId: string, video: YouTubeVideoData): Promise<YoutubeVideo> {
    const [result] = await this.db
      .insert(youtubeVideos)
      .values({
        userId,
        youtubeId: video.youtubeId,
        title: video.title,
        url: video.url,
        thumbnailUrl: video.thumbnailUrl,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        duration: video.duration,
        isShort: video.isShort,
        tags: video.tags,
        publishedAt: video.publishedAt,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [youtubeVideos.userId, youtubeVideos.youtubeId],
        set: {
          title: video.title,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          thumbnailUrl: video.thumbnailUrl,
          tags: video.tags,
          syncedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // ─── Notion Upcoming Videos ──────────────────────────────────────────────────
  async getNotionVideos(userId: string): Promise<NotionUpcomingVideo[]> {
    return this.db
      .select()
      .from(notionUpcomingVideos)
      .where(eq(notionUpcomingVideos.userId, userId))
      .orderBy(notionUpcomingVideos.targetDate);
  }

  async getNotionVideo(userId: string, id: string): Promise<NotionUpcomingVideo | undefined> {
    const result = await this.db
      .select()
      .from(notionUpcomingVideos)
      .where(sql`${notionUpcomingVideos.id} = ${id} AND ${notionUpcomingVideos.userId} = ${userId}`);
    return result[0];
  }

  async upsertNotionVideo(userId: string, video: NotionVideoData): Promise<NotionUpcomingVideo> {
    const [result] = await this.db
      .insert(notionUpcomingVideos)
      .values({
        userId,
        notionPageId: video.notionPageId,
        title: video.title,
        nicho: video.nicho,
        targetDate: video.targetDate,
        sponsorshipAvailable: video.sponsorshipAvailable,
        status: video.status,
        notionUrl: video.notionUrl,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [notionUpcomingVideos.userId, notionUpcomingVideos.notionPageId],
        set: {
          title: video.title,
          nicho: video.nicho,
          targetDate: video.targetDate,
          sponsorshipAvailable: video.sponsorshipAvailable,
          status: video.status,
          notionUrl: video.notionUrl,
          syncedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async clearNotionVideos(userId: string): Promise<void> {
    await this.db.delete(notionUpcomingVideos).where(eq(notionUpcomingVideos.userId, userId));
  }

  // ─── Integrations Config ─────────────────────────────────────────────────────
  async getIntegrationsConfig(userId: string): Promise<IntegrationsConfig | undefined> {
    const result = await this.db
      .select()
      .from(integrationsConfig)
      .where(eq(integrationsConfig.userId, userId));
    return result[0];
  }

  async upsertIntegrationsConfig(userId: string, config: Partial<IntegrationsConfig>): Promise<IntegrationsConfig> {
    const existing = await this.getIntegrationsConfig(userId);
    if (existing) {
      // Only update fields that are provided (don't overwrite masked "••••••••••" values)
      const updateData: Partial<IntegrationsConfig> = { updatedAt: new Date() };
      if (config.youtubeApiKey && config.youtubeApiKey !== "••••••••••") updateData.youtubeApiKey = config.youtubeApiKey;
      if (config.youtubeChannelId) updateData.youtubeChannelId = config.youtubeChannelId;
      if (config.notionToken && config.notionToken !== "••••••••••") updateData.notionToken = config.notionToken;
      if (config.notionDatabaseId) updateData.notionDatabaseId = config.notionDatabaseId;
      if (config.notionTitleProperty) updateData.notionTitleProperty = config.notionTitleProperty;
      if (config.notionDateProperty) updateData.notionDateProperty = config.notionDateProperty;
      if (config.notionStatusProperty) updateData.notionStatusProperty = config.notionStatusProperty;
      if (config.notionNicheProperty) updateData.notionNicheProperty = config.notionNicheProperty;

      const [result] = await this.db
        .update(integrationsConfig)
        .set(updateData)
        .where(eq(integrationsConfig.userId, userId))
        .returning();
      return result;
    } else {
      const [result] = await this.db
        .insert(integrationsConfig)
        .values({ ...config, userId, updatedAt: new Date() })
        .returning();
      return result;
    }
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
