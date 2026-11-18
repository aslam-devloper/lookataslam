// api/verify-payment.js — Vercel Serverless Function
// Cryptographically verifies Razorpay payment signatures using HMAC-SHA256
const crypto = require('crypto');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
      item = 'jalwa_v2',
      amount = 99
    } = body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // In dev / test mode without env keys set yet:
    if (!keySecret) {
      // Mock verification for local testing or initial preview
      const mockToken = Buffer.from(`unlocked:${item}:${Date.now()}:mock`).toString('base64');
      return res.status(200).json({
        success: true,
        verified: true,
        isMock: true,
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

    // Generate signed unlock token
    const tokenPayload = `${item}:${razorpay_payment_id}:${Date.now()}`;
    const tokenSignature = crypto
      .createHmac('sha256', keySecret)
      .update(tokenPayload)
      .digest('hex')
      .slice(0, 16);
    const token = `${tokenPayload}:${tokenSignature}`;

    return res.status(200).json({
      success: true,
      verified: true,
      token,
      item,
      paymentId: razorpay_payment_id,
      message: 'Payment verified successfully. Thank you for supporting!'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Server error during payment verification.'
    });
  }
}
