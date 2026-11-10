// Vercel Serverless Function: Multi-Layer Anti-Spam Comments API
// Supports GET, POST, and DELETE (author / local owner deletion)

let memoryComments = [
  {
    id: "init-1",
    chapterId: 0,
    author: "Sara",
    text: "Ma'un's internal monologue in chapter 1 is 10/10 relatable.",
    timestamp: "2026-11-08T14:32:00.000Z"
  },
  {
    id: "init-2",
    chapterId: 5,
    author: "Zainab",
    text: "Cookie showing up changed the whole energy of the house. 10/10 chapter.",
    timestamp: "2026-11-09T09:15:00.000Z"
  }
];

const rateLimitMap = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // ── GET: Fetch Comments ──────────────────────────────────────────────────
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

  // ── POST: Submit New Comment ─────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { chapterId, author, text, hpTrap, formStartTime } = body || {};

      // 1. Honeypot check
      if (hpTrap && String(hpTrap).trim().length > 0) {
        return res.status(400).json({ success: false, error: "Bot verification triggered." });
      }

      // 2. Timing check
      const now = Date.now();
      if (formStartTime && (now - parseInt(formStartTime, 10)) < 1800) {
        return res.status(429).json({ success: false, error: "Submitted too quickly. Please pause and try again." });
      }

      // 3. Rate limiting (max 4 per 5 mins per IP)
      const ipHistory = rateLimitMap.get(clientIp) || [];
      const recentPosts = ipHistory.filter(t => now - t < 5 * 60 * 1000);
      if (recentPosts.length >= 4) {
        return res.status(429).json({ success: false, error: "Rate limit reached. Please wait a few minutes." });
      }
      recentPosts.push(now);
      rateLimitMap.set(clientIp, recentPosts);

      const cleanAuthor = String(author || 'Anonymous').trim().slice(0, 30);
      const cleanText = String(text || '').trim();

      // 4. Length checks
      if (!cleanText || cleanText.length < 3) {
        return res.status(400).json({ success: false, error: "Comment is too short (min 3 characters)." });
      }
      if (cleanText.length > 500) {
        return res.status(400).json({ success: false, error: "Comment exceeds limit of 500 characters." });
      }

      // 5. Link filtering
      const linkRegex = /(https?:\/\/|www\.|\.com|\.xyz|\.ru|\.biz|\.org|\.io|\.net|bit\.ly|t\.me|telegram|discord\.gg|whatsapp|wa\.me|instagram\.com|snapchat)/i;
      if (linkRegex.test(cleanText) || linkRegex.test(cleanAuthor)) {
        return res.status(400).json({
          success: false,
          error: "External links and website addresses are strictly blocked."
        });
      }

      // 6. Social ID sharing filtering
      const socialExchangeRegex = /(@[a-zA-Z0-9_\.]{3,}|(ig|insta|snap|discord|telegram|tg|handle|add me|dm me|hit me up|inbox me)[\s:]+[a-zA-Z0-9_\.]{3,})/i;
      if (socialExchangeRegex.test(cleanText) || /@[a-zA-Z0-9_]/.test(cleanAuthor)) {
        return res.status(400).json({
          success: false,
          error: "Sharing social media handles or stranger contact exchange is not allowed. Please keep discussions on the chapter."
        });
      }

      // 7. Large Number Sequences
      const phoneDigitsRegex = /(\+?\d[\s\-\.]{0,2}){6,}\d/;
      if (phoneDigitsRegex.test(cleanText)) {
        return res.status(400).json({
          success: false,
          error: "Phone numbers and large digit sequences are blocked for user safety. (Ratings like 10/10 are always welcome!)"
        });
      }

      // 8. Sanitization
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

  // ── DELETE: Delete Comment by ID ─────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ success: false, error: "Comment ID is required." });
      }

      const initialLength = memoryComments.length;
      memoryComments = memoryComments.filter(c => c.id !== id);

      return res.status(200).json({
        success: true,
        message: "Comment removed.",
        deleted: initialLength !== memoryComments.length
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Failed to delete comment." });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
