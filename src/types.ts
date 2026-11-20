import type { Timestamp } from 'firebase/firestore';

export const ORG_ID = 'ctec-medical' as const;
export const BOOTSTRAP_ADMIN_EMAIL = 'shababulfajr@gmail.com';

export type UserRole = 'admin' | 'executive' | 'manager' | 'office_admin' | 'sales';

export type RegionName =
  | 'กรุงเทพและปริมณฑล'
  | 'ภาคกลาง'
  | 'ภาคเหนือ'
  | 'ภาคตะวันออกเฉียงเหนือ'
  | 'ภาคตะวันออก'
  | 'ภาคใต้';

export type HospitalType =
  | 'โรงพยาบาลรัฐ'
  | 'โรงพยาบาลเอกชน'
  | 'โรงเรียนแพทย์'
  | 'คลินิกเฉพาะทาง';

export type HospitalStatus = 'active' | 'prospect' | 'high_priority' | 'inactive';

export type ProductCategory =
  | 'Cardiovascular & Neuro Implants'
  | 'Orthopedic Joint Systems'
  | 'Surgical Robotics & Endoscopy'
  | 'CTEC Spine & Trauma Solutions'
  | 'Interventional Cardiology Stents'
  | 'เครื่องมือผ่าตัดและเวชภัณฑ์'
  | 'อุปกรณ์ห้อง ICU'
  | 'ระบบตรวจวินิจฉัยและภาพถ่าย'
  | 'วัสดุสิ้นเปลืองทางการแพทย์'
  | 'สัญญาบริการและบำรุงรักษา';

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export type NotificationType = 'daily_summary' | 'deal_won' | 'high_density_alert' | 'stage_update';

export type AuditTargetType =
  | 'user'
  | 'hospital'
  | 'deal'
  | 'report'
  | 'notification'
  | 'office_case';

export type ActiveTab =
  | 'dashboard'
  | 'office_cases'
  | 'map'
  | 'pipeline'
  | 'analytics'
  | 'admin';

export type DensityLevel = 'high' | 'medium' | 'low' | 'none';

export interface UserProfile {
  id: string;
  uid: string;
  orgId: typeof ORG_ID;
  displayName: string;
  role: UserRole;
  department: string;
  territory: string;
  active: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  phone: string;
  photoURL: string;
  updatedAt: Timestamp | null;
}

