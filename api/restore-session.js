// api/restore-session.js — Device Switch & Purchase Restore API
// Verifies receipt ID, enforces max 4 device switches/day, provisions new active session
// and invalidates previous device sessions.

const crypto = require('crypto');
const { getPurchase, updateSession } = require('./_db.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    let { payment_id } = body || {};

    if (!payment_id || typeof payment_id !== 'string') {
      return res.status(400).json({ success: false, error: 'Please enter a valid Razorpay Payment ID (e.g. pay_...).' });
    }

    payment_id = payment_id.trim();

    // 1. Look up purchase
    const purchase = await getPurchase(payment_id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'No purchase record found for this Payment ID. Please check the receipt email from Razorpay or contact indedevaslam@outlook.com.'
      });
    }

    // 2. Check blocked flag
    if (purchase.blocked) {
      return res.status(403).json({
        success: false,
        error: 'This license has been suspended due to unauthorized content distribution or copyright policy violation. Contact indedevaslam@outlook.com.'
      });
    }

    // 3. Enforce device switch limits (max 4 per day)
    const today = new Date().toISOString().split('T')[0];
    let switchesToday = purchase.last_switch_date === today ? (purchase.daily_switches || 0) : 0;

    if (switchesToday >= 4) {
      return res.status(429).json({
        success: false,
        error: 'Daily device switch limit reached (max 4 switches per day). Please continue reading on your active device or try again tomorrow.'
      });
    }

    // 4. Overwrite with brand-new active session ID (invalidates old device)
    const newSessionId = 'sess_' + crypto.randomBytes(20).toString('hex');
    const updated = await updateSession(payment_id, newSessionId);

    // 5. Set browser cookie
    res.setHeader('Set-Cookie', `lks_session=${newSessionId}; Path=/; Max-Age=31536000; SameSite=Lax`);

    return res.status(200).json({
      success: true,
      message: 'Access restored successfully! The previous device has been logged out.',
      sessionId: newSessionId,
      paymentId: purchase.payment_id,
      orderId: purchase.order_id,
      email: purchase.email,
      tier: purchase.tier,
      switchesRemaining: Math.max(0, 4 - (updated.daily_switches || 0))
    });

  } catch (err) {
    console.error('Restore error:', err);
    return res.status(500).json({ success: false, error: 'Server error restoring purchase session.' });
  }
}
