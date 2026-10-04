# แนวทางการแก้ไข FitTrack Pro

อ้างอิงปัญหาจาก [REVIEW.md](REVIEW.md) เอกสารนี้บอกวิธีแก้ทีละข้อ พร้อมโค้ดตัวอย่างที่เขียนให้เข้ากับสไตล์ของ `index.html` เดิม
เลขบรรทัดอ้างอิง commit `5f91207`

แบ่งเป็น 4 รอบ แต่ละรอบ deploy แยกกันได้

---

## รอบ 1: กันข้อมูลหาย

### 1.1 โหลด state อย่างปลอดภัย

**ปัญหา:** `index.html:812` parse ข้อมูลโดยไม่มี try/catch ถ้าข้อมูลเสีย แอปจะเปิดไม่ขึ้นเลย
**แนวทาง:** ถ้า parse ไม่ได้ ให้สำรองข้อมูลดิบไว้ที่ key ใหม่ก่อน แล้วเริ่ม state ว่าง จะได้ไม่มีอะไรหายถาวร

แทนที่บรรทัด 812–817 ด้วย:

```js
const STORE_KEY = 'fittrack';

function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  let s = {};
  try {
    s = JSON.parse(raw || '{}');
    if (!s || typeof s !== 'object') s = {};
  } catch (e) {
    // เก็บข้อมูลเสียไว้ เผื่อกู้ด้วยมือได้
    localStorage.setItem(STORE_KEY + '-corrupt-' + Date.now(), raw);
    alert('ข้อมูลเดิมเสียหาย ระบบสำรองไว้แล้วและเริ่มใหม่');
  }
  if (!Array.isArray(s.sessions)) s.sessions = [];
  if (!Array.isArray(s.cardioLog)) s.cardioLog = [];
  if (!Array.isArray(s.todaySets)) s.todaySets = [];
  return s;
}

let state = loadState();

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    alert('บันทึกไม่สำเร็จ — พื้นที่เก็บข้อมูลอาจเต็ม กรุณา Export ข้อมูลไว้');
  }
}
```

### 1.2 Export / Import

**แนวทาง:** export ออกมาเป็นไฟล์ JSON ที่มี `version` กำกับ ฝั่ง import ต้องตรวจโครงสร้างก่อน และให้ผู้ใช้กดยืนยันก่อนเขียนทับ

HTML: วางไว้ใน dashboard ถัดจากปุ่ม "+ บันทึกออกกำลังกาย"

```html
<div class="flex-gap">
  <button class="btn btn-secondary btn-sm" onclick="exportData()">⬇ Export</button>
  <button class="btn btn-secondary btn-sm" onclick="document.getElementById('import-file').click()">⬆ Import</button>
  <input type="file" id="import-file" accept="application/json" style="display:none" onchange="importData(this.files[0]); this.value=''" />
  <button class="btn btn-primary" onclick="openLogModal()">+ บันทึกออกกำลังกาย</button>
</div>
```

JS:

```js
function exportData() {
  const payload = { app: 'fittrack', version: 1, exportedAt: new Date().toISOString(), state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fittrack-backup-${todayStr()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let s;
    try {
      const data = JSON.parse(reader.result);
      s = data.state || data;
      if (!Array.isArray(s.sessions) || !Array.isArray(s.cardioLog)) throw new Error('invalid');
    } catch (e) {
      alert('ไฟล์ไม่ถูกต้อง');
      return;
    }
    if (!confirm(`นำเข้า ${s.sessions.length} sessions และ ${s.cardioLog.length} คาร์ดิโอ?\nข้อมูลปัจจุบันจะถูกแทนที่`)) return;
    state = { sessions: s.sessions, cardioLog: s.cardioLog, todaySets: Array.isArray(s.todaySets) ? s.todaySets : [] };
    save();
    renderDashboard();
  };
  reader.readAsText(file);
}
```

