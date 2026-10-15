// Vercel Function: บัญชีผู้ใช้ อันดับ การแข่งขัน และการตรวจผล (P2–P5)
// เบราว์เซอร์คุยกับ Supabase ผ่านไฟล์นี้เท่านั้น — ตาราง/ฟังก์ชันใน DB เปิด RLS และให้สิทธิ์เฉพาะ service role
// env (ได้จาก Vercel Marketplace: Supabase): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// env เพิ่มเติม (ไม่บังคับ): ADMIN_USERNAMES=name1,name2
const crypto = require('crypto');
const { cfg, db, auth, storage, q, inList } = require('./_lib/supa');
const { assess, LIMITS } = require('./_lib/anticheat');

const ALLOWED_ORIGINS = ['https://fitt-zeta.vercel.app', 'http://localhost:8080'];
const EMAIL_DOMAIN = 'users.fittrack.invalid';   // บัญชีใช้ username ไม่เก็บอีเมลจริง
const SEXES = ['male', 'female', 'other'];
const AGES = ['u18', '18-24', '25-34', '35-44', '45+'];
const SUBMITS_PER_DAY = 30;
const SIGNUPS_PER_IP_DAY = 5;
const CARDIO_CAP = { cardio_min: 4000, distance_km: 1500 };   // ต่อสัปดาห์
const HOUR = 3600e3, DAY = 24 * HOUR;
const BADGES = {
  first_entry: 'ส่งผลครั้งแรก', pushup_20: 'วิดพื้น 20 ครั้ง', pushup_50: 'วิดพื้น 50 ครั้ง', squat_50: 'สควอท 50 ครั้ง',
  plank_60: 'แพลงก์ 1 นาที', plank_180: 'แพลงก์ 3 นาที', team_player: 'เข้าร่วมทีม', social: 'มีเพื่อน 3 คน',
  duel_win: 'ชนะการดวล', event_podium: 'ติด 3 อันดับแรกในอีเวนต์',
};

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = v => (Number.isInteger(Number(v)) ? Number(v) : NaN);
const email = u => `${u}@${EMAIL_DOMAIN}`;
const pubProfile = p => p && { id: p.id, username: p.username, display_name: p.display_name };

function periodRange(period, now = new Date()) {
  const bkk = new Date(now.getTime() + 7 * HOUR);   // ตัดรอบตามเวลาไทย
  const startOfDay = Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate()) - 7 * HOUR;
  if (period === 'week') return new Date(startOfDay - ((bkk.getUTCDay() + 6) % 7) * DAY).toISOString();   // จันทร์
  if (period === 'month') return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), 1) - 7 * HOUR).toISOString();
  return '-infinity';
}

// ── ผู้ใช้ปัจจุบัน ──
async function currentUser(req, { optional } = {}) {
  const m = /^Bearer ([\w.-]+)$/.exec(String(req.headers.authorization || ''));
  const u = m ? await auth.user(m[1]) : null;
  if (!u) { if (optional) return null; fail(401, 'กรุณาเข้าสู่ระบบ'); }
  const p = await db.one('profiles', `id=eq.${q(u.id)}&select=*`);
  if (!p) { if (optional) return null; fail(401, 'ไม่พบโปรไฟล์'); }
  const admins = String(process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim()).filter(Boolean);
  p.admin = p.is_admin || admins.includes(p.username);
  p.token = m[1];
  return p;
}
const requireAdmin = me => { if (!me.admin) fail(403, 'สำหรับผู้ดูแลเท่านั้น'); };
const notBanned = me => { if (me.banned) fail(403, 'บัญชีนี้ถูกระงับ'); };

async function giveBadge(userId, code) {
  try { await db.insert('badges', [{ user_id: userId, code }], { upsert: true, onConflict: 'user_id,code' }); } catch (e) {}
}

