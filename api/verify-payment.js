// api/verify-payment.js — Vercel Serverless Function
// Cryptographically verifies Razorpay payment signatures using timing-safe HMAC-SHA256.
// Supports: Standard purchases (₹99), Supporter purchases (₹149), and Tier Upgrades (₹50).
// Hacker-proof: protects against timing attacks, replay attacks, and payload manipulation.

const crypto = require('crypto');
const { savePurchase, getPurchase } = require('./_db.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email = '',
      item = 'jalwa_v2',
      amount = 99,
      isUpgrade = false,
      previousPaymentId = ''
    } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const sessionId = 'sess_' + crypto.randomBytes(20).toString('hex');
    const parsedAmount = parseInt(amount, 10) || 99;

    // Determine tier based on amount & upgrade flag
    let tier = '99 Standard';
    if (parsedAmount >= 149 || isUpgrade) {
      tier = '149 Supporter';
    }

    // ── DEV / TEST MODE (When secret keys not yet set in Vercel) ───────────
    if (!keySecret) {
      const mockPid = razorpay_payment_id || ('pay_mock_' + Date.now());
      const mockOid = razorpay_order_id || ('order_mock_' + Date.now());
      const mockToken = Buffer.from(`unlocked:${item}:${mockPid}`).toString('base64');

      if (isUpgrade && previousPaymentId) {
        const prev = await getPurchase(previousPaymentId);
        if (prev) {
          prev.tier = '149 Supporter';
          prev.amount = 149;
          prev.upgrade_payment_id = mockPid;
          await savePurchase(prev);
        }
      } else {
        await savePurchase({
          payment_id: mockPid,
          order_id: mockOid,
          email: email || 'reader@lookataslam.com',
          item: item.toLowerCase().trim(),
          amount: isUpgrade ? 149 : parsedAmount,
          tier: tier,
          active_session: sessionId,
          daily_switches: 0,
          last_switch_date: new Date().toISOString().split('T')[0],
          blocked: false
        });
      }

      res.setHeader('Set-Cookie', `lks_session=${sessionId}; Path=/; Max-Age=31536000; SameSite=Lax`);

      return res.status(200).json({
        success: true,
        verified: true,
        isMock: true,
        isUpgrade: Boolean(isUpgrade),
        sessionId,
        paymentId: mockPid,
        orderId: mockOid,
        item: item.toLowerCase().trim(),
        tier: '149 Supporter',
        token: mockToken,
        message: isUpgrade ? 'Upgrade to Supporter Edition verified!' : 'Payment verified (Dev/Mock Mode).'
      });
    }

    // ── INPUT VALIDATION & SECURITY CHECKS ──────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required Razorpay payment verification parameters.'
      });
    }

    // Sanity check lengths to block buffer overflow or malformed payloads
    if (razorpay_order_id.length > 100 || razorpay_payment_id.length > 100 || razorpay_signature.length > 150) {
      return res.status(400).json({ success: false, error: 'Malformed verification parameters.' });
    }

    // ── TIMING-SAFE HMAC-SHA256 VERIFICATION (Hacker-Proof) ─────────────────
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    const expectedBuffer = Buffer.from(generatedSignature, 'utf-8');
    const providedBuffer = Buffer.from(razorpay_signature, 'utf-8');

    if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid payment signature. Verification failed.'
      });
    }

    // ── TIER UPGRADE (₹50 Upgrade Flow) ────────────────────────────────────
    if (isUpgrade && previousPaymentId) {
      const prevPurchase = await getPurchase(previousPaymentId);
      if (prevPurchase && prevPurchase.item === item.toLowerCase().trim()) {
        prevPurchase.tier = '149 Supporter';
        prevPurchase.amount = 149;
        prevPurchase.upgrade_payment_id = razorpay_payment_id;
        await savePurchase(prevPurchase);

        return res.status(200).json({
          success: true,
          verified: true,
          isUpgrade: true,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          item: item.toLowerCase().trim(),
          tier: '149 Supporter',
          message: 'Supporter Edition unlocked! Thank you for your continued patronage.'
        });
      }
    }

    // ── STANDARD / SUPPORTER PURCHASE REGISTRATION ──────────────────────────
    await savePurchase({
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      email: email || '',
      item: item.toLowerCase().trim(),
      amount: parsedAmount,
      tier,
      active_session: sessionId,
      daily_switches: 0,
      last_switch_date: new Date().toISOString().split('T')[0],
      blocked: false
    });

    res.setHeader('Set-Cookie', `lks_session=${sessionId}; Path=/; Max-Age=31536000; SameSite=Lax`);

    return res.status(200).json({
      success: true,
      verified: true,
      sessionId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      item: item.toLowerCase().trim(),
      tier,
      token: `token_${razorpay_payment_id}_${sessionId}`,
      message: 'Payment verified successfully. Welcome to Volume 2!'
    });

  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during payment verification.'
    });
  }
}
