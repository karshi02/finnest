// ตรวจผลที่ส่งเข้าอันดับ ฝั่ง server (เบราว์เซอร์ปลอมค่าได้เสมอ จึงต้องตรวจซ้ำที่นี่)
// ผลแบ่งเป็น: reject (ไม่รับเลย) / review (เก็บไว้ แต่ไม่ขึ้นอันดับจนผู้ดูแลอนุมัติ) / ok

// hard = เกินนี้ไม่รับ, review = เกินนี้ต้องให้ผู้ดูแลดู
const LIMITS = {
  pushup: { timed60: { hard: 100, review: 70 }, max: { hard: 400, review: 120 } },
  squat:  { timed60: { hard: 90,  review: 60 }, max: { hard: 600, review: 150 } },
  plank:  { hold:    { hard: 3600, review: 600 } },
};
// เกณฑ์มุมหลวมกว่าตัวนับในแอปเล็กน้อย (index.html: REP_RULES) เพราะร่องรอยเก็บแค่ 10 ครั้ง/วินาที อาจพลาดจุดต่ำสุด
const REP_RULE = { pushup: { down: 105, up: 145 }, squat: { down: 105, up: 155 } };
const TRACE_HZ = 10;

// นับจังหวะขึ้น–ลงจากร่องรอยมุม (−1 = เฟรมที่มองไม่เห็นตัว)
function countTraceReps(trace, exercise) {
  const rule = REP_RULE[exercise];
  if (!rule || !Array.isArray(trace)) return 0;
  let phase = 'wait', reps = 0;
  for (const a of trace) {
    if (typeof a !== 'number' || a < 0) continue;
    if (phase === 'wait') { if (a > rule.up) phase = 'up'; continue; }
    if (phase === 'up' && a <= rule.down) phase = 'down';
    else if (phase === 'down' && a > rule.up) { reps++; phase = 'up'; }
  }
  return reps;
}

function validateShape(e) {
  const lim = LIMITS[e.exercise] && LIMITS[e.exercise][e.mode];
  if (!lim) return 'ท่า/โหมดไม่ถูกต้อง';
  if (typeof e.value !== 'number' || !isFinite(e.value) || e.value <= 0) return 'ผลต้องมากกว่า 0';
  if (e.exercise !== 'plank' && !Number.isInteger(e.value)) return 'จำนวนครั้งต้องเป็นจำนวนเต็ม';
  if (e.value > lim.hard) return 'ผลสูงเกินกว่าที่เป็นไปได้';
  if (!Number.isInteger(e.seconds) || e.seconds < 1 || e.seconds > 3600) return 'เวลาไม่ถูกต้อง';
  if (e.mode === 'timed60' && (e.seconds < 50 || e.seconds > 75)) return 'โหมด 60 วินาทีต้องใช้เวลาประมาณ 60 วินาที';
  if (e.exercise === 'plank' && e.value > e.seconds + 1) return 'เวลาค้างมากกว่าเวลาทั้งหมด';
  if (!Array.isArray(e.trace) || e.trace.length > 40000 || e.trace.some(a => typeof a !== 'number' || a < -1 || a > 180)) return 'ร่องรอยท่าทางไม่ถูกต้อง';
  return null;
}

// ctx: { prevBest, top10Value (ค่าที่ 10 ของอันดับรวม หรือ null ถ้ายังไม่ถึง 10 คน), hasProof }
function assess(e, ctx = {}) {
  const err = validateShape(e);
  if (err) return { reject: err };
  const lim = LIMITS[e.exercise][e.mode];
  const flags = [];
  const expectSamples = e.seconds * TRACE_HZ;
  if (e.trace.length < expectSamples * 0.5) flags.push('trace_short');
  if (e.exercise === 'plank') {
    const visible = e.trace.filter(a => a >= 0).length / TRACE_HZ;
    if (visible < e.value * 0.85) flags.push('trace_mismatch');
  } else if (countTraceReps(e.trace, e.exercise) < Math.floor(e.value * 0.9)) {
    flags.push('trace_mismatch');
  }
  if (e.value > lim.review) flags.push('high_value');
  if (ctx.prevBest >= 5 && e.value > ctx.prevBest * 1.5 + 5) flags.push('jump');
  if (ctx.top10Value != null && e.value >= ctx.top10Value && !ctx.hasProof) flags.push('top10_no_proof');
  return { status: flags.length ? 'review' : 'ok', flags };
}

module.exports = { LIMITS, REP_RULE, countTraceReps, validateShape, assess };
