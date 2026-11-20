import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  DEAL_STAGE_META,
  getDensityMeta,
  getTodayDateKey,
  HOSPITAL_STATUS_LABEL,
  type Deal,
  type Hospital,
} from '../types';

export interface ExecutiveSummaryMetrics {
  closedWonRevenue: number;
  activePipelineValue: number;
  totalCases: number;
  winRate: number;
  todayWonRevenue: number;
  todayNewDeals: number;
  todayNewCases: number;
  highDensityHospitalsCount: number;
}

export function exportToExcel(
  hospitals: Hospital[],
  deals: Deal[],
  summary: ExecutiveSummaryMetrics,
  exportedBy: string
) {
  const dateStr = getTodayDateKey();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryRows = [
    { หัวข้อรายงาน: 'ชื่อระบบ', ค่าข้อมูล: 'CTEC MedSales CRM' },
    { หัวข้อรายงาน: 'วันที่ส่งออกรายงาน', ค่าข้อมูล: new Date().toLocaleString('th-TH') },
    { หัวข้อรายงาน: 'ผู้ส่งออกรายงาน', ค่าข้อมูล: exportedBy },
    { หัวข้อรายงาน: '', ค่าข้อมูล: '' },
    { หัวข้อรายงาน: 'ยอดขายปิดได้สะสม (บาท)', ค่าข้อมูล: summary.closedWonRevenue },
    { หัวข้อรายงาน: 'มูลค่าไปป์ไลน์ที่กำลังติดตาม (บาท)', ค่าข้อมูล: summary.activePipelineValue },
    { หัวข้อรายงาน: 'จำนวนเคสสะสมทุกโรงพยาบาล (เคส)', ค่าข้อมูล: summary.totalCases },
    { หัวข้อรายงาน: 'อัตราปิดการขาย (%)', ค่าข้อมูล: Number(summary.winRate.toFixed(1)) },
    { หัวข้อรายงาน: 'จำนวนโรงพยาบาลทั้งหมด (แห่ง)', ค่าข้อมูล: hospitals.length },
    { หัวข้อรายงาน: 'โรงพยาบาลเคสหนาแน่นสูง 30+ เคส (แห่ง)', ค่าข้อมูล: summary.highDensityHospitalsCount },
    { หัวข้อรายงาน: '', ค่าข้อมูล: '' },
    { หัวข้อรายงาน: 'สรุปยอดขายปิดสำเร็จวันนี้ (บาท)', ค่าข้อมูล: summary.todayWonRevenue },
    { หัวข้อรายงาน: 'ดีลใหม่ที่เพิ่มวันนี้ (รายการ)', ค่าข้อมูล: summary.todayNewDeals },
    { หัวข้อรายงาน: 'จำนวนเคสที่เพิ่มวันนี้ (เคส)', ค่าข้อมูล: summary.todayNewCases },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 42 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปผู้บริหาร');

  // Sheet 2: Hospitals & Case Density
  const hospitalRows = hospitals
    .slice()
    .sort((a, b) => b.caseCount - a.caseCount)
    .map((h, idx) => ({
      ลำดับ: idx + 1,
      ชื่อโรงพยาบาล: h.name,
      ประเภท: h.hospitalType,
      จังหวัด: h.province || '-',
      ภูมิภาค: h.region,
      จำนวนเคสสะสม: h.caseCount,
      ระดับความหนาแน่น: getDensityMeta(h.caseCount).label,
      ยอดขายสะสม_บาท: h.totalRevenue,
      ดีลกำลังติดตาม: h.activeDealsCount,
      สถานะบัญชี: HOSPITAL_STATUS_LABEL[h.status],
      ผู้ติดต่อ: h.contactName || '-',
      เบอร์ติดต่อ: h.contactPhone || '-',
      ผู้ดูแลหลัก: h.ownerName,
      ที่อยู่: h.address || '-',
    }));
  const wsHospitals = XLSX.utils.json_to_sheet(
    hospitalRows.length > 0
      ? hospitalRows
      : [{ หมายเหตุ: 'ยังไม่มีข้อมูลโรงพยาบาลในระบบ' }]
  );
  wsHospitals['!cols'] = [
    { wch: 8 },
    { wch: 34 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsHospitals, 'โรงพยาบาลและเคส');

  // Sheet 3: Deals Pipeline
  const dealRows = deals.map((d, idx) => ({
    ลำดับ: idx + 1,
    ชื่อรายการขาย: d.title,
    โรงพยาบาล: d.hospitalName,
    กลุ่มผลิตภัณฑ์: d.productCategory,
    สถานะการขาย: DEAL_STAGE_META[d.stage].label,
    มูลค่า_บาท: d.amount,
    จำนวนเคส: d.caseVolume,
    โอกาสปิดดีล_เปอร์เซ็นต์: d.probability,
    คาดการณ์วันปิด: d.expectedCloseDate || '-',
    วันที่บันทึก: d.dateKey || '-',
    พนักงานขาย: d.ownerName,
    หมายเหตุ: d.notes || '-',
  }));
  const wsDeals = XLSX.utils.json_to_sheet(
    dealRows.length > 0
      ? dealRows
      : [{ หมายเหตุ: 'ยังไม่มีรายการติดตามการขายในระบบ' }]
  );
  wsDeals['!cols'] = [
    { wch: 8 },
    { wch: 32 },
    { wch: 30 },
    { wch: 26 },
    { wch: 20 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 34 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDeals, 'ติดตามสถานะการขาย');

  XLSX.writeFile(wb, `CTEC-MedSales-CRM-Report-${dateStr}.xlsx`);
}

export async function exportToPdf(reportElement: HTMLElement): Promise<void> {
  const dateStr = getTodayDateKey();

  let dataUrl: string;
  try {
    dataUrl = await toPng(reportElement, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });
  } catch {
    dataUrl = await toPng(reportElement, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
    });
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(dataUrl);
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const renderedHeight = (imgProps.height * usableWidth) / imgProps.width;

  let heightLeft = renderedHeight;
  let position = margin;

  pdf.addImage(dataUrl, 'PNG', margin, position, usableWidth, renderedHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = heightLeft - renderedHeight + margin;
    pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', margin, position, usableWidth, renderedHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(`CTEC-MedSales-CRM-Report-${dateStr}.pdf`);
}
