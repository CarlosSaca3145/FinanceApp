/**
 * Notion API Service
 * Reads the user's content calendar database to surface upcoming videos
 * available for sponsorship integration.
 */

export interface NotionVideoData {
  notionPageId: string;
  title: string;
  nicho: string | null;
  targetDate: Date | null;
  sponsorshipAvailable: boolean;
  status: string;
  notionUrl: string | null;
}

type NotionPropertyValue = {
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  date?: { start: string } | null;
  select?: { name: string } | null;
  status?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
  checkbox?: boolean;
  url?: string | null;
};

function extractText(prop: NotionPropertyValue | undefined): string {
  if (!prop) return "";
  if (prop.type === "title" && prop.title) {
    return prop.title.map(t => t.plain_text).join("");
  }
  if (prop.type === "rich_text" && prop.rich_text) {
    return prop.rich_text.map(t => t.plain_text).join("");
  }
  if (prop.type === "select" && prop.select) return prop.select.name;
  if (prop.type === "status" && prop.status) return prop.status.name;
  if (prop.type === "multi_select" && prop.multi_select) {
    return prop.multi_select.map(m => m.name).join(", ");
  }
  return "";
}

function extractDate(prop: NotionPropertyValue | undefined): Date | null {
  if (!prop || prop.type !== "date" || !prop.date) return null;
  const d = new Date(prop.date.start);
  return isNaN(d.getTime()) ? null : d;
}

function extractCheckbox(prop: NotionPropertyValue | undefined): boolean {
  if (!prop || prop.type !== "checkbox") return true; // default to available
  return prop.checkbox ?? true;
}

export function extractNotionDatabaseId(rawInput: string): string {
  if (!rawInput) return "";
  let cleaned = rawInput.trim();
  
  // Extract 32-character hex ID or UUID from Notion URL (e.g. .../Contenido-bffeb1a4b57441229de1d...)
  const hexMatch = cleaned.match(/([a-f0-9]{32})/i) || 
                   cleaned.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                   
  if (hexMatch) {
    return hexMatch[1].replace(/-/g, "");
  }
  
  return cleaned.replace(/-/g, "");
}

export class NotionService {
  private token: string;
  private databaseId: string;
  private titleProperty: string;
  private dateProperty: string;
  private statusProperty: string;
  private nicheProperty: string;

  constructor(opts: {
    token: string;
    databaseId: string;
    titleProperty?: string;
    dateProperty?: string;
    statusProperty?: string;
    nicheProperty?: string;
  }) {
    this.token = opts.token.trim();
    this.databaseId = extractNotionDatabaseId(opts.databaseId);
    this.titleProperty = opts.titleProperty || "Name";
    this.dateProperty = opts.dateProperty || "Date";
    this.statusProperty = opts.statusProperty || "Status";
    this.nicheProperty = opts.nicheProperty || "Niche";

    console.log(`[NOTION DEBUG] Service Initialized. Token snippet: ${this.token.slice(0, 7)}... | Original DB/Page ID input: "${opts.databaseId}" -> Extracted Database ID: "${this.databaseId}"`);
  }

