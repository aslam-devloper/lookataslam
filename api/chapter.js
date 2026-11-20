// api/chapter.js — Vercel Serverless Function
// Serves ONE chapter at a time from private backend data (_data.js).
// Verifies active device session in DB for paid chapters (Ch 12-20).
// Injects invisible forensic text watermark + provides visual screen watermark metadata.

const CONTENT = require('./_data.js');
const { getPurchaseBySession, getPurchase } = require('./_db.js');

const rateMap = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 5 * 60 * 1000;

function maskEmail(email) {
  if (!email || !email.includes('@')) return 'licensed reader';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 4))}${user.slice(-1)}@${domain}`;
}

// ── Invisible Unicode Steganography Watermarking ───────────────────────────
function encodeZeroWidth(str) {
  if (!str) return '';
  const ZWJ  = '\u200D'; // bit 1
  const ZWNJ = '\u200C'; // bit 0
  const SEP  = '\u200B'; // separator
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

  const result = paragraphs.slice();
  const targetIdx = Math.min(2, result.length - 1);
  const words = result[targetIdx].split(' ');
  const insertWord = Math.min(3, words.length - 1);
  words[insertWord] = words[insertWord] + watermark;
  result[targetIdx] = words.join(' ');

  if (result.length > 3) {
    const lastIdx = result.length - 1;
    result[lastIdx] = result[lastIdx] + watermark;
  }

  return result;
}

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || '';
  const isAllowed = !origin || origin.includes('lookataslam') || origin.includes('localhost') || origin.includes('vercel.app');
  if (!isAllowed) return res.status(403).json({ error: 'Forbidden.' });

  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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

  // Extract session ID
  const cookieHeader = req.headers.cookie || '';
  const cookieSession = parseCookie(cookieHeader, 'lks_session');
  const sessionId = req.headers['x-session-id'] || req.query.session_id || cookieSession;

  // Look up purchase record by session
  let purchase = null;
  if (sessionId) {
    purchase = await getPurchaseBySession(sessionId);
  }

  // Fallback direct paymentId lookup if provided in headers or mock mode
  if (!purchase) {
    const directPid = req.headers['x-payment-id'] || req.query.payment_id;
    if (directPid) {
      purchase = await getPurchase(directPid);
    }
  }

  if (novelKey === 'jalwa_v2') {
    if (now < LAUNCH_DATE_MS) {
      return res.status(403).json({ error: 'Volume 2 officially releases December 10, 2026 at 6:00 PM IST.', releaseDate: '2026-12-10T18:00:00+05:30' });
    }
    const isWithin24Hours = now >= LAUNCH_DATE_MS && now <= LAUNCH_DAY_24H_END;

    // Chapter 11 (index 0): Free for first 24 hours
    if (chIdx === 0 && !isWithin24Hours && !purchase) {
      return res.status(402).json({
        error: 'The 24-hour launch day free reading period for Chapter 11 has ended. It is now part of the Volume 2 bundle.',
        bundleRequired: true
      });
    }

    // Chapters 12-20: strictly locked to valid active session
    if (chIdx > 0) {
      if (!purchase) {
        return res.status(402).json({
          error: 'This chapter requires an active Volume 2 bundle session.',
          sessionExpired: Boolean(sessionId),
          bundleRequired: true
        });
      }
      if (purchase.blocked) {
        return res.status(403).json({
          error: 'This license has been suspended due to copyright or policy violations.',
          blocked: true
        });
      }
    }
  }

  let paragraphs = novelContent[chIdx];
  let watermarkMeta = null;

  // Apply steganography & screen watermark when purchase record is tied
  if (purchase) {
    paragraphs = watermarkParagraphs(paragraphs, purchase.payment_id);
    watermarkMeta = {
      orderId: purchase.order_id || 'order_licensed',
      maskedEmail: maskEmail(purchase.email),
      tier: purchase.tier
    };
  }

  return res.status(200).json({
    success: true,
    novel: novelKey,
    ch: chIdx,
    paragraphs,
    watermark: watermarkMeta
  });
}
