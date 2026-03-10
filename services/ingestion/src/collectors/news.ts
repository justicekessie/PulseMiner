/**
 * News collector — fetches public news headlines from Ghana news sources.
 * Uses NewsAPI when a key is configured, otherwise returns 0 (no-op).
 *
 * Source allowlist: myjoyonline.com, citinewsroom.com, ghanaweb.com, pulse.com.gh
 */

import { prisma } from '@pulseminer/database';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GHANA_NEWS_SOURCES = [
  'myjoyonline.com',
  'citinewsroom.com',
  'ghanaweb.com',
  'pulse.com.gh',
  'graphic.com.gh',
];

interface NewsArticle {
  title: string;
  description?: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

export async function runNewsCollector(): Promise<number> {
  if (!NEWS_API_KEY) {
    // No key configured — skip silently
    return 0;
  }

  let articles: NewsArticle[] = [];

  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', 'Ghana');
    url.searchParams.set('language', 'en');
    url.searchParams.set('pageSize', '20');
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('domains', GHANA_NEWS_SOURCES.join(','));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${NEWS_API_KEY}` },
    });

    if (!res.ok) {
      console.warn(`[news] NewsAPI returned ${res.status}`);
      return 0;
    }

    const data = (await res.json()) as { articles: NewsArticle[] };
    articles = data.articles ?? [];
  } catch (err) {
    console.error('[news] Fetch error:', err);
    return 0;
  }

  let created = 0;

  for (const article of articles) {
    const textContent = [article.title, article.description].filter(Boolean).join('\n');
    if (!textContent.trim()) continue;

    // Deduplicate by source + title (no exact duplicate storage)
    const existing = await prisma.sourceEvent.findFirst({
      where: {
        source_name: article.source.name,
        text_content: { contains: article.title.slice(0, 80) },
      },
    });
    if (existing) continue;

    await prisma.sourceEvent.create({
      data: {
        source_type: 'news_article',
        source_name: article.source.name,
        text_content: textContent,
        language: 'en',
        timestamp: new Date(article.publishedAt),
        country: 'GH',
        metadata: { url: article.url },
        consent_type: 'public',
        privacy_level: 'public',
        processed: false,
      },
    });

    created++;
  }

  if (created > 0) {
    console.log(`[news] Ingested ${created} new articles`);
  }

  return created;
}
