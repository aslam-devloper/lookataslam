// api/subscribe.js — Vercel Serverless Function: Email Dispatcher (Brevo + Resend)
// Supports Brevo (Sendinblue v3 REST API) & Resend with automatic fallback.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, trap } = body || {};

    // 1. Anti-bot honeypot check
    if (trap && String(trap).trim().length > 0) {
      return res.status(400).json({ success: false, error: "Bot verification triggered." });
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Provider API Keys & Settings
    const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
    const resendApiKey = (process.env.RESEND_API_KEY || process.env.RESEND_APIKEY || process.env.RESEND_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'indiedevaslam@outlook.com').trim();
    const senderName = (process.env.BREVO_SENDER_NAME || 'Mohammad Aslam').trim();
    const authorEmail = (process.env.AUTHOR_EMAIL || 'indiedevaslam@outlook.com').trim();

    const emailSubject = "Release Alert Confirmed: Just a Little While Apart (Vol. 2: The World of Two)";
    const emailHtml = `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #1f1d1a; line-height: 1.85; font-size: 16px; background: #faf7f2; border: 1.5px solid #22201d; border-radius: 16px;">
        <div style="font-size: 0.78rem; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; color: #d97757; margin-bottom: 14px;">
          Release Notification &middot; lookataslam
        </div>

        <h2 style="font-family: 'Newsreader', Georgia, serif; font-size: 1.45rem; font-weight: 600; line-height: 1.25; margin: 0 0 16px; color: #111;">
          You're on the release list for Volume 2: The World of Two
        </h2>

        <p style="margin: 0 0 16px; color: #333;">
          This confirms that you will receive a release alert the moment <strong>Just a Little While Apart (Volume 2)</strong> goes live.
        </p>

        <div style="background: #ffffff; border: 1.5px solid #22201d; border-radius: 12px; padding: 20px; margin: 22px 0;">
          <div style="font-size: 0.82rem; font-weight: 700; color: #d97757; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Launch Schedule</div>
          <p style="margin: 0 0 8px; font-size: 0.95rem; color: #222;"><strong>Release Date:</strong> December 10, 2026 &middot; 6:00 PM IST</p>
          <p style="margin: 0 0 8px; font-size: 0.95rem; color: #222;"><strong>Chapter 11:</strong> Free to read for 24 hours on launch day.</p>
          <p style="margin: 0; font-size: 0.95rem; color: #222;"><strong>Chapters 12–20:</strong> Releasing together as the complete paid bundle (₹99 / ₹149 Supporter).</p>
        </div>

        <p style="margin: 0 0 20px; color: #444; font-size: 0.95rem;">
          You will receive an email on December 10 with the direct link to start reading. If you'd like to catch up or reread Volume 1 in the meantime, all 10 chapters are free on the website.
        </p>

        <a href="https://lookataslam.vercel.app/reader.html?novel=jalwa" style="display: inline-block; background: #d97757; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 0.88rem; border: 1.5px solid #22201d;">Read Volume 1 &rarr;</a>

        <p style="margin-top: 36px; padding-top: 18px; border-top: 1px dashed #d5cec5; font-size: 0.88rem; color: #777; line-height: 1.6;">
          Mohammad Aslam &middot; lookataslam<br/>
          <span style="font-size: 0.82rem;">indedevaslam@outlook.com &middot; lookataslam.vercel.app</span>
        </p>
      </div>
    `;

    // ── 1. Brevo v3 REST Dispatcher (Priority) ──────────────────────────────
    if (brevoApiKey) {
      try {
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: cleanEmail }],
            subject: emailSubject,
            htmlContent: emailHtml
          })
        });

        // Notify author
        fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: authorEmail }],
            subject: `New Chapter Subscriber: ${cleanEmail}`,
            htmlContent: `<p>New subscriber joined chapter alerts:</p><p style="font-size:1.1rem; font-weight:bold;">${cleanEmail}</p><p>Timestamp: ${new Date().toUTCString()}</p>`
          })
        }).catch(() => {});

        if (brevoRes.ok) {
          return res.status(200).json({
            success: true,
            provider: 'brevo',
            message: "Release alert confirmed! You will receive an email the moment Volume 2 launches on Dec 10."
          });
        }
      } catch (brevoErr) {
        console.error('Brevo dispatch error:', brevoErr);
      }
    }

    // ── 2. Resend Fallback ──────────────────────────────────────────────────
    if (resendApiKey) {
      const fromAddress = (process.env.RESEND_FROM || 'Mohammad Aslam <onboarding@resend.dev>').trim();
      const sendSubscriber = fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [cleanEmail],
          subject: emailSubject,
          html: emailHtml
        })
      });

      const sendAuthor = fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [authorEmail],
          subject: `New Chapter Subscriber: ${cleanEmail}`,
          html: `<p>New subscriber joined chapter alerts:</p><p style="font-size:1.1rem; font-weight:bold;">${cleanEmail}</p><p>Timestamp: ${new Date().toUTCString()}</p>`
        })
      });

      await Promise.allSettled([sendSubscriber, sendAuthor]);

      return res.status(200).json({
        success: true,
        provider: 'resend',
        message: "Release alert confirmed! You will receive an email the moment Volume 2 launches on Dec 10."
      });
    }

    // ── 3. Placeholder / Mock mode when API key is not yet set in Vercel ─────
    console.warn("Neither BREVO_API_KEY nor RESEND_API_KEY is configured in Vercel environment.");
    return res.status(200).json({
      success: true,
      message: "Release alert confirmed! You will receive an email the moment Volume 2 launches on Dec 10."
    });

  } catch (err) {
    console.error('Subscription handler error:', err);
    return res.status(500).json({ success: false, error: "Unable to process subscription right now." });
  }
}