> **สำคัญ (security):** ก่อนเพิ่มปุ่ม Import ทุกฟิลด์ที่แสดงผลมาจาก `localStorage` เท่านั้น แต่เมื่อมี Import แล้ว ไฟล์จากภายนอกจะส่งค่าอะไรเข้ามาก็ได้ ฟิลด์ที่ตอนนี้ไม่ได้ escape อาจถูกใช้ฝังสคริปต์ (XSS) ได้ ต้องครอบด้วย `esc()` ให้ครบ:
> - `renderRecentLog`: `item.type`, `item.duration`, `item.distance`
> - `renderSetLog`: `s.exName`, `s.weight`, `s.reps`, `s.rir`
> - `renderWeightHistory`: `s.sets.length`
> - `renderCardioHistory`: `c.type`, `c.duration`, `c.distance`, `c.hr`, `c.kcal`, `c.intensity`
> - สี badge `MUSCLE_COLORS[s.muscle]`: ถ้า `muscle` ไม่อยู่ใน map จะได้ `undefined` ควรมีสี fallback `|| '#888'`

### 1.3 Pin Chart.js และให้แอปทำงานได้แม้ Chart.js ยังไม่โหลด

**แนวทาง A (แนะนำ):** ดาวน์โหลดมาเก็บในโปรเจกต์เอง จะได้ทำงานออฟไลน์ได้ตั้งแต่ครั้งแรก

```bash
mkdir vendor
curl -L -o vendor/chart.umd.min.js https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js
```

```html
<script src="vendor/chart.umd.min.js"></script>
```

แล้วเพิ่ม `'./vendor/chart.umd.min.js'` ลงใน `SHELL` ใน `sw.js`

**แนวทาง B:** ใช้ CDN ต่อไป แต่ pin เวอร์ชัน

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
```

**ทั้งสองแนวทาง:** เพิ่ม guard ไว้ต้นฟังก์ชัน `renderWeeklyChart`, `renderMuscleChart` และ `renderCardioChart`

```js
if (typeof Chart === 'undefined') return;
```

---

## รอบ 2: ความถูกต้อง

### 2.1 ตรวจและจำกัดค่าที่กรอก

**แนวทาง:** เขียน helper ตัวเดียวแล้วใช้ทุกฟอร์ม ไม่พึ่งแอตทริบิวต์ `min`/`max` ของ HTML เพราะ JS ไม่ได้บังคับค่าตามนั้น

```js
// คืนค่าตัวเลขเมื่ออยู่ในช่วง ไม่เช่นนั้นคืน null
function num(id, { min = 0, max = Infinity, int = false } = {}) {
  const raw = document.getElementById(id).value;
  const v = int ? parseInt(raw, 10) : parseFloat(raw);
  return (isNaN(v) || v < min || v > max) ? null : v;
}
```

ใช้ใน `addWeightSet` (`index.html:987`):

```js
const w = num('log-weight', { min: 0, max: 1000 }) ?? 0;
const reps = num('log-reps', { min: 1, max: 100, int: true });
const sets = num('log-sets', { min: 1, max: 20, int: true }) ?? 1;
const rir = num('log-rir', { min: 0, max: 10, int: true });
if (!exId || reps === null) { alert('กรุณาเลือกท่าและกรอก Reps (1–100)'); return; }
```

ใช้ใน `calc1RM` (`index.html:1411`):

```js
const w = num('orm-weight', { min: 1, max: 1000 });
const r = num('orm-reps', { min: 1, max: 30, int: true });
if (w === null || r === null) { alert('น้ำหนัก > 0 และ Reps 1–30'); return; }
```

> สูตร Brzycki แม่นแค่ช่วงประมาณ 1–10 reps ถ้า `r > 10` อาจแสดงผลแค่ Epley พร้อมหมายเหตุว่าค่าประมาณคลาดเคลื่อนสูง

ใช้ใน `logCardio` / `saveQuickLog` สำหรับ duration (`min: 1, max: 1440`), distance, hr (`min: 30, max: 230`) และ kcal ด้วย

### 2.2 รวมวันที่ให้อยู่ในรูปแบบเดียว

**แนวทาง:** เก็บเป็น `YYYY-MM-DD` ตามเวลาท้องถิ่นทุกที่ และ parse แบบท้องถิ่น ไม่ให้ JS ตีความเป็น UTC

```js
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() { return localDateStr(new Date()); }

