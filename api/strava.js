// Vercel Function: ตัวกลางระหว่าง FitTrack กับ Strava
// - เก็บ Client Secret ไว้ฝั่ง server (ห้ามอยู่ในหน้าเว็บหรือ git)
// - แลก code / ต่ออายุ token และส่งต่อคำขออ่านกิจกรรม (เฉพาะ path ที่อนุญาต)
// ตั้งค่า: vercel env add STRAVA_CLIENT_ID production
//          vercel env add STRAVA_CLIENT_SECRET production
const ALLOWED_ORIGINS = ['https://fitt-zeta.vercel.app', 'http://localhost:8080'];
const API_PATHS = [/^\/athlete\/activities$/, /^\/activities\/\d+$/];

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Cache-Control', 'no-store');
  if (origin) {
    // คำขอ same-origin แบบ GET อาจไม่มี Origin ส่วนต่างโดเมนต้องอยู่ใน allowlist
    if (!ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ error: 'origin' });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    return res.status(204).end();
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(503).json({ error: 'not_configured' });

  const action = String(req.query.action || '');
  try {
    if (req.method === 'GET' && action === 'config') return res.json({ clientId });

    if (req.method === 'POST' && (action === 'token' || action === 'refresh')) {
      const body = readBody(req);
      const params = { client_id: clientId, client_secret: clientSecret };
      if (action === 'token') {
        if (typeof body.code !== 'string' || !body.code) return res.status(400).json({ error: 'code' });
        Object.assign(params, { code: body.code, grant_type: 'authorization_code' });
      } else {
        if (typeof body.refresh_token !== 'string' || !body.refresh_token) return res.status(400).json({ error: 'refresh_token' });
        Object.assign(params, { refresh_token: body.refresh_token, grant_type: 'refresh_token' });
      }
      const r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status === 429 ? 429 : 401).json({ error: 'strava' });
      // ส่งกลับเฉพาะฟิลด์ที่แอปใช้
      return res.json({
        access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at,
        scope: d.scope, athlete: d.athlete ? { firstname: d.athlete.firstname, lastname: d.athlete.lastname } : null,
      });
    }

    const auth = String(req.headers.authorization || '');
    if (!/^Bearer [\w.-]+$/.test(auth)) return res.status(401).json({ error: 'auth' });

    if (req.method === 'POST' && action === 'deauthorize') {
      const r = await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { Authorization: auth } });
      return res.status(r.ok ? 200 : r.status).json({ ok: r.ok });
    }

    if (req.method === 'GET' && action === 'api') {
      const path = String(req.query.path || '');
      if (!API_PATHS.some(p => p.test(path))) return res.status(400).json({ error: 'path' });
      const qs = new URLSearchParams();
      for (const k of ['after', 'before', 'page', 'per_page']) {
        const v = String(req.query[k] || '').replace(/\D/g, '');
        if (v) qs.set(k, v);
      }
      const r = await fetch(`https://www.strava.com/api/v3${path}?${qs}`, { headers: { Authorization: auth } });
      res.status(r.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(await r.text());
    }

    return res.status(400).json({ error: 'bad_request' });
  } catch (e) {
    return res.status(502).json({ error: 'upstream' });
  }
};
