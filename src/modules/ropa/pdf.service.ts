import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"

export const generateRopaPDF = async (html: string): Promise<Buffer> => {
  const isLocal = process.env.NODE_ENV !== "production"

  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    args: isLocal ? [] : chromium.args,
    headless: true,
    executablePath: isLocal
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : await chromium.executablePath(),
  }
  const browser = await puppeteer.launch(launchOptions)

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "load" })
  
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  })

  await browser.close()
  return Buffer.from(pdf)
}

export const buildRopaHTML = (data: {
  ropaId: string
  title: string
  status: string
  createdAt: string
  sections: { sectionNumber: number; data: Record<string, unknown>; updatedAt: string }[]
}) => {
  const STATUS_LABELS: Record<string, string> = {
    draft: "ร่าง", submitted: "รออนุมัติ",
    approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ",
  }
  const SECTION_LABELS: Record<number, string> = {
    1:"ข้อมูลทั่วไป", 2:"รายละเอียดกิจกรรม", 3:"เจ้าของข้อมูล",
    4:"ประเภทข้อมูล", 5:"ฐานกฎหมาย", 6:"แหล่งที่มา",
    7:"ผู้รับข้อมูล", 8:"โอนข้อมูลต่างประเทศ", 9:"ระบบสารสนเทศ",
    10:"ระยะเวลาเก็บรักษา", 11:"มาตรการความปลอดภัย",
    12:"ประเมินความเสี่ยง", 13:"การรับรอง",
  }
  const FIELD_LABELS: Record<string, string> = {
    departmentName:"ชื่อหน่วยงาน", title:"ชื่อกิจกรรม",
    ownerName:"ชื่อผู้รับผิดชอบ", ownerPosition:"ตำแหน่ง",
    ownerPhone:"โทรศัพท์", ownerEmail:"อีเมล",
    createdDate:"วันที่จัดทำ", updatedDate:"วันที่ปรับปรุง",
    activityDetail:"รายละเอียดกิจกรรม", purposes:"วัตถุประสงค์",
    purposeDetail:"วัตถุประสงค์โดยละเอียด",
    dataSubjects:"ประเภทเจ้าของข้อมูล",
    generalData:"ข้อมูลทั่วไป", sensitiveData:"ข้อมูลอ่อนไหว",
    legalBases:"ฐานกฎหมาย", legalBasisDetail:"รายละเอียดฐานกฎหมาย",
    sources:"แหล่งที่มา",
    internalRecipients:"ผู้รับข้อมูลภายใน",
    externalRecipients:"ผู้รับข้อมูลภายนอก",
    disclosureReason:"เหตุผลในการเปิดเผย",
    hasTransfer:"มีการโอนต่างประเทศ",
    destinationCountry:"ประเทศปลายทาง",
    safeguardMeasures:"มาตรการคุ้มครอง",
    systems:"ระบบสารสนเทศ",
    retentionPeriod:"ระยะเวลาเก็บรักษา",
    legalReference:"อ้างอิงกฎหมาย",
    destructionMethods:"วิธีทำลายข้อมูล",
    technicalMeasures:"มาตรการด้านเทคนิค",
    adminMeasures:"มาตรการด้านบริหาร",
    riskLevel:"ระดับความเสี่ยง",
    requiresDpia:"ต้องทำ DPIA",
    dpiaDetail:"รายละเอียด DPIA",
    makerName:"ชื่อผู้จัดทำ", makerPosition:"ตำแหน่งผู้จัดทำ",
    makerDate:"วันที่จัดทำ",
    supervisorName:"ชื่อผู้บังคับบัญชา",
    supervisorPosition:"ตำแหน่งผู้บังคับบัญชา",
    supervisorDate:"วันที่ลงนาม",
    dpoName:"ชื่อ DPO", dpoDate:"วันที่ DPO ลงนาม",
  }

  const renderVal = (key: string, val: unknown): string => {
    if (val === null || val === undefined || val === "") return "-"
    if (typeof val === "boolean") return val ? "ใช่" : "ไม่ใช่"
    if (Array.isArray(val)) return val.length === 0 ? "-" : val.join(", ")
    if (key === "riskLevel") {
      const r: Record<string,string> = { low:"ต่ำ", medium:"ปานกลาง", high:"สูง", very_high:"สูงมาก" }
      return r[String(val)] ?? String(val)
    }
    return String(val)
  }

  const sorted = [...data.sections].sort((a,b) => a.sectionNumber - b.sectionNumber)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Sarabun',sans-serif; font-size:13px; color:#1a1a1a; padding:24px; }
    .header { margin-bottom:20px; border-bottom:2px solid #2e7d32; padding-bottom:12px; }
    .ropa-id { font-size:20px; font-weight:600; color:#2e7d32; }
    .title { font-size:15px; margin:4px 0 8px; }
    .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; background:#e8f5e9; color:#2e7d32; }
    .meta { font-size:11px; color:#888; margin-top:6px; }
    .section { margin-bottom:16px; border:1px solid #e0e0e0; border-radius:6px; overflow:hidden; page-break-inside:avoid; }
    .section-header { background:#2e7d32; color:white; padding:8px 14px; font-size:13px; font-weight:500; }
    table { width:100%; border-collapse:collapse; }
    td { padding:8px 14px; border-bottom:1px solid #e0e0e0; font-size:12px; vertical-align:top; }
    td.label { width:35%; background:#f9fafb; font-weight:500; color:#555; border-right:1px solid #e0e0e0; }
    tr:last-child td { border-bottom:none; }
    tr:nth-child(even) td.value { background:#fafafa; }
    .footer { margin-top:20px; text-align:center; font-size:10px; color:#999; border-top:1px solid #e0e0e0; padding-top:10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="ropa-id">${data.ropaId}</div>
    <div class="title">${data.title}</div>
    <span class="badge">${STATUS_LABELS[data.status] ?? data.status}</span>
    <div class="meta">
      วันที่สร้าง: ${new Date(data.createdAt).toLocaleDateString("th-TH")} &nbsp;|&nbsp;
      พิมพ์เมื่อ: ${new Date().toLocaleDateString("th-TH")}
    </div>
  </div>

  ${sorted.map(sec => `
  <div class="section">
    <div class="section-header">ส่วนที่ ${sec.sectionNumber} — ${SECTION_LABELS[sec.sectionNumber] ?? ""}</div>
    <table>
      ${Object.entries(sec.data).map(([key, val]) => `
      <tr>
        <td class="label">${FIELD_LABELS[key] ?? key}</td>
        <td class="value">${renderVal(key, val)}</td>
      </tr>`).join("")}
    </table>
  </div>`).join("")}

  <div class="footer">มหาวิทยาลัยราชภัฏมหาสารคาม — ระบบ ROPA</div>
</body>
</html>`
}
