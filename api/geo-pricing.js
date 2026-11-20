// api/geo-pricing.js — Vercel Serverless Function: Geo-Detected Regional Pricing
// Returns localized currency sweet spots + 1.5% buffer for international readers
// while maintaining transparent INR checkout via Razorpay.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Read geographic origin from Vercel edge / Cloudflare headers
  const country = (req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || 'IN').toUpperCase();

  // Regional sweet spots (1.5% higher than psychological price points to cover foreign exchange & processing)
  const REGIONAL_RATES = {
    IN: { currency: 'INR', symbol: '₹', standard: 99, supporter: 149, upgrade: 50, inrEquivalent: true },
    US: { currency: 'USD', symbol: '$', standard: 3.05, supporter: 5.07, upgrade: 1.75, note: 'Billed as ₹99 (~$3.05 USD)' },
    GB: { currency: 'GBP', symbol: '£', standard: 2.53, supporter: 4.05, upgrade: 1.40, note: 'Billed as ₹99 (~£2.53 GBP)' },
    CA: { currency: 'CAD', symbol: 'CA$', standard: 4.05, supporter: 6.60, upgrade: 2.25, note: 'Billed as ₹99 (~CA$4.05)' },
    AU: { currency: 'AUD', symbol: 'A$', standard: 4.56, supporter: 7.40, upgrade: 2.55, note: 'Billed as ₹99 (~A$4.56)' },
    EU: { currency: 'EUR', symbol: '€', standard: 3.05, supporter: 5.07, upgrade: 1.75, note: 'Billed as ₹99 (~€3.05)' },
    DE: { currency: 'EUR', symbol: '€', standard: 3.05, supporter: 5.07, upgrade: 1.75, note: 'Billed as ₹99 (~€3.05)' },
    FR: { currency: 'EUR', symbol: '€', standard: 3.05, supporter: 5.07, upgrade: 1.75, note: 'Billed as ₹99 (~€3.05)' },
    NL: { currency: 'EUR', symbol: '€', standard: 3.05, supporter: 5.07, upgrade: 1.75, note: 'Billed as ₹99 (~€3.05)' },
    AE: { currency: 'AED', symbol: 'AED ', standard: 12.20, supporter: 19.50, upgrade: 6.80, note: 'Billed as ₹99 (~12.20 AED)' },
    SA: { currency: 'SAR', symbol: 'SAR ', standard: 12.50, supporter: 19.80, upgrade: 6.90, note: 'Billed as ₹99 (~12.50 SAR)' }
  };

  const geoData = REGIONAL_RATES[country] || REGIONAL_RATES.US;

  return res.status(200).json({
    success: true,
    detectedCountry: country,
    geo: geoData,
    baseINR: {
      standard: 99,
      supporter: 149,
      upgrade: 50
    }
  });
}