// 'YYYY-MM-DD' ให้อ่านเป็นเที่ยงคืนท้องถิ่น ส่วน ISO เต็มใช้ตามเดิม
function parseLocalDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  return m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(str);
}
```

จากนั้น:
- เปลี่ยน `new Date(item.date)`, `new Date(s.date)`, `new Date(c.date)` ทุกจุดเป็น `parseLocalDate(...)`
- `saveSession` ให้เก็บ `date` เป็น `localDateStr(...)` และเก็บ `ts` ไว้สำหรับเรียงลำดับในวันเดียวกัน
- migration ข้อมูลเก่า (ทำครั้งเดียวใน `loadState`):

```js
s.sessions.forEach(x => {
  if (x.date && x.date.length > 10) { x.ts = x.ts || Date.parse(x.date); x.date = localDateStr(new Date(x.date)); }
});
```

### 2.3 Set ที่ค้างข้ามวัน

**แนวทาง:** ใช้วันที่ของ set แรกเป็นวันที่ของ session และแจ้งผู้ใช้เมื่อพบ set ที่ค้างจากวันก่อน

ใน `saveSession` (`index.html:1036`):

```js
const first = state.todaySets[0];
const date = localDateStr(new Date(first.ts));
state.sessions.push({ id: newId(), date, ts: first.ts, sets: [...state.todaySets], volume: vol, muscles, cals: 0 });
```

ใน `renderSetLog` แสดงคำเตือนเมื่อ `localDateStr(new Date(state.todaySets[0].ts)) !== todayStr()`:

```js
const stale = state.todaySets.length && localDateStr(new Date(state.todaySets[0].ts)) !== todayStr();
// ถ้า stale: แสดง <div class="badge badge-orange">มี set ค้างจากวันก่อน — กดบันทึก Session หรือลบทิ้ง</div>
```

### 2.4 กราฟ "7 วันล่าสุด"

**แนวทาง:** สร้าง key ของ 7 วันย้อนหลังตามวันที่จริง แล้วรวมข้อมูลตาม key แทนการใช้ `getDay()` วิธีนี้ทำให้ข้อมูลที่ลงวันในอนาคตไม่ถูกนับ และลำดับแท่งในกราฟถูกต้อง

```js
function renderWeeklyChart() {
  if (typeof Chart === 'undefined') return;
  const dayTh = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const keys = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return localDateStr(d); });
  const vol = Object.fromEntries(keys.map(k => [k, 0]));
  const car = Object.fromEntries(keys.map(k => [k, 0]));
  state.sessions.forEach(s => { if (s.date in vol) vol[s.date] += (s.volume || 0) / 1000; });
  state.cardioLog.forEach(c => { if (c.date in car) car[c.date] += (c.duration || 0); });
  const labels = keys.map(k => dayTh[parseLocalDate(k).getDay()]);
  // ...สร้าง Chart เหมือนเดิม โดยใช้ labels, keys.map(k => vol[k]) และ keys.map(k => car[k])
}
```

เปลี่ยนหัวข้อการ์ด (`index.html:317`) เป็น "7 วันล่าสุด"

### 2.5 แก้ไข / ลบประวัติ

**แนวทาง:** ใส่ `id` ให้ทุก record แล้วลบหรือแก้ไขผ่าน id แทน index เพราะตอนแสดงผลรายการถูก `reverse()` ทำให้ index ไม่ตรงกับข้อมูลจริง

```js
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// migration ใน loadState
[...s.sessions, ...s.cardioLog].forEach(x => { if (!x.id) x.id = newId(); });

