// ตัวช่วยคุยกับ Supabase ผ่าน HTTP (ไม่ใช้ SDK เพื่อไม่ต้องมี npm dependency)
// - ข้อมูลทั้งหมดเข้าถึงด้วย service role (ข้าม RLS) ดังนั้นไฟล์นี้ใช้ฝั่ง server เท่านั้น
// - ตัวตนผู้ใช้ตรวจจาก access token ผ่าน /auth/v1/user ทุกครั้ง
const BUCKET = 'proofs';

function cfg() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return null;
  return { url: url.replace(/\/$/, ''), anon, service };
}

class SupaError extends Error {
  constructor(status, body) {
    super((body && (body.message || body.msg || body.error_description || body.error)) || 'supabase ' + status);
    this.status = status; this.body = body || {};
    this.code = this.body.code || this.body.error_code || '';
  }
}

async function call(path, { method = 'GET', body, headers = {}, key = 'service', token } = {}) {
  const c = cfg();
  const apikey = key === 'anon' ? c.anon : c.service;
  const r = await fetch(c.url + path, {
    method,
    headers: { apikey, Authorization: 'Bearer ' + (token || apikey), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { message: text }; }
  if (!r.ok) throw new SupaError(r.status, data);
  return data;
}

// ค่าในตัวกรอง PostgREST ต้อง encode เสมอ (กันการแทรกเงื่อนไขผ่านค่าที่ผู้ใช้ส่งมา)
const q = v => encodeURIComponent(String(v));
const inList = arr => '(' + arr.map(v => '"' + String(v).replace(/["\\]/g, '') + '"').map(encodeURIComponent).join(',') + ')';

const db = {
  select: (table, query) => call(`/rest/v1/${table}?${query}`),
  one: async (table, query) => (await call(`/rest/v1/${table}?${query}&limit=1`))[0] || null,
  insert: (table, rows, { upsert, onConflict } = {}) => call(`/rest/v1/${table}${onConflict ? '?on_conflict=' + onConflict : ''}`, {
    method: 'POST', body: rows,
    headers: { Prefer: 'return=representation' + (upsert ? ',resolution=merge-duplicates' : '') },
  }),
  update: (table, filter, patch) => call(`/rest/v1/${table}?${filter}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } }),
  del: (table, filter) => call(`/rest/v1/${table}?${filter}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } }),
  rpc: (fn, args) => call(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args }),
};

const auth = {
  // คืน id ผู้ใช้ หรือ null ถ้า token ใช้ไม่ได้/หมดอายุ
  async user(token) {
    if (!token) return null;
    try { const u = await call('/auth/v1/user', { key: 'anon', token }); return u && u.id ? u : null; }
    catch (e) { if (e.status === 401 || e.status === 403) return null; throw e; }
  },
  createUser: (email, password) => call('/auth/v1/admin/users', { method: 'POST', body: { email, password, email_confirm: true } }),
  deleteUser: id => call('/auth/v1/admin/users/' + q(id), { method: 'DELETE' }),
  login: (email, password) => call('/auth/v1/token?grant_type=password', { method: 'POST', key: 'anon', body: { email, password } }),
  refresh: refresh_token => call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', key: 'anon', body: { refresh_token } }),
  logout: token => call('/auth/v1/logout', { method: 'POST', key: 'anon', token }),
};

const storage = {
  // URL อัปโหลดครั้งเดียว (ไม่ต้องส่ง service key ให้เบราว์เซอร์)
  async uploadUrl(path) {
    const d = await call(`/storage/v1/object/upload/sign/${BUCKET}/${path}`, { method: 'POST', body: {} });
    return cfg().url + '/storage/v1' + d.url;
  },
  async readUrl(path, expiresIn = 600) {
    const d = await call(`/storage/v1/object/sign/${BUCKET}/${path}`, { method: 'POST', body: { expiresIn } });
    return cfg().url + '/storage/v1' + d.signedURL;
  },
  async exists(path) {
    const dir = path.split('/').slice(0, -1).join('/'), name = path.split('/').pop();
    const list = await call(`/storage/v1/object/list/${BUCKET}`, { method: 'POST', body: { prefix: dir, search: name, limit: 5 } });
    return Array.isArray(list) && list.some(o => o.name === name);
  },
  async removeFolder(dir) {
    const list = await call(`/storage/v1/object/list/${BUCKET}`, { method: 'POST', body: { prefix: dir, limit: 1000 } });
    const names = (list || []).map(o => dir + '/' + o.name);
    if (names.length) await call(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', body: { prefixes: names } });
    return names.length;
  },
};

module.exports = { cfg, call, db, auth, storage, q, inList, SupaError };
