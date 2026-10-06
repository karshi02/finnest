# รายงาน #6: ย้ายโปรเจกต์ไป karshi02/finnest และเปิดให้ลูกค้าใช้

วันที่: 2026-10-06
Repo: https://github.com/karshi02/finnest (branch `main`)

## สิ่งที่ทำ

- เปลี่ยนลิงก์ใน `run.ps1` และ `README.md` ให้ชี้ไปที่ `karshi02/finnest`
- เปลี่ยน `origin` จาก `teslatesla040-del/fitt` (push ไม่ได้ เพราะได้ 403) เป็น `karshi02/finnest` ตามคำสั่งของผู้ใช้ แล้ว push `main` ขึ้นไป (6 commit จากงานรอบนี้)
- ไม่ได้ใช้คำสั่งตั้งต้นที่ GitHub แนะนำ (`echo "# finnest" >> README.md`, `git init`, `git remote add`) เพราะโปรเจกต์มี git อยู่แล้ว และคำสั่งชุดนั้นจะไปต่อท้าย README เดิม

## คำสั่งสำหรับลูกค้า (Windows, วางใน cmd)

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/karshi02/finnest/main/run.ps1 | iex"
```

## การตรวจสอบหลัง push

| ตรวจ | ผล |
|---|---|
| `raw.githubusercontent.com/karshi02/finnest/main/run.ps1` | HTTP 200, ตรงกับไฟล์ในเครื่องทุก byte, ไม่มี BOM |
| `$Repo` ในสคริปต์ = `karshi02/finnest` | ✅ |
| zip `archive/refs/heads/main.zip` | HTTP 200, แตกได้โฟลเดอร์ `finnest-main` ซึ่งมี `index.html` เวอร์ชันใหม่ (มีวิดีโอ + HR สด), `vendor/`, ไอคอน |

ครั้งนี้รันคำสั่งแบบเต็ม (เปิด server + เบราว์เซอร์) ไม่ได้ เพราะสภาพแวดล้อมที่ใช้ทดสอบไม่ให้เปิด process ใหม่ (`Start-Process: Access is denied`) แต่ส่วนที่เปิด server เปิดเบราว์เซอร์ และกัน path traversal ทดสอบผ่านแล้วในรายงาน #5 ส่วนที่เปลี่ยนไปมีแค่ URL ของ repo

## หมายเหตุ

- repo เดิม `teslatesla040-del/fitt` ไม่ได้ถูกแก้ และยังเป็นเวอร์ชันแรก
- ถ้าจะให้ลูกค้าบนมือถือใช้ ให้เปิด GitHub Pages: repo `finnest` → Settings → Pages → Deploy from branch `main` / root จะได้ลิงก์ `https://karshi02.github.io/finnest/`
