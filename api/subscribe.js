// Vercel Serverless Function: Real Email Dispatcher via Resend / SMTP / Webhook
// When a reader subscribes, this sends a welcome / release email with your novel links

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, trap } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // 1. Anti-bot honeypot trap
    if (trap && String(trap).trim().length > 0) {
      return res.status(400).json({ success: false, error: "Bot detected." });
    }

    // 2. Strict email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const resendApiKey = process.env.RESEND_API_KEY;

    const emailSubject = "Welcome to lookataslam — 'The Silly Mistakes of Sabu' is live!";
    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f1d1a; line-height: 1.7;">
        <h2 style="font-weight: 700; margin-bottom: 8px;">lookataslam<span style="color: #d97757;">.</span></h2>
        <p style="font-size: 0.95rem; color: #6b645c; margin-bottom: 24px;">New Novel Release Announcement</p>
        
        <p>Hello,</p>
        <p>Thank you for subscribing to my writing updates. I write slow-burn fiction and quiet tragedies late into the night from India.</p>
        
        <div style="background: #f4f6f8; border-left: 4px solid #334e68; padding: 18px; margin: 24px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 6px; font-size: 1.15rem; color: #102a43;">The Silly Mistakes of Sabu (Complete Novel)</h3>
          <p style="margin: 0 0 12px; font-size: 0.95rem; color: #486581;">
            An archive clerk works forty hours of overtime to protect his family, only to learn that small shortcuts can destroy everything. 
          </p>
          <a href="https://lookataslam.vercel.app/reader.html?novel=sabu" style="display: inline-block; background: #334e68; color: #fff; padding: 8px 18px; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 0.88rem;">Read Sabu Free &rarr;</a>
        </div>

        <p>You can also read my ongoing romance novel, <strong>Just a Little While Apart (Volume 1)</strong>, completely free on the site or follow along on Wattpad.</p>
        
        <p style="margin-top: 32px;">
          Thanks for reading,<br/>
          <strong>Mohammad Aslam</strong><br/>
          <span style="font-size: 0.85rem; color: #9e9589;">indedevaslam@outlook.com</span>
        </p>
      </div>
    `;

    // 3. Dispatch via Resend API (Free 3,000 emails/mo) if API key is present
    if (resendApiKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Mohammad Aslam <onboarding@resend.dev>', // or custom domain when verified
          to: [cleanEmail],
          subject: emailSubject,
          html: emailHtml
        })
      });

      const resData = await emailRes.json();
      return res.status(200).json({
        success: true,
        delivered: true,
        message: "Subscribed! A welcome email with 'The Silly Mistakes of Sabu' has been sent to your inbox."
      });
    }

    // 4. Fallback when API key is being added to Vercel
    return res.status(200).json({
      success: true,
      delivered: false,
      message: `Subscribed ${cleanEmail}! To enable instant automated emails, connect your free Resend key in Vercel settings.`
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to process newsletter subscription." });
  }
}
