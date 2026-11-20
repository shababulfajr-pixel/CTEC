import type { HospitalType, ProductCategory, RegionName } from '../types';

export interface ReferenceSalesRep {
  rank: number;
  name: string;
  team: string;
  region: RegionName;
  closedCases: number;
  revenue: number;
  attainmentPct: number;
  starPerformer?: boolean;
}

export interface ReferenceHospitalHotspot {
  id: string;
  name: string;
  searchQuery: string;
  specialty: ProductCategory;
  hospitalType: HospitalType;
  region: RegionName;
  province: string;
  cases: number;
  revenue: number;
  tierLabel: 'CRITICAL HIGH' | 'HIGH HEAT' | 'MODERATE';
  progressPct: number;
}

export interface ReferenceActivityEvent {
  id: string;
  timeAgo: string;
  hospitalName: string;
  repAction: string;
  procedure: string;
  amount: number;
  statusLabel: string;
  accent: 'orange' | 'gold' | 'amber';
}

export interface MonthlyCasePoint {
  monthIndex: number; // 1..12
  monthShort: string;
  monthFull: string;
  cases2024: number;
  cases2025: number;
  cases2026: number;
  revenue2024: number;
  revenue2025: number;
  revenue2026: number;
}

/**
 * Reference figures directly derived from user-attached CTEC Devices CRM briefing
 * (ctec_medical_devices_crm_field_operations_7eadff3a.html).
 * Note: Hospital geographic coordinates are NOT stored here; they are resolved live
 * through Google Maps Places API (New) when imported to Firestore.
 */
export const CTEC_REFERENCE_KPIS = {
  totalCasesClosed: 1482,
  targetCases: 1550,
  growthPct: '+18.4%',
  totalRevenue: 142_850_000,
  revenueAttainmentPct: 94,
  activeHospitals: 184,
  totalNetworkHospitals: 240,
  networkCoveragePct: 76.6,
  topHotspotRegion: 'ภาคกลาง & กทม.',
  topHotspotCases: 612,
  topHotspotSharePct: 41.2,
  activeRepsOnline: 28,
  totalReps: 30,
};

export const CTEC_REFERENCE_REPS: ReferenceSalesRep[] = [
  {
    rank: 1,
    name: 'นายณัฐวุฒิ สมบูรณ์',
    team: 'ทีมภาคกลาง & กทม.',
    region: 'กรุงเทพและปริมณฑล',
    closedCases: 86,
    revenue: 12_400_000,
    attainmentPct: 115,
    starPerformer: true,
  },
  {
    rank: 2,
    name: 'น.ส. กานดา วงศ์สุวรรณ',
    team: 'ทีมภาคอีสาน (NE Core)',
    region: 'ภาคตะวันออกเฉียงเหนือ',
    closedCases: 74,
    revenue: 10_800_000,
    attainmentPct: 108,
  },
  {
    rank: 3,
    name: 'นายธีรภัทร เมธากุล',
    team: 'ทีมภาคเหนือ (North Cluster)',
    region: 'ภาคเหนือ',
    closedCases: 69,
    revenue: 9_500_000,
    attainmentPct: 102,
  },
  {
    rank: 4,
    name: 'น.ส. วลัยพร สิริสุข',
    team: 'ทีมภาคใต้ (Southern Zone)',
    region: 'ภาคใต้',
    closedCases: 62,
    revenue: 8_900_000,
    attainmentPct: 97,
  },
  {
    rank: 5,
    name: 'นายอัศวิน รัตนโชติ',
    team: 'ทีมภาคตะวันออก (EEC Medical)',
    region: 'ภาคตะวันออก',
    closedCases: 58,
    revenue: 8_200_000,
    attainmentPct: 94,
  },
];

