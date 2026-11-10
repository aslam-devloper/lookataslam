// Vercel Serverless Function: Multi-Layer Anti-Spam Comments API
// Handles GET (fetch chapter comments) & POST (submit new comment with 5 spam checks)

// In-memory fallback storage for serverless runtime
let memoryComments = [
  {
    id: "init-1",
    chapterId: 0,
    author: "Sara",
    text: "Ma'un's internal dialogue in chapter 1 had me laughing so hard. Can't wait for Vol 2!",
    timestamp: "2026-11-08T14:32:00.000Z"
  },
  {
    id: "init-2",
    chapterId: 5,
    author: "Zainab",
    text: "Cookie's introduction is the cutest thing ever. calico cats are chaotic perfection.",
    timestamp: "2026-11-09T09:15:00.000Z"
  }
];

// In-memory rate limiting map (IP -> timestamps)
const rateLimitMap = new Map();

export default async function handler(req, res) {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // ── GET: Fetch Comments for a Chapter ─────────────────────────────────────
  if (req.method === 'GET') {
    const chapterId = parseInt(req.query.chapterId ?? '0', 10);
    const filtered = memoryComments
      .filter(c => c.chapterId === chapterId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      chapterId,
      count: filtered.length,
      comments: filtered
    });
  }

  // ── POST: Submit New Comment with 5-Layer Anti-Spam ─────────────────────────
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { chapterId, author, text, hpTrap, formStartTime } = body || {};

      // 1. SPAM DEFENSE LAYER 1: Honeypot trap (Hidden field filled by bots)
      if (hpTrap && String(hpTrap).trim().length > 0) {
        return res.status(400).json({ success: false, error: "Bot verification triggered." });
      }

      // 2. SPAM DEFENSE LAYER 2: Timing test (Submitted too fast < 2 seconds)
      const now = Date.now();
      if (formStartTime && (now - parseInt(formStartTime, 10)) < 1800) {
        return res.status(429).json({ success: false, error: "Submission too fast. Please take your time." });
      }

      // 3. SPAM DEFENSE LAYER 3: Rate Limiting (Max 4 submissions per 5 minutes per IP)
      const ipHistory = rateLimitMap.get(clientIp) || [];
      const recentPosts = ipHistory.filter(t => now - t < 5 * 60 * 1000);
      if (recentPosts.length >= 4) {
        return res.status(429).json({ success: false, error: "Rate limit reached. Please wait a few minutes before commenting again." });
      }
      recentPosts.push(now);
      rateLimitMap.set(clientIp, recentPosts);

      // 4. SPAM DEFENSE LAYER 4: Length & Character Validation
      const cleanAuthor = String(author || 'Anonymous').trim().slice(0, 30);
      const cleanText = String(text || '').trim();

      if (!cleanText || cleanText.length < 3) {
        return res.status(400).json({ success: false, error: "Comment is too short (min 3 characters)." });
      }
      if (cleanText.length > 500) {
        return res.status(400).json({ success: false, error: "Comment exceeds maximum limit of 500 characters." });
      }

      // 5. SPAM DEFENSE LAYER 5: Link & Blacklist Filtering
      const linkRegex = /(https?:\/\/|www\.|\.com|\.xyz|\.ru|\.biz|bit\.ly|telegram\.me|t\.me)/i;
      if (linkRegex.test(cleanText)) {
        return res.status(400).json({ success: false, error: "Links and promotional text are not permitted." });
      }

      // XSS Sanitation (Escaping HTML entities)
      const sanitizedText = cleanText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      const sanitizedAuthor = cleanAuthor
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const newComment = {
        id: "c-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        chapterId: parseInt(chapterId ?? 0, 10),
        author: sanitizedAuthor,
        text: sanitizedText,
        timestamp: new Date().toISOString()
      };

      memoryComments.unshift(newComment);

      return res.status(201).json({
        success: true,
        message: "Comment published successfully.",
        comment: newComment
      });

    } catch (err) {
      return res.status(500).json({ success: false, error: "Failed to process comment submission." });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
