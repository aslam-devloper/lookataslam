// api/_db.js — Universal Purchase & Session Storage Adapter
// Schema includes: payment_id, order_id, email, item (novel key), amount, tier,
// active_session, daily_switches, last_switch_date, blocked, created_at.

const fs = require('fs');
const path = require('path');

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Dedicated Author Master Mock ID (accessible to author only — unlocks all books & tiers)
const AUTHOR_MASTER_ID = (process.env.AUTHOR_MASTER_KEY || 'pay_AslamMaster2026').trim();

// Local fallback store (/tmp persists for the lifetime of serverless container)
const TMP_FILE = path.join('/tmp', 'lks_purchases.json');
let memStore = { purchases: {}, sessions: {} };

function loadLocal() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const data = JSON.parse(fs.readFileSync(TMP_FILE, 'utf-8'));
      if (data && data.purchases) memStore = data;
    }
  } catch (e) {
    // ignore
  }
}

function saveLocal() {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(memStore), 'utf-8');
  } catch (e) {
    // ignore
  }
}

loadLocal();

async function kvFetch(cmd, ...args) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const url = `${KV_URL}/${cmd}/${args.map(a => encodeURIComponent(typeof a === 'object' ? JSON.stringify(a) : String(a))).join('/')}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result;
  } catch (e) {
    console.error('KV fetch error:', e);
    return null;
  }
}

// ── DB Interface ────────────────────────────────────────────────────────────
async function getPurchase(paymentId) {
  if (!paymentId) return null;
  paymentId = paymentId.trim();

  // Author Master Key Bypass (universal access to all novels and tiers)
  if (paymentId === AUTHOR_MASTER_ID) {
    loadLocal();
    const existing = memStore.purchases[AUTHOR_MASTER_ID] || {};
    return {
      payment_id: AUTHOR_MASTER_ID,
      order_id: 'order_Author_Master',
      email: 'indiedevaslam@outlook.com',
      item: 'all_novels',
      amount: 149,
      tier: '149 Supporter',
      active_session: existing.active_session || 'sess_author_master',
      daily_switches: 0,
      last_switch_date: new Date().toISOString().split('T')[0],
      blocked: false,
      isMasterKey: true
    };
  }

  if (KV_URL && KV_TOKEN) {
    const data = await kvFetch('get', `purchase:${paymentId}`);
    if (data) {
      return typeof data === 'string' ? JSON.parse(data) : data;
    }
  }

  loadLocal();
  return memStore.purchases[paymentId] || null;
}

async function savePurchase(record) {
  if (!record || !record.payment_id) return false;
  const pid = record.payment_id.trim();

  const purchase = {
    payment_id: pid,
    order_id: record.order_id || '',
    email: (record.email || '').trim().toLowerCase(),
    item: (record.item || 'jalwa_v2').trim().toLowerCase(), // Binds license to specific novel
    amount: parseInt(record.amount || 99, 10),
    tier: record.tier || (record.amount >= 149 ? '149 Supporter' : '99 Standard'),
    active_session: record.active_session || '',
    daily_switches: record.daily_switches ?? 0,
    last_switch_date: record.last_switch_date || new Date().toISOString().split('T')[0],
    blocked: Boolean(record.blocked),
    created_at: record.created_at || new Date().toISOString()
  };

  if (KV_URL && KV_TOKEN) {
    await kvFetch('set', `purchase:${pid}`, JSON.stringify(purchase));
    if (purchase.active_session) {
      await kvFetch('set', `session:${purchase.active_session}`, pid);
    }
  }

  loadLocal();
  memStore.purchases[pid] = purchase;
  if (purchase.active_session) {
    memStore.sessions[purchase.active_session] = pid;
  }
  saveLocal();

  return purchase;
}

async function getPurchaseBySession(sessionId) {
  if (!sessionId) return null;
  sessionId = sessionId.trim();

  let pid = null;
  if (KV_URL && KV_TOKEN) {
    pid = await kvFetch('get', `session:${sessionId}`);
  }

  if (!pid) {
    loadLocal();
    pid = memStore.sessions[sessionId];
  }

  if (sessionId === 'sess_author_master') {
    pid = AUTHOR_MASTER_ID;
  }

  if (!pid) return null;
  return await getPurchase(pid);
}

async function updateSession(paymentId, newSessionId) {
  paymentId = paymentId.trim();
  const isMaster = paymentId === AUTHOR_MASTER_ID;

  const purchase = await getPurchase(paymentId);
  if (!purchase) return null;

  const oldSession = purchase.active_session;
  purchase.active_session = newSessionId;

  const today = new Date().toISOString().split('T')[0];
  if (!isMaster) {
    if (purchase.last_switch_date !== today) {
      purchase.daily_switches = 1;
      purchase.last_switch_date = today;
    } else {
      purchase.daily_switches = (purchase.daily_switches || 0) + 1;
    }
  }

  if (KV_URL && KV_TOKEN) {
    if (oldSession) await kvFetch('del', `session:${oldSession}`);
    await kvFetch('set', `session:${newSessionId}`, paymentId);
    await kvFetch('set', `purchase:${paymentId}`, JSON.stringify(purchase));
  }

  loadLocal();
  if (oldSession) delete memStore.sessions[oldSession];
  memStore.sessions[newSessionId] = paymentId;
  memStore.purchases[paymentId] = purchase;
  saveLocal();

  return purchase;
}

module.exports = {
  AUTHOR_MASTER_ID,
  getPurchase,
  savePurchase,
  getPurchaseBySession,
  updateSession
};