export const CTEC_REFERENCE_HOTSPOTS: ReferenceHospitalHotspot[] = [
  {
    id: 'ref-siriraj',
    name: 'รพ.ศิริราช (Siriraj Hospital)',
    searchQuery: 'โรงพยาบาลศิริราช กรุงเทพมหานคร',
    specialty: 'Cardiovascular & Neuro Implants',
    hospitalType: 'โรงเรียนแพทย์',
    region: 'กรุงเทพและปริมณฑล',
    province: 'กรุงเทพมหานคร',
    cases: 148,
    revenue: 24_800_000,
    tierLabel: 'CRITICAL HIGH',
    progressPct: 95,
  },
  {
    id: 'ref-chula',
    name: 'รพ.จุฬาลงกรณ์ สภากาชาดไทย',
    searchQuery: 'โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย',
    specialty: 'Orthopedic Joint Systems',
    hospitalType: 'โรงเรียนแพทย์',
    region: 'กรุงเทพและปริมณฑล',
    province: 'กรุงเทพมหานคร',
    cases: 132,
    revenue: 21_400_000,
    tierLabel: 'HIGH HEAT',
    progressPct: 82,
  },
  {
    id: 'ref-maharaj-cm',
    name: 'รพ.มหาราชนครเชียงใหม่',
    searchQuery: 'โรงพยาบาลมหาราชนครเชียงใหม่',
    specialty: 'Surgical Robotics & Endoscopy',
    hospitalType: 'โรงเรียนแพทย์',
    region: 'ภาคเหนือ',
    province: 'เชียงใหม่',
    cases: 98,
    revenue: 16_900_000,
    tierLabel: 'HIGH HEAT',
    progressPct: 64,
  },
  {
    id: 'ref-khonkaen',
    name: 'รพ.ขอนแก่น (ศูนย์แพทย์อีสาน)',
    searchQuery: 'โรงพยาบาลขอนแก่น',
    specialty: 'CTEC Spine & Trauma Solutions',
    hospitalType: 'โรงพยาบาลรัฐ',
    region: 'ภาคตะวันออกเฉียงเหนือ',
    province: 'ขอนแก่น',
    cases: 85,
    revenue: 13_600_000,
    tierLabel: 'MODERATE',
    progressPct: 52,
  },
  {
    id: 'ref-songklanagarind',
    name: 'รพ.สงขลานครินทร์ (มอ. หาดใหญ่)',
    searchQuery: 'โรงพยาบาลสงขลานครินทร์ หาดใหญ่',
    specialty: 'Interventional Cardiology Stents',
    hospitalType: 'โรงเรียนแพทย์',
    region: 'ภาคใต้',
    province: 'สงขลา',
    cases: 79,
    revenue: 12_200_000,
    tierLabel: 'MODERATE',
    progressPct: 48,
  },
];

export const CTEC_REFERENCE_ACTIVITIES: ReferenceActivityEvent[] = [
  {
    id: 'act-1',
    timeAgo: '2 นาทีที่แล้ว',
    hospitalName: 'รพ.ราชวิถี',
    repAction: 'เซลล์ ภานุวัฒน์ บันทึกเคสใหม่',
    procedure: 'ผ่าตัดเปลี่ยนข้อเข่าเทียม (Total Knee Replacement)',
    amount: 450_000,
    statusLabel: 'ผ่านการอนุมัติ',
    accent: 'gold',
  },
  {
    id: 'act-2',
    timeAgo: '9 นาทีที่แล้ว',
    hospitalName: 'รพ.รามาธิบดี',
    repAction: 'เซลล์ ศศิธร อัปเดตสถานะ',
    procedure: 'ส่งมอบระบบเจาะกะโหลกความเร็วสูง (High-Speed Drill)',
    amount: 890_000,
    statusLabel: 'จัดส่งแล้ว',
    accent: 'orange',
  },
  {
    id: 'act-3',
    timeAgo: '14 นาทีที่แล้ว',
    hospitalName: 'รพ.ศรีนครินทร์ ขอนแก่น',
    repAction: 'เซลล์ วรวิทย์ แจ้งจองเคสด่วน',
    procedure: 'ชุดดามกระดูกสันหลัง CTEC Spine Posterior Fixation',
    amount: 320_000,
    statusLabel: 'รอทีมช่างแสตนด์บาย',
    accent: 'amber',
  },
];

