// api/chapter.js — Vercel Serverless Function
// Serves ONE chapter's paragraphs at a time.
// Content lives in api/_data.js (private module, never served as a URL).
// Rate-limited: 60 requests per 5 minutes per IP.
// Anti-piracy steganography: embeds raw Razorpay payment ID as zero-width Unicode characters.

const CONTENT = require('./_data.js');

const rateMap = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 5 * 60 * 1000;

// ── Forensic Steganography Watermarking ─────────────────────────────────────
// Embeds exact payment ID string (e.g. "pay_P123456789") into text using invisible
// zero-width characters (U+200C = 0, U+200D = 1, U+200B = byte boundary).
// Undetectable to human eyes, survives text copy-pasting, export, and PDF printing.
function encodeZeroWidth(str) {
  if (!str) return '';
  const ZWJ  = '\u200D';
  const ZWNJ = '\u200C';
  const SEP  = '\u200B';
  let out = SEP;
  for (let i = 0; i < str.length; i++) {
    const bits = str.charCodeAt(i).toString(2).padStart(8, '0');
    for (let b = 0; b < 8; b++) {
      out += bits[b] === '1' ? ZWJ : ZWNJ;
    }
    out += SEP;
  }
  return out;
}

function watermarkParagraphs(paragraphs, paymentId) {
  if (!paymentId || !paragraphs || paragraphs.length === 0) return paragraphs;

  const watermark = encodeZeroWidth(paymentId.trim());
  if (!watermark) return paragraphs;

  // Clone array and inject invisibly into middle paragraph and final paragraph
  const result = paragraphs.slice();
  
  // Inject in paragraph 2 (or 0) after word 3
  const targetIdx = Math.min(2, result.length - 1);
  const words = result[targetIdx].split(' ');
  const insertWord = Math.min(3, words.length - 1);
  words[insertWord] = words[insertWord] + watermark;
  result[targetIdx] = words.join(' ');

  // Redundant copy at end of final paragraph for tamper resistance
  if (result.length > 3) {
    const lastIdx = result.length - 1;
    result[lastIdx] = result[lastIdx] + watermark;
  }

  return result;
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || '';
  const isAllowed = !origin || origin.includes('lookataslam') || origin.includes('localhost') || origin.includes('vercel.app');
  if (!isAllowed) return res.status(403).json({ error: 'Forbidden.' });

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').split(',')[0].trim();
  const now = Date.now();
  const history = (rateMap.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (history.length >= RATE_LIMIT) return res.status(429).json({ error: 'Too many requests. Take a break.' });
  history.push(now);
  rateMap.set(ip, history);

  const novelKey = String(req.query.novel || 'jalwa').replace(/[^a-z0-9_]/gi, '');
  const chIdx    = parseInt(req.query.ch ?? '0', 10);

  const novelContent = CONTENT[novelKey];
  if (!novelContent) return res.status(404).json({ error: 'Novel not found.' });
  if (isNaN(chIdx) || chIdx < 0 || chIdx >= novelContent.length) return res.status(404).json({ error: 'Chapter not found.' });

  const LAUNCH_DATE_MS    = new Date('2026-12-10T18:00:00+05:30').getTime();
  const LAUNCH_DAY_24H_END = LAUNCH_DATE_MS + 86400000;

  // Paid volume check: Vol 2, 3, 4, 5 etc.
  const isPaidNovel = novelKey === 'jalwa_v2' || novelKey.includes('_v2') || novelKey.includes('_v3') || novelKey.includes('_v4') || novelKey.includes('_v5');

  if (novelKey === 'jalwa_v2') {
    if (now < LAUNCH_DATE_MS) {
      return res.status(403).json({ error: 'Volume 2 officially releases December 10, 2026 at 6:00 PM IST.', releaseDate: '2026-12-10T18:00:00+05:30' });
    }
    const isWithin24Hours = now >= LAUNCH_DATE_MS && now <= LAUNCH_DAY_24H_END;
    const bundleToken = req.headers['x-bundle-token'] || req.query.unlocked === 'true';
    if (chIdx === 0 && !isWithin24Hours && !bundleToken) {
      return res.status(402).json({ error: 'The 24-hour free period for Chapter 11 has ended. It is now part of the Volume 2 bundle.', bundleRequired: true });
    }
    if (chIdx > 0 && !bundleToken) {
      return res.status(402).json({ error: 'This chapter is part of the complete Volume 2 paid bundle.', bundleRequired: true });
    }
  }

  // ── Extract buyer payment ID ──────────────────────────────────────────────
  let paymentId = req.headers['x-payment-id'] || req.query.payment_id || '';
  if (!paymentId) {
    const rawToken = req.headers['x-bundle-token'] || '';
    if (rawToken.startsWith('pay_')) {
      paymentId = rawToken;
    } else if (rawToken.includes(':')) {
      const parts = rawToken.split(':');
      if (parts[1] && parts[1].startsWith('pay_')) paymentId = parts[1];
    }
  }

  let paragraphs = novelContent[chIdx];

  // Apply watermarking to paid editions or whenever paymentId is attached
  if (isPaidNovel && paymentId) {
    paragraphs = watermarkParagraphs(paragraphs, paymentId);
  }

  return res.status(200).json({ success: true, novel: novelKey, ch: chIdx, paragraphs });
}
