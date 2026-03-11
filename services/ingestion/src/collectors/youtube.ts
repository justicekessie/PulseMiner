/**
 * YouTube Comments Collector — Ghana News Channels
 *
 * Fetches recent videos and public comments from Ghanaian news channels
 * using the official YouTube Data API v3.
 *
 * Requires: YOUTUBE_API_KEY env var (free tier: 10,000 quota units/day)
 *
 * Quota cost per cycle (approximate):
 *   - search.list: 100 units per channel
 *   - commentThreads.list: 1 unit per page
 *   ~1,100 units per full cycle (10 channels × ~10 videos × 1 comment page)
 */

import { prisma } from '@pulseminer/database';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ─── Ghana news YouTube channel IDs ─────────────────────────────────────────

interface GhanaYouTubeChannel {
  name: string;
  channelId: string;
}

const GHANA_YOUTUBE_CHANNELS: GhanaYouTubeChannel[] = [
  { name: 'JoyNews', channelId: 'UCMHbSm9RFfFKVq0Ld7pY4WQ' },
  { name: 'Citi TV', channelId: 'UCmlEgBNI5tc84mE-wig0RBg' },
  { name: 'TV3 Ghana', channelId: 'UCcE3cseyFYVCfmc_GnnYmqg' },
  { name: 'UTV Ghana', channelId: 'UC3LWJwlLkuQYH-k0jKHmQjQ' },
  { name: 'GhanaWeb TV', channelId: 'UCPkaNoMA-ZXePaO_6-MhJ5g' },
  { name: 'Graphic Online TV', channelId: 'UCXK7ywkT4HLMx_ffv9sCpg' },
  { name: 'Peace FM', channelId: 'UCNk0S6O_hHAqPNHiRhIX2Dg' },
  { name: 'Starr FM', channelId: 'UC2rKBDAaEGXg8aH4x7JxEhQ' },
  { name: 'Adom TV', channelId: 'UCUxWkSOihHLuN2dxmAKfLYA' },
  { name: 'Angel TV Ghana', channelId: 'UCGQop8CyPw0JqyFwNJDUh5Q' },
];

// ─── Region detection (reused from ghana-news collector) ─────────────────────

const REGION_KEYWORDS: Record<string, string[]> = {
  'greater-accra': ['accra', 'tema', 'madina', 'east legon', 'cantonments', 'osu'],
  'ashanti': ['kumasi', 'ashanti', 'knust', 'kejetia', 'manhyia', 'obuasi'],
  'western': ['takoradi', 'sekondi', 'tarkwa', 'western region'],
  'western-north': ['sefwi', 'wiawso', 'bibiani'],
  'eastern': ['koforidua', 'eastern region', 'nkawkaw', 'akosombo'],
  'central': ['cape coast', 'central region', 'winneba', 'elmina'],
  'volta': ['ho ', 'volta region', 'hohoe', 'keta', 'kpando'],
  'oti': ['dambai', 'oti region', 'nkwanta'],
  'bono': ['sunyani', 'bono region', 'dormaa'],
  'bono-east': ['techiman', 'bono east', 'atebubu', 'kintampo'],
  'ahafo': ['goaso', 'ahafo region', 'bechem'],
  'northern': ['tamale', 'northern region', 'yendi', 'sagnarigu'],
  'savannah': ['damango', 'savannah region', 'salaga', 'bole'],
  'north-east': ['nalerigu', 'north east region', 'gambaga', 'walewale'],
  'upper-east': ['bolgatanga', 'upper east', 'navrongo', 'bawku'],
  'upper-west': ['wa ', 'upper west', 'lawra', 'nandom', 'jirapa'],
};

function detectRegion(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [regionId, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return regionId;
    }
  }
  return undefined;
}

// ─── YouTube API helpers ─────────────────────────────────────────────────────

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    publishedAt: string;
    channelTitle: string;
  };
}

