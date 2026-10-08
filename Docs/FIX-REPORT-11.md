# รายงาน #16: ดึงการออกกำลังกายจากนาฬิกา Huawei ผ่าน Strava

วันที่: 2026-10-08
Deploy: https://fitt-zeta.vercel.app
ทำตาม: [PLAN-STRAVA-SYNC.md](PLAN-STRAVA-SYNC.md) (ใช้ค่าที่แนะนำทุกข้อ) แต่ใช้ **Vercel Function** แทน Cloudflare Worker เพราะแอปอยู่บน Vercel แล้ว

## คำขอ

> ใช้แอป Huawei Health อยู่ (ต่อจาก [FIX-REPORT-10](FIX-REPORT-10.md): HR สดผ่าน Bluetooth ยังหาไม่เจอ)

## เส้นทางข้อมูล

```
HUAWEI WATCH GT 6 ──> Huawei Health ──(แชร์ข้อมูล)──> Strava
                                                         │
FitTrack (เบราว์เซอร์) ──> /api/strava (Vercel, เก็บ Client Secret) ──┘
```

Huawei Health ส่งกิจกรรมไป Strava ได้ ([Android Authority](https://www.androidauthority.com/huawei-health-strava-sync-3204353)): ฉัน > การจัดการความเป็นส่วนตัว > การแชร์ข้อมูลและการอนุญาต > Strava

## สิ่งที่ทำ

| ไฟล์ | รายละเอียด |
|---|---|
| `api/strava.js` (ใหม่) | Vercel Function: `config` (ส่ง Client ID), `token` / `refresh` (แลก token โดยใช้ Client Secret ฝั่ง server), `deauthorize`, และ `api` ที่ส่งต่อได้แค่ `/athlete/activities` กับ `/activities/{id}` ตรวจ Origin, ตอบเฉพาะฟิลด์ที่ใช้, `Cache-Control: no-store` |
| `index.html` | การ์ด **🔗 ดึงจากนาฬิกาอัตโนมัติ (Strava)** ในหน้าคาร์ดิโอ แท็บบันทึก: ปุ่มเชื่อมต่อ / ซิงก์ตอนนี้ / ยกเลิก พร้อมขั้นตอนตั้งค่า Huawei Health |
| | OAuth พร้อม `state` สุ่มกัน CSRF (หมดอายุ 15 นาที) ขอ scope แค่อ่าน `read,activity:read_all` |
| | ซิงก์อัตโนมัติตอนเปิดแอป (ห่างจากรอบก่อนเกิน 15 นาที) รอบแรกดึงย้อนหลัง 90 วัน |
| | map ตาม PLAN ข้อ 6, กันซ้ำด้วย `stravaId`, รายการที่ลบจะไม่ถูกดึงกลับ, ข้าม WeightTraining, แคลอรี่ถามทีละกิจกรรม (รอบละไม่เกิน 20), ระดับความเข้มคิดจากโซนหัวใจ |
| | token หมดอายุแล้ว refresh เอง, 401 ซ้ำให้เชื่อมใหม่, 429 แจ้งให้รอ, ออฟไลน์ข้าม |
| | ป้าย **Strava ↗** ในประวัติคาร์ดิโอ ลิงก์ไปกิจกรรมบน Strava |
| | token เก็บใน localStorage คีย์ `fittrack-strava` แยกจากข้อมูลหลัก **ไม่ติดไปกับไฟล์ Export** |
| `sw.js` | ไม่แคช `/api/` และเปลี่ยนเป็น cache `fittrack-v6` |

## การทดสอบ

| ชุด | ผล |
|---|---|
| แอป + Strava API จำลอง (OAuth callback, map ข้อมูล, kcal, XSS ในชื่อกิจกรรม, กันซ้ำ, ลบแล้วไม่กลับมา, refresh token, export ไม่มี token, 429, 401, deauthorize) | 19/19 ✅ |
| ยังไม่ได้ตั้งค่า server / `state` ไม่ตรง (ต้องไม่แลก token) | 4/4 ✅ |
| `api/strava.js` ด้วย Node (503, Origin อื่นได้ 403, secret ไม่หลุดใน response, path allowlist, กัน path traversal, ล้าง query) | 14/14 ✅ |
| ชุดเดิม Bluetooth / ปุ่มนาฬิกา / ตรวจเครื่อง (regression) | 24/24 ✅ |

หลัง deploy: หน้าเว็บมีการ์ด Strava แล้ว และ `GET /api/strava?action=config` ตอบ `503 not_configured` ตามที่ควรเป็นในตอนนี้ เพราะยังไม่ได้ใส่คีย์

**ยังไม่ได้ทดสอบกับบัญชี Strava จริง** ต้องทำขั้นตอนด้านล่างให้เสร็จก่อน

## ⚠️ สิ่งที่เจ้าของต้องทำ (ครั้งเดียว)

1. **Huawei Health → Strava:** ในแอป Huawei Health เข้า ฉัน > การจัดการความเป็นส่วนตัว > การแชร์ข้อมูลและการอนุญาต > Strava แล้วล็อกอิน
2. **สร้าง Strava API Application** ที่ https://www.strava.com/settings/api
   - Website: `https://fitt-zeta.vercel.app`
   - **Authorization Callback Domain: `fitt-zeta.vercel.app`**
   - จะได้ **Client ID** และ **Client Secret**
3. **ใส่คีย์ใน Vercel** (รันในโฟลเดอร์โปรเจกต์ แล้ววางค่าเมื่อระบบถาม):
   ```powershell
   vercel env add STRAVA_CLIENT_ID production
   vercel env add STRAVA_CLIENT_SECRET production
   vercel --prod
   ```
   **ห้ามส่ง Client Secret มาในแชต และห้าม commit ลง git**
4. เปิด https://fitt-zeta.vercel.app > คาร์ดิโอ > กด **เชื่อมต่อ Strava** > อนุญาต

## ข้อจำกัด

- **ไม่ใช่ข้อมูลสด:** กิจกรรมเข้ามาหลังจากนาฬิกาซิงก์เข้า Huawei Health และ Strava แล้ว (ปกติไม่กี่นาทีหลังจบการออกกำลังกาย)
- กิจกรรมที่ทำก่อนเชื่อม Huawei Health กับ Strava จะไม่ถูกส่งไป Strava
- บัญชี Huawei ที่ลงทะเบียนในสหรัฐฯ ใช้การแชร์ไป Strava ไม่ได้
- แอป Strava ที่สร้างใหม่ใช้ได้เฉพาะเจ้าของแอป ถ้าจะให้คนอื่นใช้ ต้องขอ Strava เพิ่มจำนวนผู้ใช้
- ยังไม่ได้ push ขึ้น GitHub
