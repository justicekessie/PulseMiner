/**
 * Facebook Page Comments Collector — Ghana News Pages
 *
 * Fetches recent posts and public comments from Ghanaian news Facebook pages
 * using the official Facebook Graph API.
 *
 * ⚠️  REQUIRES: Facebook App with `pages_read_engagement` permission (App Review needed).
 *    Set FACEBOOK_PAGE_ACCESS_TOKEN in .env after approval.
 *
 * Without an approved token this collector is a no-op (returns 0).
 *
 * Why not scrape directly?
 *   PulseMiner follows ethics-first principles. Direct scraping of Facebook
 *   violates their Terms of Service. We only collect data through official,
 *   approved API channels.
 */

import { prisma } from '@pulseminer/database';

const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

// ─── Ghana news Facebook page IDs ───────────────────────────────────────────

interface GhanaFacebookPage {
  name: string;
  /** Facebook Page ID or username — use numeric ID when known for stability */
  pageId: string;
}

const GHANA_FACEBOOK_PAGES: GhanaFacebookPage[] = [
  { name: 'JoyNews', pageId: 'JoyNewsOnTV' },
  { name: 'Citi FM', pageId: 'CitiFMOnline' },
  { name: 'GhanaWeb', pageId: 'gaborone.ghanaweb' },
  { name: 'Graphic Online', pageId: 'GraphicOnlineGhana' },
  { name: 'MyJoyOnline', pageId: 'MyJoyOnline' },
  { name: 'Peace FM', pageId: 'peacefmonline' },
  { name: '3News Ghana', pageId: '3aboroneonline' },
  { name: 'TV3 Ghana', pageId: 'TV3Ghana' },
  { name: 'Starr FM', pageId: 'StarrFMOnline' },
  { name: 'Adom FM', pageId: 'AdomFM' },
];

// ─── Region detection ────────────────────────────────────────────────────────

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

// ─── Graph API helpers ───────────────────────────────────────────────────────

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
}

interface FacebookComment {
  id: string;
  message: string;
  created_time: string;
}

async function fetchPagePosts(pageId: string, limit = 5): Promise<FacebookPost[]> {
  const since = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);
  const url = `${GRAPH_API_BASE}/${pageId}/posts?fields=id,message,created_time&limit=${limit}&since=${since}&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[facebook] Posts API error for ${pageId}: ${res.status} — ${body.slice(0, 200)}`);
    return [];
  }

  const data = (await res.json()) as { data?: FacebookPost[] };
  return data.data ?? [];
}

async function fetchPostComments(postId: string, limit = 25): Promise<FacebookComment[]> {
  const url = `${GRAPH_API_BASE}/${postId}/comments?fields=id,message,created_time&limit=${limit}&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[facebook] Comments API error for post ${postId}: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as { data?: FacebookComment[] };
  return data.data ?? [];
}

// ─── Main collector ──────────────────────────────────────────────────────────

export async function runFacebookCollector(): Promise<number> {
  if (!FACEBOOK_PAGE_ACCESS_TOKEN) {
    // No token configured — skip silently
    // To enable: get a Facebook App approved with pages_read_engagement permission,
    // generate a Page Access Token, and set FACEBOOK_PAGE_ACCESS_TOKEN in .env
    return 0;
  }

  console.log(`[facebook] Fetching comments from ${GHANA_FACEBOOK_PAGES.length} Ghana news pages…`);

  let created = 0;
  let skipped = 0;

  for (const page of GHANA_FACEBOOK_PAGES) {
    let posts: FacebookPost[];
    try {
      posts = await fetchPagePosts(page.pageId);
    } catch (err) {
      console.warn(`[facebook] Failed to fetch posts for ${page.name}:`, (err as Error).message);
      continue;
    }

    for (const post of posts) {
      let comments: FacebookComment[];
      try {
        comments = await fetchPostComments(post.id);
      } catch (err) {
        console.warn(`[facebook] Failed to fetch comments for post ${post.id}:`, (err as Error).message);
        continue;
      }

      // Context from the original post (for region detection)
      const postContext = post.message ?? '';

      for (const comment of comments) {
        const textContent = comment.message?.trim();
        if (!textContent || textContent.length < 10) continue;

        // Deduplicate by facebook comment ID
        const existing = await prisma.sourceEvent.findFirst({
          where: {
            source_name: `facebook:${page.name}`,
            metadata: { path: ['comment_id'], equals: comment.id },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        const region = detectRegion(textContent + ' ' + postContext);

        await prisma.sourceEvent.create({
          data: {
            source_type: 'public_comment',
            source_name: `facebook:${page.name}`,
            text_content: textContent,
            language: 'en',
            timestamp: new Date(comment.created_time),
            region,
            country: 'GH',
            metadata: {
              comment_id: comment.id,
              post_id: post.id,
              post_message: postContext.slice(0, 200),
              collector: 'facebook-comments',
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
    console.log(`[facebook] Ingested ${created} new comments (${skipped} duplicates skipped)`);
  } else {
    console.log('[facebook] No new comments found in this cycle');
  }

  return created;
}