interface YouTubeComment {
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        textDisplay: string;
        textOriginal: string;
        authorDisplayName: string;
        publishedAt: string;
        likeCount: number;
        videoId: string;
      };
    };
  };
}

async function fetchRecentVideos(channelId: string, maxResults = 5): Promise<YouTubeSearchItem[]> {
  const url = new URL(`${YOUTUBE_API_BASE}/search`);
  url.searchParams.set('key', YOUTUBE_API_KEY!);
  url.searchParams.set('channelId', channelId);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('order', 'date');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(maxResults));

  // Only fetch videos from the last 48 hours
  const publishedAfter = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  url.searchParams.set('publishedAfter', publishedAfter);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[youtube] Search API error for channel ${channelId}: ${res.status} — ${body.slice(0, 200)}`);
    return [];
  }

  const data = (await res.json()) as { items?: YouTubeSearchItem[] };
  return data.items ?? [];
}

async function fetchVideoComments(videoId: string, maxResults = 20): Promise<YouTubeComment[]> {
  const url = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
  url.searchParams.set('key', YOUTUBE_API_KEY!);
  url.searchParams.set('videoId', videoId);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('textFormat', 'plainText');

  const res = await fetch(url.toString());
  if (!res.ok) {
    // Comments may be disabled on some videos — that's fine
    if (res.status === 403) return [];
    console.warn(`[youtube] Comments API error for video ${videoId}: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as { items?: YouTubeComment[] };
  return data.items ?? [];
}

// ─── Main collector ──────────────────────────────────────────────────────────

export async function runYouTubeCollector(): Promise<number> {
  if (!YOUTUBE_API_KEY) {
    // No key configured — skip silently
    return 0;
  }

  console.log(`[youtube] Fetching comments from ${GHANA_YOUTUBE_CHANNELS.length} Ghana news channels…`);

  let created = 0;
  let skipped = 0;

  for (const channel of GHANA_YOUTUBE_CHANNELS) {
    let videos: YouTubeSearchItem[];
    try {
      videos = await fetchRecentVideos(channel.channelId);
    } catch (err) {
      console.warn(`[youtube] Failed to fetch videos for ${channel.name}:`, (err as Error).message);
      continue;
    }

    for (const video of videos) {
      const videoId = video.id.videoId;
      const videoTitle = video.snippet.title;

      let comments: YouTubeComment[];
      try {
        comments = await fetchVideoComments(videoId);
      } catch (err) {
        console.warn(`[youtube] Failed to fetch comments for ${videoId}:`, (err as Error).message);
        continue;
      }

      for (const commentThread of comments) {
        const comment = commentThread.snippet.topLevelComment.snippet;
        const textContent = comment.textOriginal?.trim() || comment.textDisplay?.trim();
        if (!textContent || textContent.length < 10) continue;

        // Deduplicate by YouTube comment content prefix + source
        const existing = await prisma.sourceEvent.findFirst({
          where: {
            source_name: `youtube:${channel.name}`,
            text_content: { contains: textContent.slice(0, 80) },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const region = detectRegion(textContent + ' ' + videoTitle);

        await prisma.sourceEvent.create({
          data: {
            source_type: 'public_comment',
            source_name: `youtube:${channel.name}`,
            text_content: textContent,
            language: 'en',
            timestamp: new Date(comment.publishedAt),
            region,
            country: 'GH',
            metadata: {
              video_id: videoId,
              video_title: videoTitle,
              video_url: `https://www.youtube.com/watch?v=${videoId}`,
              like_count: comment.likeCount,
              collector: 'youtube-comments',
            },
            consent_type: 'public',
            privacy_level: 'public',
            processed: false,
          },
        });

        created++;
      }
    }
  }

  if (created > 0 || skipped > 0) {
    console.log(`[youtube] Ingested ${created} new comments (${skipped} duplicates skipped)`);
  } else {
    console.log('[youtube] No new comments found in this cycle');
  }

  return created;
}
