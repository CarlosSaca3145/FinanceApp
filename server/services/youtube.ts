/**
 * YouTube Data API v3 Service
 * Fetches channel videos with real metrics and classifies them by format and niche.
 */

export interface YouTubeVideoData {
  youtubeId: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string | null;
  isShort: boolean;
  tags: string[];
  publishedAt: Date | null;
}

/**
 * Converts ISO 8601 duration (e.g. PT5M30S) to total seconds.
 */
function parseDurationSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const hours = parseInt(m[1] || "0");
  const minutes = parseInt(m[2] || "0");
  const seconds = parseInt(m[3] || "0");
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats large numbers for display (e.g. 1234567 -> "1.2M", 234567 -> "234K")
 */
export function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return count.toString();
}

export class YouTubeService {
  private apiKey: string;
  private channelId: string;

  constructor(apiKey: string, channelId: string) {
    this.apiKey = apiKey;
    this.channelId = channelId;
  }

  /**
   * Fetches the upload playlist ID for the channel.
   */
  private async getUploadsPlaylistId(): Promise<string> {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${this.channelId}&key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube Channels API error: ${res.status} — ${err}`);
    }
    const data = await res.json() as any;
    const playlistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) throw new Error("Could not find uploads playlist for this channel.");
    return playlistId;
  }

  /**
   * Fetches all video IDs from the uploads playlist (max 200 via pagination).
   */
  private async getVideoIds(playlistId: string, maxResults = 200): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
      const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&key=${this.apiKey}${pageParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`YouTube PlaylistItems API error: ${res.status}`);
      const data = await res.json() as any;

      for (const item of data.items || []) {
        const vid = item.contentDetails?.videoId;
        if (vid) ids.push(vid);
      }

      pageToken = data.nextPageToken;
    } while (pageToken && ids.length < maxResults);

    return ids.slice(0, maxResults);
  }

  /**
   * Fetches detailed stats for up to 50 video IDs per call.
   */
  private async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoData[]> {
    const chunks: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }

    const results: YouTubeVideoData[] = [];

    for (const chunk of chunks) {
      const idsParam = chunk.join(",");
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${idsParam}&key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`YouTube Videos API error: ${res.status}`);
      const data = await res.json() as any;

      for (const item of data.items || []) {
        const stats = item.statistics || {};
        const snippet = item.snippet || {};
        const contentDetails = item.contentDetails || {};

        const durationSecs = parseDurationSeconds(contentDetails.duration || "");
        const isShort = durationSecs > 0 && durationSecs <= 60;

        results.push({
          youtubeId: item.id,
          title: snippet.title || "",
          url: `https://www.youtube.com/watch?v=${item.id}`,
          thumbnailUrl:
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            null,
          viewCount: parseInt(stats.viewCount || "0"),
          likeCount: parseInt(stats.likeCount || "0"),
          commentCount: parseInt(stats.commentCount || "0"),
          duration: contentDetails.duration || null,
          isShort,
          tags: snippet.tags || [],
          publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
        });
      }
    }

    return results;
  }

  /**
   * Main sync method: fetches all channel videos with full metrics.
   */
  async syncChannelVideos(): Promise<YouTubeVideoData[]> {
    const playlistId = await this.getUploadsPlaylistId();
    const videoIds = await this.getVideoIds(playlistId);
    if (videoIds.length === 0) return [];
    const videos = await this.getVideoDetails(videoIds);
    // Sort by views descending
    return videos.sort((a, b) => b.viewCount - a.viewCount);
  }

  /**
   * Returns the best-matching video for a given niche (fuzzy keyword match on title + tags).
   * Prefers the highest-view video. Optionally filter by isShort.
   */
  static findBestMatchForNiche(
    videos: YouTubeVideoData[],
    niche: string,
    preferShort?: boolean
  ): YouTubeVideoData | null {
    const keywords = niche.toLowerCase().split(/[\s,/]+/).filter(Boolean);

    // Scoring function: sum keyword matches in title and tags
    const score = (v: YouTubeVideoData) => {
      const titleLow = v.title.toLowerCase();
      const tagsLow = (v.tags || []).join(" ").toLowerCase();
      return keywords.reduce((acc, kw) => {
        if (titleLow.includes(kw)) acc += 3;
        if (tagsLow.includes(kw)) acc += 1;
        return acc;
      }, 0);
    };

    let candidates = videos.filter(v =>
      preferShort !== undefined ? v.isShort === preferShort : true
    );

    // Sort by score desc, then viewCount desc
    candidates = candidates
      .map(v => ({ v, s: score(v) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s || b.v.viewCount - a.v.viewCount)
      .map(({ v }) => v);

    // Fallback: if no match, return top viewed video of correct format
    if (candidates.length === 0) {
      const fallback = videos
        .filter(v => preferShort !== undefined ? v.isShort === preferShort : true)
        .sort((a, b) => b.viewCount - a.viewCount);
      return fallback[0] || null;
    }

    return candidates[0];
  }
}