function deleteSession(id) {
  if (!confirm('ลบ session นี้?')) return;
  state.sessions = state.sessions.filter(s => s.id !== id);
  save(); renderWeightHistory(); renderDashboard();
}
function deleteCardio(id) {
  if (!confirm('ลบรายการนี้?')) return;
  state.cardioLog = state.cardioLog.filter(c => c.id !== id);
  save(); renderCardioHistory(); renderDashboard();
}
```

เพิ่มปุ่ม `<button class="btn btn-danger btn-sm" aria-label="ลบ" onclick="deleteSession('${s.id}')">✕</button>` ในการ์ดประวัติแต่ละรายการ
ทุกจุดที่สร้าง record ใหม่ (`logCardio`, `saveQuickLog`, `saveSession`) ต้องใส่ `id: newId()`
ส่วนการแก้ไข: ทำ modal ที่เติมค่าเดิมให้ แล้ว `Object.assign(record, newValues)` ให้ทำหลังจากลบได้แล้ว

### 2.6 ตารางล้นจอมือถือ

CSS:

```css
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
```

ครอบทุก `<table>` ที่สร้างใน JS (`renderRecentLog`, `renderCardioHistory`, `calcZones`, `calc1RM`):

```js
el.innerHTML = `<div class="table-wrap"><table>...</table></div>`;
```

---

## รอบ 3: UX และการแจ้งเตือน

### 3.1 เสียงนาฬิกาพัก

**แนวทาง:** สร้าง `AudioContext` ครั้งเดียวตอนผู้ใช้กด "เริ่ม" (นับเป็น user gesture) แล้วใช้ซ้ำทุกครั้ง

```js
let audioCtx = null;
function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function beep() {
  if (!audioCtx) return;
  const ctx = audioCtx;
  [0, 0.25, 0.5].forEach(t => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.3, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
    o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
  });
}
```

เรียก `unlockAudio()` ใน `startTimer()` ต่อจาก `requestNotifyPermission()`

### 3.2 กันจอดับระหว่างพัก (Wake Lock)

```js
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
    }
  } catch (e) {}
}
```

เรียก `keepAwake(true)` ใน `startTimer` และเรียก `keepAwake(false)` ตอนหยุด, รีเซ็ต หรือหมดเวลา

### 3.3 Modal

```js
function closeLogModal() {
  document.getElementById('log-modal').classList.remove('open');
  ['modal-duration', 'modal-cals', 'modal-note'].forEach(id => { document.getElementById(id).value = ''; });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLogModal(); });
document.getElementById('log-modal').addEventListener('click', e => { if (e.target.id === 'log-modal') closeLogModal(); });
```

เพิ่ม `role="dialog" aria-modal="true" aria-labelledby="modal-title"` ที่ `.modal`

### 3.4 Toast แทน alert

```css
.toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--surface2);
  border: 1px solid var(--border); padding: 12px 20px; border-radius: 10px; z-index: 300; opacity: 0; transition: opacity .2s; }
.toast.show { opacity: 1; }
```

```js
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}
```

ใช้ `toast()` แทน `alert()` ที่เป็นข้อความแจ้งว่าสำเร็จ ส่วน `alert()` ที่แจ้ง error ให้คงไว้ได้

### 3.5 กราฟกล้ามเนื้อตอนว่าง

แทนการวาดข้อความลง canvas (`index.html:930-936`) ให้ซ่อน canvas แล้วแสดง empty state:

```js
const canvas = document.getElementById('chartMuscle');
if (!data.length) {
  canvas.style.display = 'none';
  canvas.insertAdjacentHTML('afterend', '<div class="empty-state" id="muscle-empty">ยังไม่มีข้อมูล</div>');
  return;
}
canvas.style.display = '';
document.getElementById('muscle-empty')?.remove();
```

(ก่อน insert ให้เช็กก่อนว่ามี `#muscle-empty` อยู่แล้วหรือยัง จะได้ไม่ซ้อนกันหลายอัน)

---

## รอบ 4: PWA และโครงสร้าง

### 4.1 Service worker

