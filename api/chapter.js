// api/chapter.js — Vercel Serverless Function
// Serves ONE chapter's paragraphs at a time.
// Content lives in api/_data.js (private module, never served as a URL).
// Rate-limited: 60 requests per 5 minutes per IP.

const CONTENT = require('./_data.js');

const rateMap = new Map();
const RATE_LIMIT = 60;       // max requests
const RATE_WINDOW = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  // CORS — same origin only (no CDN scraping)
  const origin = req.headers['origin'] || '';
  const host = req.headers['host'] || '';
  const isAllowed = !origin || origin.includes('lookataslam') || origin.includes('localhost') || origin.includes('vercel.app');

  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').split(',')[0].trim();
  const now = Date.now();
  const history = (rateMap.get(ip) || []).filter(t => now - t < RATE_WINDOW);

  if (history.length >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Take a break.' });
  }
  history.push(now);
  rateMap.set(ip, history);

  // Parse params
  const novelKey = String(req.query.novel || 'jalwa').replace(/[^a-z0-9_]/gi, '');
  const chIdx    = parseInt(req.query.ch ?? '0', 10);

  const novelContent = CONTENT[novelKey];
  if (!novelContent) {
    return res.status(404).json({ error: 'Novel not found.' });
  }
  if (isNaN(chIdx) || chIdx < 0 || chIdx >= novelContent.length) {
    return res.status(404).json({ error: 'Chapter not found.' });
  }

  // Security check: unreleased volume scheduling & launch day access
  const LAUNCH_DATE_MS = new Date('2026-12-10T18:00:00+05:30').getTime();
  const LAUNCH_DAY_24H_END = LAUNCH_DATE_MS + (24 * 60 * 60 * 1000); // 24 hours on launch day

  if (novelKey === 'jalwa_v2') {
    // Before launch date: strictly locked
    if (now < LAUNCH_DATE_MS) {
      return res.status(403).json({
        error: 'Volume 2 officially releases December 10, 2026 at 6:00 PM IST.',
        releaseDate: '2026-12-10T18:00:00+05:30'
      });
    }

    // Chapter 11 (chIdx 0): Free for 24 hours on launch day
    const isWithin24Hours = (now >= LAUNCH_DATE_MS && now <= LAUNCH_DAY_24H_END);
    if (chIdx === 0 && !isWithin24Hours) {
      // After the first 24 hours, Chapter 11 becomes part of the complete bundle
      const isBundleUnlocked = req.headers['x-bundle-token'] || req.query.unlocked === 'true';
      if (!isBundleUnlocked) {
        return res.status(402).json({
          error: 'The 24-hour launch day free reading period for Chapter 11 has ended. It is now part of the complete Volume 2 bundle.',
          bundleRequired: true
        });
      }
    } else if (chIdx > 0) {
      // Chapters 12-20 are part of the complete paid bundle
      const isBundleUnlocked = req.headers['x-bundle-token'] || req.query.unlocked === 'true';
      if (!isBundleUnlocked) {
        return res.status(402).json({
          error: 'This chapter is part of the complete Volume 2 paid bundle.',
          bundleRequired: true
        });
      }
    }
  }

  const paragraphs = novelContent[chIdx];

  return res.status(200).json({
    success: true,
    novel: novelKey,
    ch: chIdx,
    paragraphs
  });
}
