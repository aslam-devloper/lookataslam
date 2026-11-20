// api/webhook.js — Razorpay Backup Webhook Handler
// Captures payment.captured events to guarantee purchases are safely recorded in DB
// even if a buyer's internet disconnects mid-payment.

const crypto = require('crypto');
const { getPurchase, savePurchase } = require('./_db.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature.' });
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload?.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payload?.payment?.entity || {};
      const pid = payment.id;
      const oid = payment.order_id;
      const email = payment.email || '';
      const amountInRupees = (payment.amount || 0) / 100;
      const tier = amountInRupees >= 149 ? '149 Supporter' : '99 Standard';

      if (pid) {
        const existing = await getPurchase(pid);
        if (!existing) {
          // Auto-record purchase so receipt ID is valid immediately
          const initialSession = 'sess_' + crypto.randomBytes(20).toString('hex');
          await savePurchase({
            payment_id: pid,
            order_id: oid || '',
            email: email,
            tier: tier,
            active_session: initialSession,
            daily_switches: 0,
            last_switch_date: new Date().toISOString().split('T')[0],
            blocked: false
          });
          console.log(`[Webhook] Successfully recorded purchase: ${pid}`);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook] Error processing Razorpay webhook:', err);
    return res.status(500).json({ error: 'Webhook processing error.' });
  }
}