```js
const CACHE = 'fittrack-v2';   // เปลี่ยนทุกครั้งที่ deploy
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './vendor/chart.umd.min.js'];

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;  // cache เฉพาะไฟล์ของตัวเอง
  // ...stale-while-revalidate เหมือนเดิม
});
```

แจ้งผู้ใช้เมื่อมีเวอร์ชันใหม่ (ใส่ในส่วน INIT ของ `index.html`):

```js
const hadController = !!navigator.serviceWorker.controller;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (hadController) toast('มีเวอร์ชันใหม่ — รีโหลดหน้าเพื่ออัปเดต');
});
```

(ต้องมี `hadController` เพราะตอนติดตั้ง SW ครั้งแรก `clients.claim()` ก็ทำให้ `controllerchange` ทำงานเหมือนกัน)

### 4.2 Manifest

สร้างไอคอน maskable แยกไฟล์ โดยให้โลโก้อยู่ใน 80% ตรงกลางภาพ (ใช้ maskable.app ตรวจได้)

```json
"icons": [
  { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```

### 4.3 Accessibility

- ผูก label กับ input: `<label for="log-weight">น้ำหนัก (kg)</label>`
- ปุ่มที่มีแค่ไอคอนให้ใส่ `aria-label`
- ใน `showPage` ให้ตั้ง `aria-current="page"` ที่ปุ่ม nav ที่ active

### 4.4 แยกไฟล์ (ทำก่อนเพิ่มฟีเจอร์ใหญ่)

```
index.html
css/styles.css
js/data.js       EXERCISES, MUSCLE_*, WEEKLY_PLAN_DATA, PROGRAMS
js/storage.js    loadState, save, export/import, migration, newId
js/utils.js      esc, num, localDateStr, parseLocalDate, toast
js/app.js        render*, event handlers
vendor/chart.umd.min.js
```

- ใช้ `<script type="module">` ได้โดยไม่ต้องมี build tool ข้อเสียคือ inline `onclick` จะเรียกฟังก์ชันใน module ไม่ได้ ต้องเปลี่ยนเป็น `addEventListener` หรือ event delegation ด้วย `data-action`
- ใส่ `state.schemaVersion = 2` แล้วเขียน migration ตามเลขเวอร์ชัน
- อย่าลืมเพิ่มไฟล์ใหม่ทั้งหมดลงใน `SHELL` ของ `sw.js`

---

## Checklist ทดสอบหลังแก้

- [ ] แก้ค่า `fittrack` ใน DevTools > Application > Local Storage ให้เป็น `{bad` แล้วรีโหลด แอปต้องเปิดได้ มีข้อความเตือน และมี key `fittrack-corrupt-*` เกิดขึ้น
- [ ] Export แล้ว Import กลับ ข้อมูลต้องตรงกันทุกอย่าง
- [ ] Import ไฟล์ที่ใส่ `"type": "<img src=x onerror=alert(1)>"` แล้วต้องไม่มี alert เด้ง
- [ ] ตัดเน็ตแล้วเปิดแอปครั้งแรกหลังติดตั้ง (หลัง SW cache แล้ว) กราฟต้องแสดงได้
- [ ] ใส่ reps = -5, sets = 9999 และ 1RM reps = 40 ทุกกรณีต้องถูกปฏิเสธ
- [ ] เพิ่ม set ไว้ แก้เวลาเครื่องไปเป็นวันถัดไป แล้วกดบันทึก session ต้องลงวันที่ของวันก่อน
- [ ] บันทึกคาร์ดิโอลงวันในอนาคต ข้อมูลต้องไม่เข้ากราฟ 7 วัน
- [ ] จอกว้าง 360px ต้องไม่มี scroll แนวนอนทั้งหน้า
- [ ] เริ่มนาฬิกาพัก 1 นาทีบนมือถือ จอต้องไม่ดับ และต้องมีเสียงตอนหมดเวลา
- [ ] deploy เวอร์ชันใหม่ (bump `CACHE`) แล้วต้องเห็นข้อความแจ้งให้อัปเดต