// ── บัญชี (P2) ──
async function signup(req, b) {
  const username = str(b.username, 40).toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) fail(400, 'ชื่อผู้ใช้ต้องเป็น a-z, 0-9, _ ยาว 3–20 ตัว');
  if (typeof b.password !== 'string' || b.password.length < 8 || b.password.length > 72) fail(400, 'รหัสผ่านต้องยาว 8–72 ตัว');
  const display_name = str(b.display_name, 24);
  if (display_name.length < 2) fail(400, 'ชื่อที่แสดงต้องยาว 2–24 ตัว');
  const sex = SEXES.includes(b.sex) ? b.sex : null;
  const age_group = AGES.includes(b.age_group) ? b.age_group : null;
  if (b.consent !== true) fail(400, 'ต้องยอมรับนโยบายข้อมูลส่วนบุคคลก่อน');
  if (age_group === 'u18' && b.guardian_consent !== true) fail(400, 'ผู้ใช้อายุต่ำกว่า 18 ปีต้องได้รับความยินยอมจากผู้ปกครอง');

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const ip_hash = crypto.createHash('sha256').update('fittrack-signup:' + ip).digest('hex').slice(0, 32);
  const recent = await db.select('signup_log', `ip_hash=eq.${ip_hash}&created_at=gte.${q(new Date(Date.now() - DAY).toISOString())}&select=ip_hash&limit=${SIGNUPS_PER_IP_DAY}`);
  if (recent.length >= SIGNUPS_PER_IP_DAY) fail(429, 'สมัครจากเครื่องนี้บ่อยเกินไป ลองใหม่พรุ่งนี้');
  if (await db.one('profiles', `username=eq.${q(username)}&select=id`)) fail(409, 'ชื่อผู้ใช้นี้มีคนใช้แล้ว');

  let user;
  try { user = await auth.createUser(email(username), b.password); }
  catch (e) {
    if (e.status === 422 || /already/i.test(e.message)) fail(409, 'ชื่อผู้ใช้นี้มีคนใช้แล้ว');
    if (/password/i.test(e.message)) fail(400, 'รหัสผ่านไม่ผ่านเงื่อนไข: ' + e.message);
    throw e;
  }
  try {
    await db.insert('profiles', [{ id: user.id, username, display_name, sex, age_group, guardian_consent: age_group === 'u18', consent_at: new Date().toISOString() }]);
  } catch (e) {
    await auth.deleteUser(user.id).catch(() => {});
    if (e.code === '23505') fail(409, 'ชื่อผู้ใช้นี้มีคนใช้แล้ว');
    throw e;
  }
  await db.insert('signup_log', [{ ip_hash }]).catch(() => {});
  return login({ username, password: b.password });
}

async function login(b) {
  const username = str(b.username, 40).toLowerCase();
  if (!username || typeof b.password !== 'string') fail(400, 'กรอกชื่อผู้ใช้และรหัสผ่าน');
  let s;
  try { s = await auth.login(email(username), b.password); }
  catch (e) {
    if (e.status === 400 || e.status === 401) fail(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    if (e.status === 429) fail(429, 'ลองเข้าสู่ระบบบ่อยเกินไป รอสักครู่');
    throw e;
  }
  return session(s);
}
const session = s => ({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600) });

async function refresh(b) {
  if (typeof b.refresh_token !== 'string' || !b.refresh_token) fail(400, 'refresh_token');
  try { return session(await auth.refresh(b.refresh_token)); }
  catch (e) { if (e.status >= 400 && e.status < 500) fail(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); throw e; }
}

async function meInfo(me) {
  const [friendRows, tm, badges] = await Promise.all([
    db.select('friends', `user_id=eq.${q(me.id)}&select=friend_id`),
    db.one('team_members', `user_id=eq.${q(me.id)}&select=team_id`),
    db.select('badges', `user_id=eq.${q(me.id)}&select=code,earned_at&order=earned_at`),
  ]);
  const friends = friendRows.length ? await db.select('profiles', `id=in.${inList(friendRows.map(f => f.friend_id))}&select=id,username,display_name&order=display_name`) : [];
  let team = null;
  if (tm) {
    const t = await db.one('teams', `id=eq.${tm.team_id}&select=id,name,invite_code`);
    const mem = await db.select('team_members', `team_id=eq.${tm.team_id}&select=user_id`);
    const people = await db.select('profiles', `id=in.${inList(mem.map(m => m.user_id))}&select=id,username,display_name`);
    team = { ...t, members: people };
  }
  return {
    profile: { id: me.id, username: me.username, display_name: me.display_name, sex: me.sex, age_group: me.age_group,
      friend_code: me.friend_code, admin: !!me.admin, banned: me.banned },
    friends, team, badges: badges.map(x => ({ ...x, name: BADGES[x.code] || x.code })),
  };
}

async function profileUpdate(me, b) {
  const patch = {};
  if (b.display_name !== undefined) {
    const d = str(b.display_name, 24);
    if (d.length < 2) fail(400, 'ชื่อที่แสดงต้องยาว 2–24 ตัว');
    patch.display_name = d;
  }
  if (b.sex !== undefined) patch.sex = SEXES.includes(b.sex) ? b.sex : null;
  if (b.age_group !== undefined) {
    patch.age_group = AGES.includes(b.age_group) ? b.age_group : null;
    if (patch.age_group === 'u18') {
      if (b.guardian_consent !== true && !me.guardian_consent) fail(400, 'ผู้ใช้อายุต่ำกว่า 18 ปีต้องได้รับความยินยอมจากผู้ปกครอง');
      patch.guardian_consent = true;
    }
  }
  if (!Object.keys(patch).length) fail(400, 'ไม่มีข้อมูลที่จะแก้');
  await db.update('profiles', `id=eq.${q(me.id)}`, patch);
  return { ok: true };
}

