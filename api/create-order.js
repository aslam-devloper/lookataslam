// Vercel Serverless Function: Secure Razorpay Order Creation
// Validates donation amounts, enforces security checks, uses server-side secrets

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
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Strict validation: amount in INR (convert to paise)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    let { amount, currency } = body || {};

    amount = parseInt(amount, 10);
    // Sanity checks: Minimum ₹10, Maximum ₹50,000 to prevent fraud / test abuse
    if (isNaN(amount) || amount < 10 || amount > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid donation amount. Please choose an amount between ₹10 and ₹50,000.'
      });
    }

    const amountInPaise = amount * 100;

    // If keys are configured in Vercel environment variables:
    if (keyId && keySecret) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: currency || 'INR',
          receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          notes: {
            purpose: 'Author Donation / Tea Support',
            novel: 'Just a Little While Apart'
          }
        })
      });

      const orderData = await rzpResponse.json();
      if (!rzpResponse.ok) {
        return res.status(rzpResponse.status).json({
          success: false,
          error: orderData.error?.description || 'Failed to create Razorpay order.'
        });
      }

      return res.status(200).json({
        success: true,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: keyId // Safe to share public Key ID with client
      });
    } else {
      // Mock / Dev fallback when env vars are being configured
      return res.status(200).json({
        success: true,
        orderId: `order_mock_${Date.now()}`,
        amount: amountInPaise,
        currency: 'INR',
        keyId: keyId || 'rzp_test_placeholder',
        isMock: true
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing payment request.'
    });
  }
}

