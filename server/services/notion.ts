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
  }

  /**
   * Search Notion workspace for databases shared with this integration token.
   */
  private async searchAccessibleDatabase(): Promise<string | null> {
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
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const firstDb = data.results[0];
          console.log(`[NOTION] Auto-discovered database "${firstDb.title?.[0]?.plain_text || 'Untitled'}" (${firstDb.id})`);
          return firstDb.id.replace(/-/g, "");
        }
      }
    } catch (e) {
      console.error("[NOTION] Auto-search databases error:", e);
    }
    return null;
  }

  private async queryDatabaseRaw(body: Record<string, any>): Promise<any> {
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

    // If 404, attempt auto-discovery of databases shared with the token
    if (!res.ok && res.status === 404) {
      console.warn(`[NOTION] Direct query for DB ID ${this.databaseId} returned 404. Attempting auto-discovery...`);
      const discoveredId = await this.searchAccessibleDatabase();
      if (discoveredId && discoveredId !== this.databaseId) {
        this.databaseId = discoveredId;
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
      }
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API error: ${res.status} — ${err}`);
    }
    return res.json();
  }

  private async queryDatabase(startCursor?: string): Promise<any> {
    // First try with strict filters
    try {
      const bodyWithFilters: Record<string, any> = {
        sorts: [{ property: this.dateProperty, direction: "ascending" }],
        filter: {
          property: this.statusProperty,
          select: { does_not_equal: "Published" },
        },
      };
      if (startCursor) bodyWithFilters.start_cursor = startCursor;
      return await this.queryDatabaseRaw(bodyWithFilters);
    } catch (err) {
      console.warn("[NOTION] Query with filters failed, retrying un-filtered query:", err);
      // Fallback: Query database without custom filters/sorts
      const fallbackBody: Record<string, any> = {};
      if (startCursor) fallbackBody.start_cursor = startCursor;
      return await this.queryDatabaseRaw(fallbackBody);
    }
  }

  /**
   * Fetches all upcoming videos from the Notion database.
   */
  async getUpcomingVideos(): Promise<NotionVideoData[]> {
    const videos: NotionVideoData[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const data = await this.queryDatabase(cursor);
      for (const page of data.results || []) {
        const props: Record<string, NotionPropertyValue> = page.properties || {};
        
        // Find title property (by configured name or any 'title' type)
        let titleProp = props[this.titleProperty] || props["Name"] || props["Nombre"] || props["Título"];
        if (!titleProp) {
          titleProp = Object.values(props).find(p => p.type === "title") as NotionPropertyValue;
        }
        const title = extractText(titleProp);
        if (!title) continue;

        // Find date property
        let dateProp = props[this.dateProperty] || props["Date"] || props["Fecha"] || props["Publicación"];
        if (!dateProp) {
          dateProp = Object.values(props).find(p => p.type === "date") as NotionPropertyValue;
        }

        // Find status property
        let statusProp = props[this.statusProperty] || props["Status"] || props["Estado"] || props["Fase"];
        if (!statusProp) {
          statusProp = Object.values(props).find(p => p.type === "status" || p.type === "select") as NotionPropertyValue;
        }
        const statusRaw = extractText(statusProp) || "Planned";

        // Find niche property
        let nicheProp = props[this.nicheProperty] || props["Niche"] || props["Nicho"] || props["Categoría"];
        if (!nicheProp) {
          nicheProp = Object.values(props).find(p => p.type === "select" || p.type === "multi_select") as NotionPropertyValue;
        }

        const sponsorshipAvailable = extractCheckbox(props["Sponsorship Available"] || props["Patrocinio Disponible"]);

        videos.push({
          notionPageId: page.id,
          title,
          nicho: extractText(nicheProp) || null,
          targetDate: extractDate(dateProp),
          sponsorshipAvailable,
          status: statusRaw,
          notionUrl: page.url || null,
        });
      }

      hasMore = data.has_more;
      cursor = data.next_cursor ?? undefined;
    }

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