// ลบบัญชี: ลบผู้ใช้ใน auth (ข้อมูลทุกตารางลบตามด้วย on delete cascade) และวิดีโอหลักฐาน
async function deleteAccount(me, b) {
  if (b.confirm !== me.username) fail(400, 'พิมพ์ชื่อผู้ใช้ให้ตรงเพื่อยืนยัน');
  await storage.removeFolder(me.id).catch(() => {});
  await db.del('challenges', `created_by=eq.${q(me.id)}&kind=in.(duel,team)`);   // อีเวนต์ของผู้ดูแลเก็บไว้
  await auth.deleteUser(me.id);
  return { ok: true };
}

// ── เพื่อนและทีม ──
async function friendAdd(me, b) {
  const code = str(b.code, 20).toLowerCase();
  const f = await db.one('profiles', `friend_code=eq.${q(code)}&select=id,username,display_name`);
  if (!f) fail(404, 'ไม่พบรหัสเพื่อนนี้');
  if (f.id === me.id) fail(400, 'นี่คือรหัสของคุณเอง');
  await db.insert('friends', [{ user_id: me.id, friend_id: f.id }, { user_id: f.id, friend_id: me.id }], { upsert: true, onConflict: 'user_id,friend_id' });
  const n = await db.select('friends', `user_id=eq.${q(me.id)}&select=friend_id&limit=3`);
  if (n.length >= 3) await giveBadge(me.id, 'social');
  return { ok: true, friend: f };
}
async function friendRemove(me, b) {
  const id = str(b.id, 40);
  await db.del('friends', `or=(and(user_id.eq.${q(me.id)},friend_id.eq.${q(id)}),and(user_id.eq.${q(id)},friend_id.eq.${q(me.id)}))`);
  return { ok: true };
}
async function teamCreate(me, b) {
  notBanned(me);
  const name = str(b.name, 30);
  if (name.length < 2) fail(400, 'ชื่อทีมต้องยาว 2–30 ตัว');
  if (await db.one('team_members', `user_id=eq.${q(me.id)}&select=team_id`)) fail(409, 'ออกจากทีมเดิมก่อน');
  let t;
  try { [t] = await db.insert('teams', [{ name, created_by: me.id }]); }
  catch (e) { if (e.code === '23505') fail(409, 'ชื่อทีมนี้มีแล้ว'); throw e; }
  await db.insert('team_members', [{ team_id: t.id, user_id: me.id }]);
  await giveBadge(me.id, 'team_player');
  return { ok: true, team: { id: t.id, name: t.name, invite_code: t.invite_code } };
}
async function teamJoin(me, b) {
  notBanned(me);
  const t = await db.one('teams', `invite_code=eq.${q(str(b.code, 20).toLowerCase())}&select=id,name`);
  if (!t) fail(404, 'ไม่พบรหัสทีมนี้');
  if (await db.one('team_members', `user_id=eq.${q(me.id)}&select=team_id`)) fail(409, 'ออกจากทีมเดิมก่อน');
  const n = await db.select('team_members', `team_id=eq.${t.id}&select=user_id&limit=50`);
  if (n.length >= 50) fail(409, 'ทีมเต็มแล้ว (50 คน)');
  await db.insert('team_members', [{ team_id: t.id, user_id: me.id }]);
  await giveBadge(me.id, 'team_player');
  return { ok: true, team: t };
}
async function teamLeave(me) {
  const tm = await db.one('team_members', `user_id=eq.${q(me.id)}&select=team_id`);
  if (!tm) return { ok: true };
  await db.del('team_members', `user_id=eq.${q(me.id)}`);
  const left = await db.select('team_members', `team_id=eq.${tm.team_id}&select=user_id&limit=1`);
  if (!left.length) await db.del('teams', `id=eq.${tm.team_id}`);   // ทีมว่างแล้วลบทิ้ง
  return { ok: true };
}

