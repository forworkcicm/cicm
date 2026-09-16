# ระบบรับเงินคลินิกแผนจีน — Dashboard

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้า dashboard + รายงาน (ไฟล์เดียวจบ) |
| `Code.gs` | Apps Script อ่านชีต `03_Master_Data` + `01_Config` แล้วส่ง JSON แบบ real-time |
| `data.csv` | ข้อมูลสำรอง (ชื่อคนไข้ถูกย่อนามสกุลแล้ว) ใช้เมื่อเชื่อม Google Sheet ไม่ได้ |

## ติดตั้ง
1. เปิด Google Sheet → **ส่วนขยาย › Apps Script** → วางโค้ด `Code.gs` → บันทึก
2. เลือกฟังก์ชัน `testDoGet` → **Run** (อนุญาตสิทธิ์ครั้งแรก) → ดู log ว่าได้จำนวนแถวถูกต้อง
3. **ทำให้ใช้งานได้ › การทำให้ใช้งานได้รายการใหม่ › เว็บแอป**
   - เรียกใช้ในฐานะ: **ฉัน** · ผู้ที่มีสิทธิ์เข้าถึง: **ทุกคน**
4. คัดลอก URL ที่ลงท้าย `/exec` ไปใส่ `CFG.apiUrl` ใน `index.html`
5. อัปโหลด `index.html`, `data.csv`, `README.md` ขึ้น repo → Settings › Pages → เปิดผ่าน URL `https://<user>.github.io/<repo>/`

> แก้ `Code.gs` ภายหลัง ต้อง **จัดการการทำให้ใช้งานได้ › แก้ไข › เวอร์ชันใหม่** ไม่งั้น URL เดิมยังใช้โค้ดเก่า

## ลำดับแหล่งข้อมูล (แสดงที่มุมขวาบน)
1. Apps Script (real-time, จุดเขียวกะพริบ) — รีเฟรชทุก `refresh_seconds` ใน 01_Config
2. Google Sheet gviz — ต้องแชร์ชีตแบบ "ทุกคนที่มีลิงก์ · ผู้อ่าน"
3. `data.csv` (จุดเหลือง)

## ⚠️ ข้อมูลส่วนบุคคล
ถ้า repo เป็น **public** ทุกคนที่มีลิงก์จะเห็นชื่อคนไข้ + HN ผ่าน Web App และ `sheetId`
- ตั้ง `mask_names = TRUE` ใน 01_Config (ย่อนามสกุลตั้งแต่ฝั่ง Apps Script) หรือ
- ใช้ repo แบบ private / GitHub Pages แบบจำกัดสิทธิ์ และไม่ใส่ `sheetId`
