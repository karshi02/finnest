# FitTrack Pro

PWA สำหรับบันทึกเวทเทรนนิ่งและคาร์ดิโอ: คลังท่าพร้อมวิดีโอสอน, นาฬิกาพัก, stopwatch, โซนหัวใจ, HR สดจากนาฬิกาผ่าน Bluetooth และเครื่องคำนวณ BMR/BMI/มาโคร/1RM ข้อมูลเก็บในเครื่อง (localStorage) และ Export/Import เป็น JSON ได้

## ติดตั้ง / เปิดใช้ (Windows): คำสั่งเดียว

ไม่ต้องติดตั้ง Git หรือ Python

1. กด **Win + R** พิมพ์ `powershell` แล้วกด Enter
2. ก๊อปคำสั่งนี้ไปวาง แล้วกด Enter

```powershell
irm https://raw.githubusercontent.com/teslatesla040-del/fitt/main/run.ps1 | iex
```

คำสั่งนี้จะดาวน์โหลดแอปเวอร์ชันล่าสุด เปิดแอปที่ `http://localhost:8080` แล้วเปิดเบราว์เซอร์ให้เอง

- **ต้องเปิดหน้าต่าง PowerShell ทิ้งไว้** ระหว่างใช้งาน ปิดหน้าต่างหรือกด `Ctrl + C` เมื่อเลิกใช้
- ครั้งต่อไปรันคำสั่งเดิมได้เลย จะได้เวอร์ชันล่าสุดทุกครั้ง และข้อมูลการออกกำลังกายยังอยู่ เพราะเก็บไว้ในเบราว์เซอร์ ไม่ได้อยู่ในโฟลเดอร์แอป
- ใช้พอร์ต 8080 เสมอ ข้อมูลผูกกับที่อยู่ `http://localhost:8080` ถ้าเปิดที่อยู่อื่นจะเห็นแอปว่างเปล่า

## สำหรับนักพัฒนา

โหลดโปรเจกต์แล้วดับเบิลคลิก **`start.bat`** หรือรัน:

```powershell
git clone https://github.com/teslatesla040-del/fitt.git; cd fitt; powershell -ExecutionPolicy Bypass -File run.ps1
```

macOS / Linux (ต้องมี Python 3):

```bash
[ -d fitt ] || git clone https://github.com/teslatesla040-del/fitt.git; cd fitt && git pull; (sleep 2; open http://localhost:8080/ 2>/dev/null || xdg-open http://localhost:8080/) & python3 -m http.server 8080 --bind 127.0.0.1
```

> อย่าเปิดด้วยการดับเบิลคลิก `index.html` (`file://`) เพราะวิดีโอ YouTube, Bluetooth และ Service Worker จะใช้ไม่ได้
>
> `run.ps1` ต้องเป็น ASCII ล้วน และห้ามมี BOM ไม่เช่นนั้น `irm | iex` บน PowerShell 5.1 จะพัง

## เอกสาร

รีวิว แผน และรายงานการแก้ไขอยู่ใน [Docs/](Docs/README.md)