// Monthly & Yearly Case Volume Series (2024 = 1,252 cases, 2025 = 1,482 cases matching reference, 2026 = 1,724 cases)
export const CTEC_MONTHLY_YEARLY_CASES: MonthlyCasePoint[] = [
  { monthIndex: 1, monthShort: 'ม.ค.', monthFull: 'มกราคม', cases2024: 92, cases2025: 112, cases2026: 134, revenue2024: 8_800_000, revenue2025: 10_750_000, revenue2026: 13_100_000 },
  { monthIndex: 2, monthShort: 'ก.พ.', monthFull: 'กุมภาพันธ์', cases2024: 88, cases2025: 108, cases2026: 129, revenue2024: 8_420_000, revenue2025: 10_400_000, revenue2026: 12_650_000 },
  { monthIndex: 3, monthShort: 'มี.ค.', monthFull: 'มีนาคม', cases2024: 104, cases2025: 128, cases2026: 148, revenue2024: 10_050_000, revenue2025: 12_380_000, revenue2026: 14_720_000 },
  { monthIndex: 4, monthShort: 'เม.ย.', monthFull: 'เมษายน', cases2024: 95, cases2025: 114, cases2026: 132, revenue2024: 9_150_000, revenue2025: 10_960_000, revenue2026: 12_980_000 },
  { monthIndex: 5, monthShort: 'พ.ค.', monthFull: 'พฤษภาคม', cases2024: 106, cases2025: 126, cases2026: 146, revenue2024: 10_200_000, revenue2025: 12_150_000, revenue2026: 14_450_000 },
  { monthIndex: 6, monthShort: 'มิ.ย.', monthFull: 'มิถุนายน', cases2024: 112, cases2025: 132, cases2026: 154, revenue2024: 10_820_000, revenue2025: 12_740_000, revenue2026: 15_280_000 },
  { monthIndex: 7, monthShort: 'ก.ค.', monthFull: 'กรกฎาคม', cases2024: 101, cases2025: 119, cases2026: 141, revenue2024: 9_740_000, revenue2025: 11_480_000, revenue2026: 13_960_000 },
  { monthIndex: 8, monthShort: 'ส.ค.', monthFull: 'สิงหาคม', cases2024: 109, cases2025: 127, cases2026: 149, revenue2024: 10_520_000, revenue2025: 12_290_000, revenue2026: 14_820_000 },
  { monthIndex: 9, monthShort: 'ก.ย.', monthFull: 'กันยายน', cases2024: 118, cases2025: 139, cases2026: 162, revenue2024: 11_380_000, revenue2025: 13_410_000, revenue2026: 16_080_000 },
  { monthIndex: 10, monthShort: 'ต.ค.', monthFull: 'ตุลาคม', cases2024: 105, cases2025: 124, cases2026: 145, revenue2024: 10_100_000, revenue2025: 11_950_000, revenue2026: 14_350_000 },
  { monthIndex: 11, monthShort: 'พ.ย.', monthFull: 'พฤศจิกายน', cases2024: 114, cases2025: 131, cases2026: 158, revenue2024: 10_960_000, revenue2025: 12_640_000, revenue2026: 15_650_000 },
  { monthIndex: 12, monthShort: 'ธ.ค.', monthFull: 'ธันวาคม', cases2024: 108, cases2025: 122, cases2026: 126, revenue2024: 10_420_000, revenue2025: 11_700_000, revenue2026: 12_540_000 },
];

export const SALES_TEAMS = [
  'ทีมเซลล์ทั้งหมด (5 เขต)',
  'ทีมศัลยกรรมระบบประสาท & กระดูก',
  'ทีมเทคโนโลยีหัวใจและหลอดเลือด',
  'ทีมนวัตกรรมหุ่นยนต์ผ่าตัด',
] as const;