// ── อันดับ (P3) ──
async function board(me, p) {
  const isCardio = p.exercise === 'cardio_min' || p.exercise === 'distance_km';
  const mode = isCardio ? 'week' : p.mode;
  if (!isCardio && !(LIMITS[p.exercise] && LIMITS[p.exercise][mode])) fail(400, 'ท่า/โหมดไม่ถูกต้อง');
  const period = isCardio ? 'week' : (['week', 'month', 'all'].includes(p.period) ? p.period : 'all');
  const args = { p_exercise: p.exercise, p_mode: mode, p_since: periodRange(period), p_limit: 100 };
  if (SEXES.includes(p.sex)) args.p_sex = p.sex;
  if (AGES.includes(p.age)) args.p_age = p.age;
  if (p.scope === 'friends' || p.scope === 'team') {
    if (!me) fail(401, 'เข้าสู่ระบบเพื่อดูอันดับเพื่อน/ทีม');
    let ids = [me.id];
    if (p.scope === 'friends') ids = ids.concat((await db.select('friends', `user_id=eq.${q(me.id)}&select=friend_id`)).map(f => f.friend_id));
    else {
      const tm = await db.one('team_members', `user_id=eq.${q(me.id)}&select=team_id`);
      if (tm) ids = (await db.select('team_members', `team_id=eq.${tm.team_id}&select=user_id`)).map(m => m.user_id);
    }
    args.p_users = ids;
  }
  const rows = await db.rpc('leaderboard', args);
  return { period, since: args.p_since, rows: rows.map(r => ({ ...r, value: Number(r.value), me: !!me && r.user_id === me.id })) };
}

// ผลที่นับเข้าการแข่งขันที่ผู้ใช้อยู่และกำลังดำเนินอยู่ (ไม่ให้ client เลือกเอง)
async function activeChallengesFor(me, exercise, mode) {
  const now = q(new Date().toISOString());
  const base = `exercise=eq.${q(exercise)}&mode=eq.${q(mode)}&status=eq.active&starts_at=lte.${now}&ends_at=gt.${now}&select=id,kind,team_a,team_b`;
  const tm = await db.one('team_members', `user_id=eq.${q(me.id)}&select=team_id`);
  const ors = [`created_by.eq.${q(me.id)}`, `opponent.eq.${q(me.id)}`];
  if (tm) ors.push(`team_a.eq.${tm.team_id}`, `team_b.eq.${tm.team_id}`);
  const mine = await db.select('challenges', `${base}&kind=in.(duel,team)&or=(${ors.join(',')})`);
  const joined = (await db.select('challenge_members', `user_id=eq.${q(me.id)}&select=challenge_id`)).map(x => x.challenge_id);
  const events = joined.length ? await db.select('challenges', `${base}&kind=eq.event&id=in.(${joined.join(',')})`) : [];
  return [...mine, ...events].map(c => c.id);
}

async function submit(me, b) {
  notBanned(me);
  const e = { exercise: b.exercise, mode: b.mode, value: Number(b.value), seconds: Math.round(Number(b.seconds)),
    trace: Array.isArray(b.trace) ? b.trace.map(a => Math.round(Number(a))) : null };
  const since = q(new Date(Date.now() - DAY).toISOString());
  const recent = await db.select('entries', `user_id=eq.${q(me.id)}&source=eq.camera&created_at=gte.${since}&select=id&limit=${SUBMITS_PER_DAY}`);
  if (recent.length >= SUBMITS_PER_DAY) fail(429, `ส่งผลได้วันละ ${SUBMITS_PER_DAY} ครั้ง`);
  const prev = await db.one('entries', `user_id=eq.${q(me.id)}&exercise=eq.${q(e.exercise)}&mode=eq.${q(e.mode)}&status=eq.ok&select=value&order=value.desc`);
  let top10Value = null;
  if (LIMITS[e.exercise] && LIMITS[e.exercise][e.mode]) {
    const top = await db.rpc('leaderboard', { p_exercise: e.exercise, p_mode: e.mode, p_limit: 10 });
    if (top.length >= 10) top10Value = Number(top[9].value);
  }
  const verdict = assess(e, { prevBest: prev ? Number(prev.value) : 0, top10Value, hasProof: false });
  if (verdict.reject) fail(400, verdict.reject);
  const [row] = await db.insert('entries', [{ user_id: me.id, exercise: e.exercise, mode: e.mode, value: e.value, seconds: e.seconds,
    source: 'camera', status: verdict.status, flags: verdict.flags, trace: e.trace }]);
  const chIds = await activeChallengesFor(me, e.exercise, e.mode);
  if (chIds.length) await db.insert('challenge_entries', chIds.map(id => ({ challenge_id: id, entry_id: row.id })));
  const newBadges = await awardEntryBadges(me.id, e, verdict.status);
  return { ok: true, id: row.id, status: verdict.status, flags: verdict.flags, needsProof: verdict.flags.includes('top10_no_proof'),
    challenges: chIds.length, badges: newBadges.map(c => ({ code: c, name: BADGES[c] })) };
}

