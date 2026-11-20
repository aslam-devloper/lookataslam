// api/verify-payment.js — Vercel Serverless Function
// Cryptographically verifies Razorpay payment signatures using HMAC-SHA256
// Saves purchase record to DB, provisions active session ID & sets secure browser cookie.

const crypto = require('crypto');
const { savePurchase } = require('./_db.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email = '',
      item = 'jalwa_v2',
      amount = 99
    } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const sessionId = 'sess_' + crypto.randomBytes(20).toString('hex');

    // In dev / test mode without env keys set yet:
    if (!keySecret) {
      const mockPid = razorpay_payment_id || ('pay_mock_' + Date.now());
      const mockOid = razorpay_order_id || ('order_mock_' + Date.now());
      const mockToken = Buffer.from(`unlocked:${item}:${mockPid}`).toString('base64');

      await savePurchase({
        payment_id: mockPid,
        order_id: mockOid,
        email: email || 'reader@lookataslam.com',
        tier: amount >= 149 ? '149 Supporter' : '99 Standard',
        active_session: sessionId,
        daily_switches: 0,
        last_switch_date: new Date().toISOString().split('T')[0],
        blocked: false
      });

      // Set cookie for browser
      res.setHeader('Set-Cookie', `lks_session=${sessionId}; Path=/; Max-Age=31536000; SameSite=Lax`);

      return res.status(200).json({
        success: true,
        verified: true,
        isMock: true,
        sessionId,
        paymentId: mockPid,
        orderId: mockOid,
        tier: amount >= 149 ? '149 Supporter' : '99 Standard',
        token: mockToken,
        message: 'Payment verified (Demo/Mock mode — set RAZORPAY_KEY_SECRET in Vercel for production).'
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required Razorpay payment verification details.'
      });
    }

    // Standard Razorpay HMAC-SHA256 verification
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid payment signature. Verification failed.'
      });
    }

    // Save purchase record to DB
    const tier = amount >= 149 ? '149 Supporter' : '99 Standard';
    await savePurchase({
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      email: email || '',
      tier,
      active_session: sessionId,
      daily_switches: 0,
      last_switch_date: new Date().toISOString().split('T')[0],
      blocked: false
    });

    // Set secure cookie
    res.setHeader('Set-Cookie', `lks_session=${sessionId}; Path=/; Max-Age=31536000; SameSite=Lax`);

    return res.status(200).json({
      success: true,
      verified: true,
      sessionId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      tier,
      token: `token_${razorpay_payment_id}_${sessionId}`,
      message: 'Payment verified successfully. Content unlocked.'
    });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error during payment verification.'
    });
  }
}