export interface Hospital {
  id: string;
  orgId: typeof ORG_ID;
  name: string;
  placeId: string;
  address: string;
  province: string;
  region: RegionName;
  lat: number;
  lng: number;
  hospitalType: HospitalType;
  caseCount: number;
  totalRevenue: number;
  activeDealsCount: number;
  status: HospitalStatus;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  ownerId: string;
  ownerName: string;
  notes: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Deal {
  id: string;
  orgId: typeof ORG_ID;
  title: string;
  hospitalId: string;
  hospitalName: string;
  productCategory: ProductCategory;
  amount: number;
  caseVolume: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string;
  dateKey: string;
  notes: string;
  ownerId: string;
  ownerName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface NotificationItem {
  id: string;
  orgId: typeof ORG_ID;
  type: NotificationType;
  title: string;
  message: string;
  amount: number;
  caseCount: number;
  dateKey: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp | null;
}

export interface AuditLogItem {
  id: string;
  orgId: typeof ORG_ID;
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string;
  actorId: string;
  actorName: string;
  details: string;
  createdAt: Timestamp | null;
}

export type OfficeCaseWorkflowStatus = 'in_progress' | 'sterilizing' | 'delivered';

export type OfficePaymentChannel =
  | 'patient_direct'
  | 'deposit_50_first'
  | 'balance_50_before_ship'
  | 'via_hospital'
  | 'free_case'
  | 'doctor_pay'
  | 'sell_via_ctec'
  | 'ctec'
  | 'wimanrat';

export type HospitalCategoryCode = 1 | 2 | 3;

export interface OfficeCase {
  id: string;
  orgId: typeof ORG_ID;
  salesSeqNo: number;
  jobNumber: string;
  monthlySeq: number;
  icrNumber: string;
  hospitalCategory: HospitalCategoryCode;
  productionPlanNo: string;
  barcode: string;
  workflowStatus: OfficeCaseWorkflowStatus;
  paymentChannels: OfficePaymentChannel[];
  price: number;
  paymentDetails: string;
  paymentConditionNote: string;
  patientPrefix: string;
  patientFirstName: string;
  patientLastName: string;
  patientHN: string;
  patientAge: string;
  patientPhone: string;
  hospitalName: string;
  doctorName: string;
  doctorPhone: string;
  productCode: string;
  sidePosition: string;
  anatomicalArea: string;
  surgeryType: string;
  materialType: string;
  rpModelQty: number;
  implantQty: number;
  temporalSpec: string;
  productionSpec: string;
  receivedDate: string;
  surgeryDate: string;
  caseReceiver: string;
  sterilizeOutDate: string;
  sterilizeReturnDate: string;
  radiationMinKgy: string;
  radiationMaxKgy: string;
  doseUniformity: string;
  qcReceiveDate: string;
  certificateNo: string;
  deliveryDate: string;
  deliveryChannel: string;
  deliveredBy: string;
  emsTrackingNo: string;
  shippingInfo: string;
  receiptAddress: string;
  packageInfo: string;
  remarks: string;
  createdBy: string;
  createdByName: string;
  updatedBy: string;
  updatedByName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export const OFFICE_WORKFLOW_META: Record<
  OfficeCaseWorkflowStatus,
  {
    label: string;
    shortLabel: string;
    colorName: string;
    dotColor: string;
    borderClass: string;
    rowTintClass: string;
    textClass: string;
  }
> = {
  in_progress: {
    label: 'สีขาว · งานระหว่างทำ / รอรับเคส',
    shortLabel: 'ระหว่างทำ / รอรับเคส',
    colorName: 'สีขาว',
    dotColor: '#F8FAFC',
    borderClass: 'border-l-white/85',
    rowTintClass: 'bg-white/[0.02]',
    textClass: 'text-white',
  },
  sterilizing: {
    label: 'สีน้ำเงิน · ส่งชิ้นงานฆ่าเชื้อ',
    shortLabel: 'ส่งชิ้นงานฆ่าเชื้อ',
    colorName: 'สีน้ำเงิน',
    dotColor: '#38BDF8',
    borderClass: 'border-l-sky-400',
    rowTintClass: 'bg-sky-500/[0.07]',
    textClass: 'text-sky-300',
  },
  delivered: {
    label: 'สีเขียว · งานจัดส่งแล้ว',
    shortLabel: 'งานจัดส่งแล้ว',
    colorName: 'สีเขียว',
    dotColor: '#34D399',
    borderClass: 'border-l-emerald-400',
    rowTintClass: 'bg-emerald-500/[0.07]',
    textClass: 'text-emerald-300',
  },
};

export const OFFICE_PAYMENT_CHANNELS: {
  id: OfficePaymentChannel;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'patient_direct', label: 'คนไข้จ่ายเองกับบริษัท', shortLabel: 'คนไข้จ่ายเอง' },
  { id: 'deposit_50_first', label: 'มัดจำ 50% แรก', shortLabel: 'มัดจำ 50%' },
  { id: 'balance_50_before_ship', label: 'ก่อนส่ง 50% หลัง', shortLabel: 'ก่อนส่ง 50%' },
  { id: 'via_hospital', label: 'จ่ายผ่าน รพ.', shortLabel: 'จ่ายผ่าน รพ.' },
  { id: 'free_case', label: 'เคสฟรี', shortLabel: 'เคสฟรี' },
  { id: 'doctor_pay', label: 'หมอจ่าย', shortLabel: 'หมอจ่าย' },
  { id: 'sell_via_ctec', label: 'ขายผ่านซีเทค', shortLabel: 'ขายผ่านซีเทค' },
  { id: 'ctec', label: 'ซีเทค', shortLabel: 'ซีเทค' },
  { id: 'wimanrat', label: 'วิมานรัตร์', shortLabel: 'วิมานรัตร์' },
];

export const HOSPITAL_CATEGORY_LABELS: Record<HospitalCategoryCode, string> = {
  1: 'รัฐบาล (1)',
  2: 'เอกชน (2)',
  3: 'คลินิก (3)',
};

export const REGIONS: RegionName[] = [
  'กรุงเทพและปริมณฑล',
  'ภาคกลาง',
  'ภาคเหนือ',
  'ภาคตะวันออกเฉียงเหนือ',
  'ภาคตะวันออก',
  'ภาคใต้',
];

export const HOSPITAL_TYPES: HospitalType[] = [
  'โรงเรียนแพทย์',
  'โรงพยาบาลรัฐ',
  'โรงพยาบาลเอกชน',
  'คลินิกเฉพาะทาง',
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Cardiovascular & Neuro Implants',
  'Orthopedic Joint Systems',
  'Surgical Robotics & Endoscopy',
  'CTEC Spine & Trauma Solutions',
  'Interventional Cardiology Stents',
  'เครื่องมือผ่าตัดและเวชภัณฑ์',
  'อุปกรณ์ห้อง ICU',
  'ระบบตรวจวินิจฉัยและภาพถ่าย',
  'วัสดุสิ้นเปลืองทางการแพทย์',
  'สัญญาบริการและบำรุงรักษา',
];

export const DEAL_STAGE_ORDER: DealStage[] = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

export const DEAL_STAGE_META: Record<
  DealStage,
  { label: string; shortLabel: string; color: string; textClass: string; defaultProbability: number }
> = {
  lead: {
    label: 'ผู้มุ่งหวังใหม่',
    shortLabel: 'ผู้มุ่งหวัง',
    color: '#94A3B8',
    textClass: 'text-slate-300',
    defaultProbability: 15,
  },
  qualified: {
    label: 'คัดกรองความต้องการ',
    shortLabel: 'คัดกรอง',
    color: '#EEC058',
    textClass: 'text-[#EEC058]',
    defaultProbability: 35,
  },
  proposal: {
    label: 'ยื่นใบเสนอราคา',
    shortLabel: 'เสนอราคา',
    color: '#FFAA00',
    textClass: 'text-[#FFCF90]',
    defaultProbability: 60,
  },
  negotiation: {
    label: 'เจรจาต่อรองสัญญา',
    shortLabel: 'เจรจาต่อรอง',
    color: '#FF5E1E',
    textClass: 'text-[#FFB59D]',
    defaultProbability: 80,
  },
  won: {
    label: 'ปิดการขายสำเร็จ',
    shortLabel: 'ปิดสำเร็จ',
    color: '#34D399',
    textClass: 'text-emerald-300',
    defaultProbability: 100,
  },
  lost: {
    label: 'ไม่สำเร็จ / ยกเลิก',
    shortLabel: 'ไม่สำเร็จ',
    color: '#F87171',
    textClass: 'text-rose-300',
    defaultProbability: 0,
  },
};

export const ROLE_META: Record<UserRole, { label: string; description: string; textClass: string }> = {
  admin: {
    label: 'ผู้ดูแลระบบสูงสุด',
    description: 'จัดการสิทธิ์ผู้ใช้ทั้งหมด ดูและแก้ไขข้อมูลทุกแผนก ปลดล็อกดีล และส่งออกรายงาน',
    textClass: 'text-[#FFB59D]',
  },
  executive: {
    label: 'ผู้บริหาร (Executive)',
    description: 'เข้าถึงแดชบอร์ดภาพรวม กราฟวิเคราะห์เชิงลึก แผนที่โรงพยาบาล และส่งออกรายงาน PDF/Excel',
    textClass: 'text-[#FFCF90]',
  },
  manager: {
    label: 'ผู้จัดการฝ่ายขาย',
    description: 'บริหารทีมขาย ดูแลลูกค้าโรงพยาบาลทุกพื้นที่ อัปเดตดีล และประกาศสรุปยอดขายรายวัน',
    textClass: 'text-[#EEC058]',
  },
  office_admin: {
    label: 'แอดมินออฟฟิศ (กรอกเคส)',
    description: 'กรอกและติดตามข้อมูลเคส Customized Implant ที่ออฟฟิศ บันทึกการฆ่าเชื้อ เลขที่ EMS และส่งออกตาราง Excel',
    textClass: 'text-sky-300',
  },
  sales: {
    label: 'ผู้แทนขายภาคสนาม',
    description: 'เพิ่มโรงพยาบาลและติดตามดีลของตนเอง ดูแผนที่ความหนาแน่นเคส และรับแจ้งเตือนเรียลไทม์',
    textClass: 'text-slate-300',
  },
};

export const HOSPITAL_STATUS_LABEL: Record<HospitalStatus, string> = {
  high_priority: 'เคสหนาแน่นสูง / ดูแลพิเศษ',
  active: 'ลูกค้าปัจจุบัน',
  prospect: 'อยู่ระหว่างติดต่อ',
  inactive: 'พักการติดตาม',
};

export function getDensityLevel(caseCount: number): DensityLevel {
  if (caseCount >= 100 || caseCount >= 30) return 'high';
  if (caseCount >= 11) return 'medium';
  if (caseCount >= 1) return 'low';
  return 'none';
}

export function getDensityMeta(caseCount: number): {
  level: DensityLevel;
  tierCode: string;
  label: string;
  color: string;
  textClass: string;
} {
  if (caseCount >= 120) {
    return {
      level: 'high',
      tierCode: 'CRITICAL HIGH',
      label: 'ความหนาแน่นวิกฤต (120+ เคส)',
      color: '#FF5E1E',
      textClass: 'text-[#FFB59D]',
    };
  }
  if (caseCount >= 30) {
    return {
      level: 'high',
      tierCode: 'HIGH HEAT',
      label: 'ความหนาแน่นสูง (30+ เคส)',
      color: '#FFAA00',
      textClass: 'text-[#FFCF90]',
    };
  }
  if (caseCount >= 11) {
    return {
      level: 'medium',
      tierCode: 'MODERATE',
      label: 'ความหนาแน่นปานกลาง (11–29 เคส)',
      color: '#EEC058',
      textClass: 'text-[#EEC058]',
    };
  }
  if (caseCount >= 1) {
    return {
      level: 'low',
      tierCode: 'ACTIVE',
      label: 'ความหนาแน่นปกติ (1–10 เคส)',
      color: '#34D399',
      textClass: 'text-emerald-300',
    };
  }
  return {
    level: 'none',
    tierCode: 'PROSPECT',
    label: 'ยังไม่มีเคส (0 เคส)',
    color: '#94A3B8',
    textClass: 'text-slate-400',
  };
}

export function getDensityTierLabel(caseCount: number): {
  label: string;
  textClass: string;
} {
  const meta = getDensityMeta(caseCount);
  return {
    label: meta.tierCode,
    textClass: meta.textClass,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `฿${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `฿${(value / 1_000).toFixed(0)}K`;
  }
  return `฿${Math.round(value).toLocaleString('th-TH')}`;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts) return 'เมื่อสักครู่';
  try {
    const date = ts.toDate();
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
}
