// Vercel Serverless Function: Real Email Dispatcher via Resend
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
    const apiKey = (process.env.RESEND_API_KEY || process.env.RESEND_APIKEY || process.env.RESEND_KEY || '').trim();
    const fromAddress = (process.env.RESEND_FROM || 'Mohammad Aslam <onboarding@resend.dev>').trim();
    const authorEmail = (process.env.AUTHOR_EMAIL || 'indedevaslam@outlook.com').trim();

    if (!apiKey) {
      console.warn("RESEND_API_KEY is not configured in Vercel environment.");
      return res.status(200).json({
        success: true,
        message: "Thank you for subscribing! You're on the list."
      });
    }

    const emailSubject = "A quiet hello from Mohammad Aslam (lookataslam)";
    const emailHtml = `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 580px; margin: 0 auto; padding: 32px 20px; color: #1f1d1a; line-height: 1.8; font-size: 16px;">
        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 24px; color: #111;">Hey there,</p>
        
        <p>
          Thank you for leaving your email on my site. It really means a lot to know someone is reading on the other side of the screen.
        </p>

        <p>
          I write fiction late into the night from India—mostly stories about quiet people, complicated domestic lives, and the small, awkward moments where two strangers slowly figure each other out.
        </p>

        <p>Here is what is currently live for you to read:</p>

        <div style="background: #faf7f2; border: 1.5px solid #22201d; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 6px; font-size: 1.15rem; color: #22201d;">1. Just a Little While Apart (Volume 1)</h3>
          <p style="margin: 0 0 12px; font-size: 0.95rem; color: #6b645c;">
            Two strangers, an arranged nikah, and an apartment where neither knows what to do with their hands. All 10 chapters are completely free forever.
          </p>
          <a href="https://lookataslam.com/reader.html?novel=jalwa" style="display: inline-block; background: #d97757; color: #ffffff; padding: 8px 18px; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 0.88rem; border: 1.5px solid #22201d;">Read Volume 1 Free &rarr;</a>
        </div>

        <div style="background: #f4f6f8; border: 1.5px solid #232d39; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin: 0 0 6px; font-size: 1.15rem; color: #102a43;">2. The Silly Mistakes of Sabu (Complete Story)</h3>
          <p style="margin: 0 0 12px; font-size: 0.95rem; color: #486581;">
            A psychological tragedy about an archive clerk who works 40 hours of overtime to protect his family, only to learn that small everyday shortcuts can cost everything. (6 chapters, full ending).
          </p>
          <a href="https://lookataslam.com/reader.html?novel=sabu" style="display: inline-block; background: #334e68; color: #ffffff; padding: 8px 18px; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 0.88rem; border: 1.5px solid #232d39;">Read Sabu Free &rarr;</a>
        </div>

        <p style="background: #fdf6ec; border-left: 4px solid #d97757; padding: 14px; border-radius: 4px; font-size: 0.95rem; color: #7a4a10;">
          <strong>Volume 2 Release:</strong> <em>Just a Little While Apart (Vol. 2: The World of Two)</em> releases on <strong>December 10, 2026</strong>. Chapter 11 will be completely free on launch day.
        </p>

        <p>I will only email you when new chapters go live or a new novel is ready.</p>

        <p style="margin-top: 36px; line-height: 1.6;">
          Warmly,<br/>
          <strong>Mohammad Aslam</strong><br/>
          <span style="font-size: 0.88rem; color: #888;">indedevaslam@outlook.com &middot; lookataslam.com</span>
        </p>
      </div>
    `;

    // Dispatch welcome email to reader
    const sendSubscriber = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [cleanEmail],
        subject: emailSubject,
        html: emailHtml
      })
    });

    // Dispatch instant notification to author
    const sendAuthor = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [authorEmail],
        subject: `New Chapter Subscriber: ${cleanEmail}`,
        html: `<p>New subscriber joined chapter alerts:</p><p style="font-size:1.1rem; font-weight:bold;">${cleanEmail}</p><p>Timestamp: ${new Date().toUTCString()}</p>`
      })
    });

    const [subRes, authorRes] = await Promise.allSettled([sendSubscriber, sendAuthor]);

    if (subRes.status === 'fulfilled' && !subRes.value.ok) {
      const errData = await subRes.value.json().catch(() => ({}));
      console.error('Resend subscriber delivery notice:', errData);
    }

    return res.status(200).json({
      success: true,
      message: "Thank you for subscribing! A welcome email is on its way."
    });

  } catch (err) {
    console.error('Subscription handler error:', err);
    return res.status(500).json({ success: false, error: "Unable to process subscription right now." });
  }
}
