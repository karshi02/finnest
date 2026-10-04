# FitTrack Pro

PWA สำหรับบันทึกเวทเทรนนิ่งและคาร์ดิโอ: คลังท่าพร้อมวิดีโอสอน, นาฬิกาพัก, stopwatch, โซนหัวใจ, HR สดจากนาฬิกาผ่าน Bluetooth และเครื่องคำนวณ BMR/BMI/มาโคร/1RM ข้อมูลเก็บในเครื่อง (localStorage) และ Export/Import เป็น JSON ได้

## รันในเครื่อง

ต้องมี [Git](https://git-scm.com/) และ [Python](https://www.python.org/downloads/) (หรือ [Node.js](https://nodejs.org/))

**Windows (PowerShell)**: ก๊อปทั้งบรรทัดไปวาง จะดาวน์โหลดโปรเจกต์ เปิด server และเปิดเบราว์เซอร์ให้เอง

```powershell
if (!(Test-Path fitt)) { git clone https://github.com/teslatesla040-del/fitt.git }; cd fitt; git pull; Start-Process cmd -ArgumentList '/c timeout /t 2 >nul & start http://localhost:8080/'; python -m http.server 8080 --bind 127.0.0.1
```

**macOS / Linux**

```bash
[ -d fitt ] || git clone https://github.com/teslatesla040-del/fitt.git; cd fitt && git pull; (sleep 2; open http://localhost:8080/ 2>/dev/null || xdg-open http://localhost:8080/) & python3 -m http.server 8080 --bind 127.0.0.1
```

ถ้าโหลดโปรเจกต์มาแล้ว ให้ดับเบิลคลิก **`start.bat`** (Windows)

หยุด server ด้วย `Ctrl + C` หรือปิดหน้าต่าง

> อย่าเปิดด้วยการดับเบิลคลิก `index.html` (`file://`) เพราะวิดีโอ YouTube, Bluetooth และ Service Worker จะใช้ไม่ได้

## เอกสาร

รีวิว แผน และรายงานการแก้ไขอยู่ใน [Docs/](Docs/README.md)
