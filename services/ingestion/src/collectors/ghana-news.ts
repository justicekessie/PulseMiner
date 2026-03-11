/**
 * Ghana News Portal RSS Collector
 *
 * Scrapes publicly available RSS feeds from major Ghanaian news portals.
 * RSS feeds are offered by these sites for public syndication — no API key needed.
 *
 * Source allowlist (ethical, public RSS feeds only):
 *   - MyJoyOnline, Citi Newsroom, GhanaWeb, Graphic Online,
 *     Modern Ghana, 3News, Peace FM Online, Ghana News Agency,
 *     Starr FM, Daily Guide
 */

import { prisma } from '@pulseminer/database';
import Parser from 'rss-parser';

// ─── Ghana news RSS feed definitions ────────────────────────────────────────

interface GhanaNewsFeed {
  name: string;
  url: string;
  /** Optional region hint — if the outlet strongly represents a region */
  regionHint?: string;
}

const GHANA_RSS_FEEDS: GhanaNewsFeed[] = [
  {
    name: 'MyJoyOnline',
    url: 'https://www.myjoyonline.com/feed/',
  },
  {
    name: 'Citi Newsroom',
    url: 'https://citinewsroom.com/feed/',
  },
  {
    name: 'GhanaWeb',
    url: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.xml',
  },
  {
    name: 'Graphic Online',
    url: 'https://www.graphic.com.gh/feed',
  },
  {
    name: 'Modern Ghana',
    url: 'https://www.modernghana.com/rss/',
  },
  {
    name: '3News',
    url: 'https://3news.com/feed/',
  },
  {
    name: 'Peace FM Online',
    url: 'https://www.peacefmonline.com/rss/rss.xml',
  },
  {
    name: 'Ghana News Agency',
    url: 'https://gna.org.gh/feed/',
  },
  {
    name: 'Starr FM',
    url: 'https://starrfm.com.gh/feed/',
  },
  {
    name: 'Daily Guide',
    url: 'https://dailyguidenetwork.com/feed/',
  },
];

// ─── Region detection from article text ──────────────────────────────────────

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
      if (lower.includes(keyword)) {
        return regionId;
      }
    }
  }
  return undefined;
}

// ─── Main collector ──────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 15_000;

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    'User-Agent': 'PulseMiner/0.1 (civic-intelligence; +https://github.com/justicekessie/PulseMiner)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
});

interface FeedItem {
  title?: string;
  contentSnippet?: string;
  content?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  categories?: string[];
}

async function fetchFeed(feed: GhanaNewsFeed): Promise<FeedItem[]> {
  try {
    const result = await parser.parseURL(feed.url);
    return result.items ?? [];
  } catch (err) {
    console.warn(`[ghana-news] Failed to fetch ${feed.name} (${feed.url}):`, (err as Error).message);
    return [];
  }
}

export async function runGhanaNewsCollector(): Promise<number> {
  console.log(`[ghana-news] Fetching RSS feeds from ${GHANA_RSS_FEEDS.length} Ghana news portals…`);

  // Fetch all feeds concurrently
  const feedResults = await Promise.allSettled(
    GHANA_RSS_FEEDS.map(async (feed) => ({
      feed,
      items: await fetchFeed(feed),
    }))
  );

  let created = 0;
  let skipped = 0;

  for (const result of feedResults) {
    if (result.status === 'rejected') continue;

    const { feed, items } = result.value;

    for (const item of items) {
      const title = item.title?.trim();
      if (!title) continue;

      // Build text content from title + snippet/content
      const description = item.contentSnippet?.trim() || item.content?.trim() || '';
      const textContent = [title, description].filter(Boolean).join('\n');

      // Parse timestamp — fall back to now if missing
      const publishedAt = item.isoDate || item.pubDate;
      const timestamp = publishedAt ? new Date(publishedAt) : new Date();

      // Skip articles older than 48 hours to keep data fresh
      const ageMs = Date.now() - timestamp.getTime();
      if (ageMs > 48 * 60 * 60 * 1000) continue;

      // Deduplicate by source + title prefix
      const existing = await prisma.sourceEvent.findFirst({
        where: {
          source_name: feed.name,
          text_content: { contains: title.slice(0, 80) },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Detect region from content
      const region = feed.regionHint || detectRegion(textContent);

      await prisma.sourceEvent.create({
        data: {
          source_type: 'news_article',
          source_name: feed.name,
          text_content: textContent,
          language: 'en',
          timestamp,
          region,
          country: 'GH',
          metadata: {
            url: item.link ?? null,
            categories: item.categories ?? [],
            collector: 'ghana-news-rss',
          },
          consent_type: 'public',
          privacy_level: 'public',
          processed: false,
        },
      });

      created++;
    }
  }

  if (created > 0 || skipped > 0) {
    console.log(`[ghana-news] Ingested ${created} new articles (${skipped} duplicates skipped)`);
  } else {
    console.log('[ghana-news] No new articles found in this cycle');
  }

  return created;
}