async function awardEntryBadges(userId, e, status) {
  const have = new Set((await db.select('badges', `user_id=eq.${q(userId)}&select=code`)).map(x => x.code));
  const earn = ['first_entry'];
  if (status === 'ok') {
    if (e.exercise === 'pushup') { if (e.value >= 20) earn.push('pushup_20'); if (e.value >= 50) earn.push('pushup_50'); }
    if (e.exercise === 'squat' && e.value >= 50) earn.push('squat_50');
    if (e.exercise === 'plank') { if (e.value >= 60) earn.push('plank_60'); if (e.value >= 180) earn.push('plank_180'); }
  }
  const fresh = earn.filter(c => !have.has(c));
  for (const c of fresh) await giveBadge(userId, c);
  return fresh;
}

// คาร์ดิโอสัปดาห์นี้จาก Strava: server ดึงเองด้วย token ของผู้ใช้ (ไม่เชื่อตัวเลขจาก client)
async function stravaSubmit(me, b) {
  notBanned(me);
  if (typeof b.access_token !== 'string' || !/^[\w.-]{10,200}$/.test(b.access_token)) fail(400, 'ต้องเชื่อม Strava ก่อน');
  const since = periodRange('week');
  const after = Math.floor(new Date(since).getTime() / 1000);
  const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`, { headers: { Authorization: 'Bearer ' + b.access_token } });
  if (r.status === 401) fail(401, 'Strava หมดอายุ เชื่อมใหม่อีกครั้ง');
  if (!r.ok) fail(502, 'ดึงข้อมูลจาก Strava ไม่สำเร็จ');
  const acts = (await r.json()).filter(a => !a.manual);   // กิจกรรมที่พิมพ์เองไม่นับเข้าอันดับ
  const minutes = Math.round(acts.reduce((s, a) => s + (a.moving_time || 0), 0) / 60);
  const km = Math.round(acts.reduce((s, a) => s + (a.distance || 0), 0) / 100) / 10;
  const week = 'week-' + since.slice(0, 10);
  const rows = [['cardio_min', minutes], ['distance_km', km]].map(([exercise, value]) => ({
    user_id: me.id, exercise, mode: 'week', value: Math.min(value, CARDIO_CAP[exercise]), seconds: 0, source: 'strava',
    status: value > CARDIO_CAP[exercise] ? 'review' : 'ok', flags: value > CARDIO_CAP[exercise] ? ['high_value'] : [],
    strava_id: week + ':' + exercise, created_at: new Date().toISOString(),
  }));
  await db.insert('entries', rows, { upsert: true, onConflict: 'user_id,strava_id' });
  return { ok: true, minutes, km, activities: acts.length };
}

// ── หลักฐานวิดีโอ (P5) ──
async function ownEntry(me, id) {
  const e = await db.one('entries', `id=eq.${int(id)}&user_id=eq.${q(me.id)}&select=*`);
  if (!e) fail(404, 'ไม่พบผลนี้');
  return e;
}
async function proofUrl(me, b) {
  const e = await ownEntry(me, b.entry_id);
  if (e.source !== 'camera') fail(400, 'แนบวิดีโอได้เฉพาะผลจากกล้อง');
  const ext = b.type === 'video/mp4' ? 'mp4' : 'webm';
  const path = `${me.id}/${e.id}.${ext}`;
  return { url: await storage.uploadUrl(path), path };
}
async function proofDone(me, b) {
  const e = await ownEntry(me, b.entry_id);
  const path = str(b.path, 120);
  if (!new RegExp(`^${me.id}/${e.id}\\.(webm|mp4)$`).test(path)) fail(400, 'path');
  if (!(await storage.exists(path))) fail(400, 'ยังไม่พบไฟล์วิดีโอ');
  const flags = (e.flags || []).filter(f => f !== 'top10_no_proof');
  // เหลือ flag อื่นยังต้องรอผู้ดูแล ถ้าไม่เหลือก็ขึ้นอันดับได้เลย
  const status = e.status === 'rejected' ? 'rejected' : flags.length ? 'review' : 'ok';
  await db.update('entries', `id=eq.${e.id}`, { proof_path: path, flags, status });
  if (status === 'ok') await awardEntryBadges(me.id, e, 'ok');
  return { ok: true, status };
}
async function proofView(me, b) {
  const e = await db.one('entries', `id=eq.${int(b.entry_id)}&select=user_id,proof_path`);
  if (!e || !e.proof_path) fail(404, 'ไม่มีวิดีโอ');
  if (e.user_id !== me.id && !me.admin) fail(403, 'ดูได้เฉพาะเจ้าของหรือผู้ดูแล');
  return { url: await storage.readUrl(e.proof_path) };
}

async function report(me, b) {
  notBanned(me);
  const id = int(b.entry_id);
  const reason = str(b.reason, 300);
  if (reason.length < 2) fail(400, 'ระบุเหตุผล');
  const e = await db.one('entries', `id=eq.${id}&select=id,user_id,status,flags`);
  if (!e) fail(404, 'ไม่พบผลนี้');
  if (e.user_id === me.id) fail(400, 'รายงานผลของตัวเองไม่ได้');
  try { await db.insert('reports', [{ entry_id: id, reporter: me.id, reason }]); }
  catch (err) { if (err.code === '23505') fail(409, 'คุณรายงานผลนี้ไปแล้ว'); throw err; }
  const open = await db.select('reports', `entry_id=eq.${id}&resolved=is.false&select=id&limit=3`);
  if (open.length >= 3 && e.status === 'ok') {   // ถูกรายงาน 3 คนขึ้นไป ซ่อนจากอันดับรอผู้ดูแล
    await db.update('entries', `id=eq.${id}`, { status: 'review', flags: [...new Set([...(e.flags || []), 'reported'])] });
  }
  return { ok: true };
}

// ── การแข่งขัน (P4) ──
async function duelCreate(me, b) {
  notBanned(me);
  if (!(LIMITS[b.exercise] && LIMITS[b.exercise][b.mode])) fail(400, 'ท่า/โหมดไม่ถูกต้อง');
  const open = await db.select('challenges', `created_by=eq.${q(me.id)}&kind=eq.duel&status=eq.open&select=id&limit=5`);
  if (open.length >= 5) fail(429, 'มีคำท้าที่ยังไม่มีคนรับ 5 รายการแล้ว');
  const [c] = await db.insert('challenges', [{ kind: 'duel', title: 'ดวล ' + me.display_name, exercise: b.exercise, mode: b.mode,
    created_by: me.id, status: 'open', ends_at: new Date(Date.now() + 7 * DAY).toISOString() }]);   // รหัสเชิญมีอายุ 7 วัน
  return { ok: true, id: c.id, invite_code: c.invite_code };
}
async function duelAnswer(me, b, accept) {
  notBanned(me);
  const c = await db.one('challenges', `invite_code=eq.${q(str(b.code, 20).toLowerCase())}&kind=eq.duel&select=*`);
  if (!c) fail(404, 'ไม่พบรหัสดวลนี้');
  if (c.created_by === me.id) fail(400, 'รับคำท้าของตัวเองไม่ได้');
  if (c.status !== 'open' || new Date(c.ends_at) < new Date()) fail(409, 'คำท้านี้ปิดไปแล้ว');
  const now = Date.now();
  const patch = accept ? { opponent: me.id, status: 'active', starts_at: new Date(now).toISOString(), ends_at: new Date(now + DAY).toISOString() }
    : { opponent: me.id, status: 'declined' };
  // เงื่อนไข status=open กันสองคนรับพร้อมกัน
  const upd = await db.update('challenges', `id=eq.${c.id}&status=eq.open`, patch);
  if (!upd.length) fail(409, 'มีคนรับคำท้านี้ไปแล้ว');
  return { ok: true, id: c.id };
}
async function teamChallengeCreate(me, b) {
  notBanned(me);
  if (!(LIMITS[b.exercise] && LIMITS[b.exercise][b.mode])) fail(400, 'ท่า/โหมดไม่ถูกต้อง');
  const tm = await db.one('team_members', `user_id=eq.${q(me.id)}&select=team_id`);
  if (!tm) fail(400, 'ต้องอยู่ในทีมก่อน');
  const other = await db.one('teams', `invite_code=eq.${q(str(b.code, 20).toLowerCase())}&select=id,name`);
  if (!other) fail(404, 'ไม่พบรหัสทีมคู่แข่ง');
  if (other.id === tm.team_id) fail(400, 'แข่งกับทีมตัวเองไม่ได้');
  const days = Math.min(14, Math.max(1, int(b.days) || 7));
  const mine = await db.one('teams', `id=eq.${tm.team_id}&select=name`);
  const [c] = await db.insert('challenges', [{ kind: 'team', title: `${mine.name} vs ${other.name}`.slice(0, 80), exercise: b.exercise, mode: b.mode,
    created_by: me.id, team_a: tm.team_id, team_b: other.id, status: 'active', ends_at: new Date(Date.now() + days * DAY).toISOString() }]);
  return { ok: true, id: c.id };
}
async function eventCreate(me, b) {
  requireAdmin(me);
  if (!(LIMITS[b.exercise] && LIMITS[b.exercise][b.mode])) fail(400, 'ท่า/โหมดไม่ถูกต้อง');
  const title = str(b.title, 80);
  if (title.length < 2) fail(400, 'ตั้งชื่ออีเวนต์');
  const starts = new Date(b.starts_at || Date.now()), ends = new Date(b.ends_at);
  if (isNaN(starts) || isNaN(ends) || ends <= starts) fail(400, 'วันเวลาไม่ถูกต้อง');
  const [c] = await db.insert('challenges', [{ kind: 'event', title, exercise: b.exercise, mode: b.mode, created_by: me.id,
    status: 'active', starts_at: starts.toISOString(), ends_at: ends.toISOString() }]);
  return { ok: true, id: c.id };
}
async function eventJoin(me, b) {
  notBanned(me);
  const c = await db.one('challenges', `id=eq.${int(b.id)}&kind=eq.event&select=id,status,ends_at`);
  if (!c || c.status !== 'active' || new Date(c.ends_at) < new Date()) fail(404, 'อีเวนต์นี้ปิดแล้วหรือไม่มีอยู่');
  await db.insert('challenge_members', [{ challenge_id: c.id, user_id: me.id }], { upsert: true, onConflict: 'challenge_id,user_id' });
  return { ok: true };
}

// ปิดการแข่งที่หมดเวลา และให้เหรียญผู้ชนะ (ทำตอนมีคนเปิดดู ไม่ต้องมี cron)
async function closeExpired() {
  const now = q(new Date().toISOString());
  const done = await db.update('challenges', `status=in.(open,active)&ends_at=lte.${now}`, { status: 'closed' });
  for (const c of done) {
    if (c.kind === 'duel' && c.opponent) {
      const rows = await db.rpc('leaderboard', { p_exercise: c.exercise, p_mode: c.mode, p_challenge: c.id, p_limit: 2 });
      if (rows.length && (rows.length === 1 || Number(rows[0].value) > Number(rows[1].value))) await giveBadge(rows[0].user_id, 'duel_win');
    } else if (c.kind === 'event') {
      const rows = await db.rpc('leaderboard', { p_exercise: c.exercise, p_mode: c.mode, p_challenge: c.id, p_limit: 3 });
      for (const r of rows) if (r.rank <= 3) await giveBadge(r.user_id, 'event_podium');
    }
  }
  return done.length;
}

async function challenges(me) {
  await closeExpired();
  const since = q(new Date(Date.now() - 14 * DAY).toISOString());
  const sel = 'select=id,kind,title,exercise,mode,starts_at,ends_at,status,invite_code,created_by,opponent,team_a,team_b';
  const events = await db.select('challenges', `kind=eq.event&ends_at=gte.${since}&${sel}&order=ends_at.desc&limit=20`);
  let mine = [];
  if (me) {
    const tm = await db.one('team_members', `user_id=eq.${q(me.id)}&select=team_id`);
    const ors = [`created_by.eq.${q(me.id)}`, `opponent.eq.${q(me.id)}`];
    if (tm) ors.push(`team_a.eq.${tm.team_id}`, `team_b.eq.${tm.team_id}`);
    mine = await db.select('challenges', `kind=in.(duel,team)&or=(${ors.join(',')})&ends_at=gte.${since}&${sel}&order=created_at.desc&limit=30`);
  }
  const joined = me && events.length
    ? new Set((await db.select('challenge_members', `user_id=eq.${q(me.id)}&challenge_id=in.(${events.map(e => e.id).join(',')})&select=challenge_id`)).map(x => x.challenge_id))
    : new Set();
  const userIds = [...new Set(mine.flatMap(c => [c.created_by, c.opponent]).filter(Boolean))];
  const people = userIds.length ? await db.select('profiles', `id=in.${inList(userIds)}&select=id,username,display_name`) : [];
  const who = id => pubProfile(people.find(p => p.id === id)) || null;
  const out = [];
  for (const c of [...events, ...mine]) {
    const item = { id: c.id, kind: c.kind, title: c.title, exercise: c.exercise, mode: c.mode, starts_at: c.starts_at, ends_at: c.ends_at, status: c.status };
    if (c.kind === 'event') {
      item.joined = joined.has(c.id);
      item.top = (await db.rpc('leaderboard', { p_exercise: c.exercise, p_mode: c.mode, p_challenge: c.id, p_limit: 10 })).map(r => ({ ...r, value: Number(r.value), me: !!me && r.user_id === me.id }));
    } else if (c.kind === 'duel') {
      item.creator = who(c.created_by); item.opponent = who(c.opponent);
      if (me && c.created_by === me.id && c.status === 'open') item.invite_code = c.invite_code;
      const rows = c.opponent ? await db.rpc('leaderboard', { p_exercise: c.exercise, p_mode: c.mode, p_challenge: c.id, p_limit: 2 }) : [];
      item.scores = rows.map(r => ({ user_id: r.user_id, display_name: r.display_name, value: Number(r.value) }));
    } else {
      item.teams = (await db.rpc('team_scores', { p_challenge: c.id })).map(t => ({ ...t, score: Number(t.score), members: Number(t.members) }));
    }
    out.push(item);
  }
  return { challenges: out };
}

// ── ผู้ดูแล (P5) ──
async function adminQueue(me) {
  requireAdmin(me);
  const entries = await db.select('entries', 'status=eq.review&select=id,user_id,exercise,mode,value,seconds,source,flags,trace,proof_path,created_at&order=created_at&limit=50');
  const reports = await db.select('reports', 'resolved=is.false&select=id,entry_id,reporter,reason,created_at&order=created_at&limit=50');
  const ids = [...new Set([...entries.map(e => e.user_id), ...reports.map(r => r.reporter)])];
  const people = ids.length ? await db.select('profiles', `id=in.${inList(ids)}&select=id,username,display_name,banned`) : [];
  const who = id => people.find(p => p.id === id) || null;
  for (const e of entries) {
    e.user = who(e.user_id);
    e.value = Number(e.value);
    e.proof_url = e.proof_path ? await storage.readUrl(e.proof_path).catch(() => null) : null;
  }
  return { entries, reports: reports.map(r => ({ ...r, reporter: pubProfile(who(r.reporter)) })) };
}
async function adminReview(me, b) {
  requireAdmin(me);
  if (!['ok', 'rejected'].includes(b.decision)) fail(400, 'decision');
  const upd = await db.update('entries', `id=eq.${int(b.entry_id)}`, { status: b.decision });
  if (!upd.length) fail(404, 'ไม่พบผลนี้');
  await db.update('reports', `entry_id=eq.${upd[0].id}`, { resolved: true });
  if (b.decision === 'ok') await awardEntryBadges(upd[0].user_id, { ...upd[0], value: Number(upd[0].value) }, 'ok');
  return { ok: true };
}
async function adminResolveReport(me, b) {
  requireAdmin(me);
  await db.update('reports', `id=eq.${int(b.id)}`, { resolved: true });
  return { ok: true };
}
async function adminBan(me, b) {
  requireAdmin(me);
  const id = str(b.user_id, 40);
  if (id === me.id) fail(400, 'ระงับบัญชีตัวเองไม่ได้');
  const upd = await db.update('profiles', `id=eq.${q(id)}`, { banned: b.banned !== false });
  if (!upd.length) fail(404, 'ไม่พบผู้ใช้');
  return { ok: true };
}

// ── router ──
const PUBLIC_GET = { board: (me, p) => board(me, p), challenges: me => challenges(me) };
const AUTH_POST = {
  me: me => meInfo(me), profile_update: profileUpdate, delete_account: deleteAccount,
  logout: async me => { await auth.logout(me.token).catch(() => {}); return { ok: true }; },
  friend_add: friendAdd, friend_remove: friendRemove, team_create: teamCreate, team_join: teamJoin, team_leave: teamLeave,
  submit, strava_submit: stravaSubmit, proof_url: proofUrl, proof_done: proofDone, proof_view: proofView, report,
  duel_create: duelCreate, duel_accept: (me, b) => duelAnswer(me, b, true), duel_decline: (me, b) => duelAnswer(me, b, false),
  team_challenge_create: teamChallengeCreate, event_create: eventCreate, event_join: eventJoin,
  admin_queue: adminQueue, admin_review: adminReview, admin_resolve_report: adminResolveReport, admin_ban: adminBan,
};

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Cache-Control', 'no-store');
  if (origin) {
    if (!ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ error: 'origin' });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    return res.status(204).end();
  }
  if (!cfg()) return res.status(503).json({ error: 'not_configured' });

  const action = String((req.query && req.query.action) || '');
  try {
    let out;
    if (req.method === 'GET' && PUBLIC_GET[action]) {
      out = await PUBLIC_GET[action](await currentUser(req, { optional: true }), req.query || {});
    } else if (req.method === 'POST' && action === 'signup') out = await signup(req, readBody(req));
    else if (req.method === 'POST' && action === 'login') out = await login(readBody(req));
    else if (req.method === 'POST' && action === 'refresh') out = await refresh(readBody(req));
    else if (req.method === 'POST' && AUTH_POST[action]) out = await AUTH_POST[action](await currentUser(req), readBody(req));
    else return res.status(400).json({ error: 'bad_request' });
    return res.json(out);
  } catch (e) {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
    console.error('social', action, e.status || '', e.code || '', e.message);
    return res.status(502).json({ error: 'ระบบขัดข้อง ลองใหม่อีกครั้ง' });
  }
};
module.exports._test = { periodRange, BADGES };
