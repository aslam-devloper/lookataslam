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

  const paragraphs = novelContent[chIdx];

  return res.status(200).json({
    success: true,
    novel: novelKey,
    ch: chIdx,
    paragraphs
  });
}
