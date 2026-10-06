# รายงาน #7: Deploy ขึ้น Vercel + ตั้งค่า Vercel สำหรับ Claude Code

วันที่: 2026-10-06

## Deploy

- `vercel deploy --temporary --yes` (ยังไม่ได้ล็อกอิน) → **https://fitt-zeta.vercel.app**
- เพิ่ม `.vercelignore` ไม่ให้ `Docs/`, `run.ps1`, `start.bat`, `README.md` ขึ้นไปบนเว็บ
- ตรวจแล้ว: `/`, `index.html`, `sw.js`, `manifest.json`, `vendor/chart.umd.min.js`, `icon-maskable-512.png` ได้ 200 และ content-type ถูก ส่วน `Docs/README.md` กับ `run.ps1` ได้ 404 ตามที่ตั้งใจ หน้าเว็บเป็นเวอร์ชันใหม่ (มีวิดีโอ + HR สด)
- เป็น https จึงใช้วิดีโอ YouTube, Bluetooth (Android Chrome), Service Worker และการติดตั้งเป็นแอป (PWA) ได้

**ข้อควรรู้:** เป็นการ deploy แบบชั่วคราว (temporary) ที่ยังไม่ผูกกับบัญชี ต้องล็อกอินแล้ว claim หรือ deploy ใหม่ในบัญชีของคุณ ลิงก์ถึงจะอยู่ถาวร และชื่อโดเมนอาจเปลี่ยน

## ตั้งค่า Vercel ตาม vercel.com/get-started.md

| ขั้น | ผล |
|---|---|
| ติดตั้ง Vercel CLI | ✅ `vercel` 62.4.0 (global) |
| ล็อกอิน | ⏳ ผู้ใช้ต้องรัน `vercel login` เอง (ต้องยืนยันตัวตนผ่านเบราว์เซอร์) |
| Vercel plugin | ✅ ติดตั้งให้ Claude Code และ VS Code แล้ว (scope: user) ส่วน Codex ล้มเพราะเครื่องนี้ไม่มี Codex |
| Vercel MCP | ✅ เพิ่มเข้า Claude Code แล้ว (`https://mcp.vercel.com`) config อยู่ที่ `~/.claude.json` จะยืนยันตัวตนตอนใช้งานครั้งแรก และต้องรีสตาร์ท Claude Code ก่อน |

## ขั้นต่อไป

1. `vercel login`
2. `vercel link` แล้วเลือกสร้างโปรเจกต์ในบัญชีของคุณ จากนั้น `vercel --prod`
3. (แนะนำ) เชื่อม GitHub repo `karshi02/finnest` ที่ vercel.com/new ให้ deploy เองทุกครั้งที่ push
