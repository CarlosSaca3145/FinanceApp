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
    this.token = opts.token;
    this.databaseId = opts.databaseId;
    this.titleProperty = opts.titleProperty || "Name";
    this.dateProperty = opts.dateProperty || "Date";
    this.statusProperty = opts.statusProperty || "Status";
    this.nicheProperty = opts.nicheProperty || "Niche";
  }

  private async queryDatabase(startCursor?: string): Promise<any> {
    const body: Record<string, any> = {
      sorts: [{ property: this.dateProperty, direction: "ascending" }],
      filter: {
        property: this.statusProperty,
        select: { does_not_equal: "Published" },
      },
    };
    if (startCursor) body.start_cursor = startCursor;

    const res = await fetch(
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

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API error: ${res.status} — ${err}`);
    }
    return res.json();
  }

  /**
   * Fetches all upcoming (non-Published) videos from the Notion database.
   */
  async getUpcomingVideos(): Promise<NotionVideoData[]> {
    const videos: NotionVideoData[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const data = await this.queryDatabase(cursor);
      for (const page of data.results || []) {
        const props: Record<string, NotionPropertyValue> = page.properties || {};
        const title = extractText(props[this.titleProperty]);
        if (!title) continue;

        const statusRaw = extractText(props[this.statusProperty]) || "Planned";
        // Check if there's a "Sponsorship Available" checkbox; default to true
        const sponsorshipAvailable = extractCheckbox(props["Sponsorship Available"]);

        videos.push({
          notionPageId: page.id,
          title,
          nicho: extractText(props[this.nicheProperty]) || null,
          targetDate: extractDate(props[this.dateProperty]),
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
