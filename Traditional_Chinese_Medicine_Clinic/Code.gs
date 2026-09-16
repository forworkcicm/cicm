/**
 * ระบบรับเงินคลินิกแผนจีน — Web App API (real-time)
 * วางไฟล์นี้ใน Google Sheet: ส่วนขยาย > Apps Script
 * Deploy: ทำให้ใช้งานได้ > การทำให้ใช้งานได้รายการใหม่ > เว็บแอป
 *         เรียกใช้ในฐานะ: ฉัน · ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน
 * นำ URL ที่ลงท้ายด้วย /exec ไปใส่ใน CFG.apiUrl ของ index.html
 *
 * พารามิเตอร์ (ไม่บังคับ)
 *   ?ym=2026-09        ส่งเฉพาะเดือนนั้น (ค.ศ.)
 *   ?callback=fn       ตอบกลับแบบ JSONP (สำรองกรณีโดน CORS)
 */

const SHEET_MASTER = '03_Master_Data';
const SHEET_CONFIG = '01_Config';

// จับคู่คอลัมน์ด้วย "ชื่อหัวตาราง" (ตัดช่องว่างแล้วเทียบ) — ย้ายตำแหน่งคอลัมน์ได้ไม่พัง
const COLS = {
  date:  'วันที่ทำรายการ(ค.ศ.)',
  hn:    'HN',
  name:  'ชื่อ-นามสกุล',
  cashNo:'เลขที่ใบเสร็จ(เงินสด)',      cash:'จำนวนเงิน(เงินสด)',
  qrNo:  'เลขที่ใบเสร็จ(QRCodeBIZ)',    qr:  'จำนวนเงิน(QRCodeBIZ)',
  depNo: 'เลขที่ใบเสร็จ(ค้างฝาก)',      dep: 'จำนวนเงิน(ค้างฝาก)',
  ccNo:  'เลขที่ใบเสร็จ(creditcard)',   cc:  'จำนวนเงิน(creditcard)',
  total: 'รวมเป็นเงิน',
  note:  'หมายเหตุ'
};
const FIELDS = ['row','date','hn','name','cashNo','cash','qrNo','qr','depNo','dep','ccNo','cc','total','note'];

function doGet(e) {
  const p = (e && e.parameter) || {};
  let body;
  try {
    body = buildPayload_(p.ym || '');
  } catch (err) {
    body = { ok: false, error: String(err && err.message || err) };
  }
  const json = JSON.stringify(body);
  if (p.callback && /^[\w.$]+$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function buildPayload_(ym) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone() || 'Asia/Bangkok';
  const config = readConfig_(ss);
  const sh = ss.getSheetByName(SHEET_MASTER);
  if (!sh) throw new Error('ไม่พบชีต ' + SHEET_MASTER);

  const values = sh.getDataRange().getValues();          // ค่าหลังคำนวณสูตรแล้ว ณ วินาทีนี้
  const head = values[0].map(norm_);
  const idx = {};
  Object.keys(COLS).forEach(k => {
    const want = norm_(COLS[k]);
    idx[k] = head.indexOf(want);
    if (idx[k] < 0) idx[k] = head.findIndex(h => h.indexOf(want) === 0);
  });
  if (idx.date < 0) throw new Error('ไม่พบคอลัมน์วันที่ในแถวหัวตาราง');

  const mask = config.mask_names === true;
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const v = values[r];
    const date = toIso_(v[idx.date], tz);
    if (!date) continue;                                  // ข้ามแถวว่าง (แถวที่มีแต่สูตร)
    if (ym && date.slice(0, 7) !== ym) continue;
    const get = k => idx[k] < 0 ? '' : v[idx[k]];
    const cash = num_(get('cash')), qr = num_(get('qr')), dep = num_(get('dep')), cc = num_(get('cc'));
    let total = num_(get('total'));
    if (!total) total = cash + qr + dep + cc;
    let name = str_(get('name'));
    if (mask) name = maskName_(name);
    rows.push([r + 1, date, str_(get('hn')), name,
      str_(get('cashNo')), cash, str_(get('qrNo')), qr,
      str_(get('depNo')), dep, str_(get('ccNo')), cc, total, str_(get('note'))]);
  }
  const hash = Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(rows), Utilities.Charset.UTF_8));

  return {
    ok: true,
    source: 'apps-script',
    updated: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    hash: hash,
    config: config,
    fields: FIELDS,
    rows: rows
  };
}

/** อ่าน 01_Config: คอลัมน์ B = ค่า, คอลัมน์ C = คีย์ */
function readConfig_(ss) {
  const out = {};
  const sh = ss.getSheetByName(SHEET_CONFIG);
  if (!sh) return out;
  const last = Math.min(sh.getLastRow(), 40);
  if (last < 1) return out;
  sh.getRange(1, 2, last, 2).getValues().forEach(([val, key]) => {
    key = String(key || '').trim();
    if (!/^[a-z_]+$/.test(key)) return;
    if (val === 'TRUE' || val === 'FALSE') val = (val === 'TRUE');
    out[key] = val;
  });
  return out;
}

// ตัดช่องว่าง ★ [สูตร] และเลขข้อนำหน้า (เช่น "1.1 ", "4.2 ") แล้วเทียบแบบตัวพิมพ์เล็ก
function norm_(s) {
  return String(s == null ? '' : s).replace(/[\s★]/g, '').replace(/\[.*?\]/g, '')
    .replace(/^\d+(\.\d+)*\.?/, '').toLowerCase();
}
function str_(v) { return v == null ? '' : String(v).trim(); }
function num_(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v || '').replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function toIso_(v, tz) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  let y = +m[3]; if (y > 2400) y -= 543;
  return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
}
function maskName_(n) {
  const parts = n.split(/\s+/);
  return parts.length > 1 ? parts[0] + ' ' + parts[1].charAt(0) + '.' : parts[0];
}

/** ทดสอบใน editor: เลือกฟังก์ชันนี้แล้วกด Run ดูผลใน Execution log */
function testDoGet() {
  const res = buildPayload_('');
  Logger.log('rows=%s updated=%s config=%s', res.rows.length, res.updated, JSON.stringify(res.config));
  Logger.log(JSON.stringify(res.rows.slice(0, 3)));
}
