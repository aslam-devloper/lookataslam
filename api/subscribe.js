// Vercel Serverless Function: Email Notification & Newsletter Subscription
// Honeypot anti-bot check, email format validation, and duplicate prevention

const subscribers = new Set([
  "reader.sample@example.com"
]);

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { email, trap } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      if (trap && String(trap).trim().length > 0) {
        return res.status(400).json({ success: false, error: "Bot detected." });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: "Please enter a valid email address." });
      }

      const sanitizedEmail = email.toLowerCase().trim();
      if (subscribers.has(sanitizedEmail)) {
        return res.status(200).json({ success: true, message: "You're already subscribed for Volume 2 drops!" });
      }

      subscribers.add(sanitizedEmail);
      return res.status(201).json({
        success: true,
        message: "Subscribed! You'll be notified when Volume 2 goes live."
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: "Subscription failed." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