  /**
   * Search Notion workspace for databases shared with this integration token.
   */
  private async searchAccessibleDatabase(): Promise<string | null> {
    console.log("[NOTION DEBUG] Searching accessible databases via Notion /v1/search API...");
    try {
      const res = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filter: { value: "database", property: "object" } }),
      });
      console.log(`[NOTION DEBUG] Search API status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`[NOTION DEBUG] Search API found ${data.results?.length || 0} database results.`);
        if (data.results && data.results.length > 0) {
          for (const db of data.results) {
            console.log(`[NOTION DEBUG] Found DB: "${db.title?.[0]?.plain_text || 'Untitled'}" ID: ${db.id}`);
          }
          const firstDb = data.results[0];
          console.log(`[NOTION DEBUG] Selected auto-discovered database "${firstDb.title?.[0]?.plain_text || 'Untitled'}" (${firstDb.id})`);
          return firstDb.id.replace(/-/g, "");
        }
      } else {
        const errText = await res.text();
        console.error(`[NOTION DEBUG] Search API failed with status ${res.status}: ${errText}`);
      }
    } catch (e) {
      console.error("[NOTION DEBUG] Auto-search databases error:", e);
    }
    return null;
  }

  /**
   * Inspect page children if input ID is a Page ID containing a child database.
   */
  private async findDatabaseFromPage(pageId: string): Promise<string | null> {
    console.log(`[NOTION DEBUG] Attempting to find child_database inside page ID: ${pageId}`);
    try {
      const formattedPageId = pageId.length === 32
        ? `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`
        : pageId;

      console.log(`[NOTION DEBUG] Fetching block children for: https://api.notion.com/v1/blocks/${formattedPageId}/children`);
      const res = await fetch(`https://api.notion.com/v1/blocks/${formattedPageId}/children`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Notion-Version": "2022-06-28",
        },
      });
      console.log(`[NOTION DEBUG] Blocks children API status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`[NOTION DEBUG] Block children count: ${data.results?.length || 0}`);
        const dbBlock = (data.results || []).find((b: any) => b.type === "child_database");
        if (dbBlock) {
          console.log(`[NOTION DEBUG] Found child_database block! ID: ${dbBlock.id}`);
          return dbBlock.id.replace(/-/g, "");
        } else {
          console.log("[NOTION DEBUG] No child_database block found among page children.");
        }
      } else {
        const errText = await res.text();
        console.error(`[NOTION DEBUG] Blocks children API failed (${res.status}): ${errText}`);
      }
    } catch (e) {
      console.error("[NOTION DEBUG] Error finding child_database in page:", e);
    }
    // Fallback to workspace database search
    console.log("[NOTION DEBUG] Falling back to searchAccessibleDatabase()...");
    return await this.searchAccessibleDatabase();
  }

  private async queryDatabaseRaw(body: Record<string, any>): Promise<any> {
    console.log(`[NOTION DEBUG] Querying database URL: https://api.notion.com/v1/databases/${this.databaseId}/query`);
    console.log(`[NOTION DEBUG] Query payload: ${JSON.stringify(body)}`);

    let res = await fetch(
      `https://api.notion.com/v1/databases/${this.databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    console.log(`[NOTION DEBUG] Query response status: ${res.status}`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[NOTION DEBUG] Query failed. Status: ${res.status}, Response: ${errText}`);
      if (res.status === 404 || res.status === 400 || errText.includes("is a page") || errText.includes("validation_error")) {
        console.warn(`[NOTION DEBUG] Direct DB query for ${this.databaseId} failed (${errText}). Finding database from page...`);
        const realDbId = await this.findDatabaseFromPage(this.databaseId);
        if (realDbId) {
          console.log(`[NOTION DEBUG] Retrying query with resolved Database ID: ${realDbId}`);
          this.databaseId = realDbId;
          res = await fetch(
            `https://api.notion.com/v1/databases/${this.databaseId}/query`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.token}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            }
          );
          console.log(`[NOTION DEBUG] Retry query response status: ${res.status}`);
        } else {
          console.error("[NOTION DEBUG] Could not resolve a real Database ID from page or search.");
        }
      }

      if (!res.ok) {
        const finalErr = await res.text();
        console.error(`[NOTION DEBUG] Final query attempt failed: ${finalErr}`);
        throw new Error(`Notion API error: ${res.status} — ${finalErr}`);
      }
    }

    return res.json();
  }

  private async queryDatabase(startCursor?: string): Promise<any> {
    // Query without strict filters to avoid 400 validation errors on status/select property types
    const body: Record<string, any> = {};
    if (startCursor) body.start_cursor = startCursor;
    return await this.queryDatabaseRaw(body);
  }

  /**
   * Fetches all upcoming videos from the Notion database.
   * Only includes videos with targetDate >= today (or no set date) and non-finished status.
   */
  async getUpcomingVideos(): Promise<NotionVideoData[]> {
    const videos: NotionVideoData[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    // Calculate start of today (midnight) for future/upcoming filtering
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    while (hasMore) {
      const data = await this.queryDatabase(cursor);
      for (const page of data.results || []) {
        const props: Record<string, NotionPropertyValue> = page.properties || {};
        
        // Find title property (by configured name or any 'title' type)
        let titleProp = props[this.titleProperty] || props["Name"] || props["Nombre"] || props["Título"] || props["Title"] || props["Contenido"];
        if (!titleProp) {
          titleProp = Object.values(props).find(p => p.type === "title") as NotionPropertyValue;
        }
        const title = extractText(titleProp);
        if (!title || !title.trim()) continue;

        // Find date property
        let dateProp = props[this.dateProperty] || props["Date"] || props["Fecha"] || props["Publicación"] || props["Target Date"];
        if (!dateProp) {
          dateProp = Object.values(props).find(p => p.type === "date") as NotionPropertyValue;
        }
        const targetDate = extractDate(dateProp);

        // Find status property
        let statusProp = props[this.statusProperty] || props["Status"] || props["Estado"] || props["Fase"] || props["Estado de producción"];
        if (!statusProp) {
          statusProp = Object.values(props).find(p => p.type === "status" || p.type === "select") as NotionPropertyValue;
        }
        const statusRaw = extractText(statusProp) || "Planned";

        // Filter out completed / published statuses
        const statusLower = statusRaw.toLowerCase();
        const isFinished = [
          "published", "publicado", "done", "completado", "finalizado", 
          "terminado", "archived", "archivado", "listo", "posted", 
          "subido", "youtube", "grabado", "editado", "released"
        ].some(s => statusLower.includes(s));

        if (isFinished) {
          console.log(`[NOTION DEBUG] Skipping published/completed video "${title}" (status: ${statusRaw})`);
          continue;
        }

        // Strict future date check: Skip any video whose targetDate is in the past (before start of today)
        if (targetDate && targetDate < startOfToday) {
          console.log(`[NOTION DEBUG] Skipping past video "${title}" (date: ${targetDate.toISOString().slice(0, 10)})`);
          continue;
        }

        // Find niche property
        let nicheProp = props[this.nicheProperty] || props["Niche"] || props["Nicho"] || props["Categoría"] || props["Tema"];
        if (!nicheProp) {
          nicheProp = Object.values(props).find(p => p.type === "select" || p.type === "multi_select") as NotionPropertyValue;
        }

        const sponsorshipAvailable = extractCheckbox(props["Sponsorship Available"] || props["Patrocinio Disponible"] || props["Patrocinio"]);

        videos.push({
          notionPageId: page.id,
          title,
          nicho: extractText(nicheProp) || null,
          targetDate,
          sponsorshipAvailable,
          status: statusRaw,
          notionUrl: page.url || null,
        });
      }

      hasMore = data.has_more;
      cursor = data.next_cursor ?? undefined;
    }

    console.log(`[NOTION DEBUG] Total upcoming future videos found: ${videos.length}`);
    return videos;
  }

  /**
   * Find the best upcoming video for a given brand niche.
   * Falls back to the next available video if no niche match.
   */
  static findBestUpcomingForNiche(
    videos: NotionVideoData[],
    niche: string
  ): NotionVideoData | null {
    const available = videos.filter(v => v.sponsorshipAvailable);
    if (available.length === 0) return null;

    const keywords = niche.toLowerCase().split(/[\s,/]+/).filter(Boolean);

    const score = (v: NotionVideoData) => {
      const titleLow = v.title.toLowerCase();
      const nichoLow = (v.nicho || "").toLowerCase();
      return keywords.reduce((acc, kw) => {
        if (titleLow.includes(kw)) acc += 3;
        if (nichoLow.includes(kw)) acc += 2;
        return acc;
      }, 0);
    };

    const scored = available
      .map(v => ({ v, s: score(v) }))
      .sort((a, b) => b.s - a.s || (a.v.targetDate?.getTime() ?? 0) - (b.v.targetDate?.getTime() ?? 0));

    return scored[0]?.v || available[0];
  }
}
