import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Flame,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  Table2,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  matchCatalogHospitalByName,
  normalizeHospitalNameKey,
  THAILAND_HOSPITALS_CATALOG,
} from '../data/thailandHospitalsCatalog';
import {
  DEAL_STAGE_META,
  DEAL_STAGE_ORDER,
  formatCompactCurrency,
  formatCurrency,
  formatTimestamp,
  getDensityMeta,
  PRODUCT_CATEGORIES,
  REGIONS,
  type Deal,
  type Hospital,
  type NotificationItem,
  type OfficeCase,
  type RegionName,
  type UserProfile,
} from '../types';
import type { ExecutiveSummaryMetrics } from '../utils/exportReports';
import { MonthlyYearlyCasesChart } from './MonthlyYearlyCasesChart';

interface DashboardViewProps {
  mode: 'dashboard' | 'analytics';
  currentUser: UserProfile;
  users: UserProfile[];
  hospitals: Hospital[];
  deals: Deal[];
  officeCases: OfficeCase[];
  notifications: NotificationItem[];
  summary: ExecutiveSummaryMetrics;
  exportingPdf: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onBroadcastDailySummary: () => Promise<void>;
  onJumpToMap: (hospitalId?: string) => void;
  onOpenNewDeal: () => void;
  onNotifyToast: (msg: string) => void;
}

const PIE_COLORS = ['#FF5E1E', '#FFAA00', '#EEC058', '#FFB59D', '#38BDF8', '#34D399'];

const THAI_MONTH_LIST = [
  { month: 1, short: 'ม.ค.', full: 'มกราคม' },
  { month: 2, short: 'ก.พ.', full: 'กุมภาพันธ์' },
  { month: 3, short: 'มี.ค.', full: 'มีนาคม' },
  { month: 4, short: 'เม.ย.', full: 'เมษายน' },
  { month: 5, short: 'พ.ค.', full: 'พฤษภาคม' },
  { month: 6, short: 'มิ.ย.', full: 'มิถุนายน' },
  { month: 7, short: 'ก.ค.', full: 'กรกฎาคม' },
  { month: 8, short: 'ส.ค.', full: 'สิงหาคม' },
  { month: 9, short: 'ก.ย.', full: 'กันยายน' },
  { month: 10, short: 'ต.ค.', full: 'ตุลาคม' },
  { month: 11, short: 'พ.ย.', full: 'พฤศจิกายน' },
  { month: 12, short: 'ธ.ค.', full: 'ธันวาคม' },
] as const;

function normalizePersonKey(raw?: string | null): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseDateToYearMonth(
  raw?: string | null,
  fallbackTs?: { toDate?: () => Date } | null
): { year: number; month: number } | null {
  const s = (raw || '').trim();
  if (s) {
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})/);
    if (isoMatch) {
      let yr = Number(isoMatch[1]);
      const mo = Number(isoMatch[2]);
      if (yr > 2400) yr -= 543;
      if (mo >= 1 && mo <= 12) return { year: yr, month: mo };
    }

    const slashMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (slashMatch) {
      const mo = Number(slashMatch[2]);
      let yr = Number(slashMatch[3]);
      if (yr < 100) {
        yr = yr >= 50 ? 2500 + yr - 543 : 2000 + yr;
      } else if (yr > 2400) {
        yr -= 543;
      }
      if (mo >= 1 && mo <= 12) return { year: yr, month: mo };
    }
  }

  if (fallbackTs && typeof fallbackTs.toDate === 'function') {
    const dt = fallbackTs.toDate();
    if (!Number.isNaN(dt.getTime())) {
      return { year: dt.getFullYear(), month: dt.getMonth() + 1 };
    }
  }

  return null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  mode,
  currentUser,
  users,
  hospitals,
  deals,
  officeCases,
  notifications,
  summary,
  exportingPdf,
  onExportExcel,
  onExportPdf,
  onBroadcastDailySummary,
  onJumpToMap,
  onOpenNewDeal,
  onNotifyToast,
}) => {
  const nowDate = useMemo(() => new Date(), []);
  const [regionFilter, setRegionFilter] = useState<'all' | RegionName>('all');
  const [leaderboardSort, setLeaderboardSort] = useState<'cases' | 'revenue'>('cases');
  const [salesYear, setSalesYear] = useState<number>(() => nowDate.getFullYear());
  const [salesMonth, setSalesMonth] = useState<'all' | number>(() => nowDate.getMonth() + 1);
  const [salesViewMode, setSalesViewMode] = useState<'monthly' | 'matrix12'>('monthly');
  const [broadcasting, setBroadcasting] = useState(false);

  const handleBroadcastClick = async () => {
    if (broadcasting) return;
    setBroadcasting(true);
    try {
      await onBroadcastDailySummary();
    } finally {
      setBroadcasting(false);
    }
  };

  const canBroadcast =
    currentUser.role === 'admin' ||
    currentUser.role === 'executive' ||
    currentUser.role === 'manager';

  // Filtered live hospitals & deals by region
  const scopedHospitals = useMemo(
    () =>
      regionFilter === 'all'
        ? hospitals
        : hospitals.filter((h) => h.region === regionFilter),
    [hospitals, regionFilter]
  );

  const scopedHospitalIds = useMemo(() => {
    const map: Record<string, boolean> = {};
    scopedHospitals.forEach((h) => {
      map[h.id] = true;
    });
    return map;
  }, [scopedHospitals]);

  const scopedDeals = useMemo(
    () =>
      regionFilter === 'all'
        ? deals
        : deals.filter((d) => scopedHospitalIds[d.hospitalId]),
    [deals, regionFilter, scopedHospitalIds]
  );

  // Resolve region for each live officeCase using CRM hospitals or the offline 77-province catalog
  const scopedOfficeCases = useMemo(() => {
    if (regionFilter === 'all') return officeCases;
    const hospitalRegionByKey = new Map<string, RegionName>();
    hospitals.forEach((h) => {
      hospitalRegionByKey.set(normalizeHospitalNameKey(h.name), h.region);
    });
    return officeCases.filter((oc) => {
      const name = oc.hospitalName.trim();
      if (!name) return false;
      const key = normalizeHospitalNameKey(name);
      const crmReg = hospitalRegionByKey.get(key);
      if (crmReg) return crmReg === regionFilter;
      const catalogMatch = matchCatalogHospitalByName(name);
      return catalogMatch ? catalogMatch.region === regionFilter : false;
    });
  }, [officeCases, hospitals, regionFilter]);

  // 100% Live Firestore KPIs (Zero hardcoded demo data)
  const displayKpis = useMemo(() => {
    const liveHospitalCases = scopedHospitals.reduce((acc, h) => acc + h.caseCount, 0);
    const liveOfficeCount = scopedOfficeCases.length;
    const totalCasesAll = liveHospitalCases + liveOfficeCount;

    const liveWonRevenue = scopedDeals
      .filter((d) => d.stage === 'won')
      .reduce((acc, d) => acc + d.amount, 0);
    const liveOfficeRevenue = scopedOfficeCases.reduce((acc, c) => acc + (c.price || 0), 0);
    const totalRevenue = liveWonRevenue + liveOfficeRevenue;

    const partnerAllKeys = new Set<string>();
    const partnerWithCasesKeys = new Set<string>();

    scopedHospitals.forEach((h) => {
      const cat =
        THAILAND_HOSPITALS_CATALOG.find((c) => c.id === h.placeId) ||
        matchCatalogHospitalByName(h.name);
      const key = cat ? `cat:${cat.id}` : `norm:${normalizeHospitalNameKey(h.name) || h.id}`;
      partnerAllKeys.add(key);
      if (h.caseCount > 0) partnerWithCasesKeys.add(key);
    });

    scopedOfficeCases.forEach((oc) => {
      const rawName = (oc.hospitalName || '').trim();
      if (!rawName || rawName === '-' || rawName.length < 2) return;
      const cat = matchCatalogHospitalByName(rawName);
      const key = cat
        ? `cat:${cat.id}`
        : `norm:${normalizeHospitalNameKey(rawName) || rawName.toLowerCase()}`;
      partnerAllKeys.add(key);
      partnerWithCasesKeys.add(key);
    });

    const activeHospitalsCount = partnerAllKeys.size;
    const hospitalsWithCases = partnerWithCasesKeys.size;

    // Determine top region strictly from live hospitals + live officeCases
    const regionCounts: Record<string, number> = {};
    scopedHospitals.forEach((h) => {
      regionCounts[h.region] = (regionCounts[h.region] || 0) + h.caseCount;
    });
    const hospRegionLookup = new Map<string, RegionName>();
    hospitals.forEach((h) => hospRegionLookup.set(normalizeHospitalNameKey(h.name), h.region));
    scopedOfficeCases.forEach((oc) => {
      const key = normalizeHospitalNameKey(oc.hospitalName);
      const reg =
        hospRegionLookup.get(key) ||
        matchCatalogHospitalByName(oc.hospitalName)?.region;
      if (reg) {
        regionCounts[reg] = (regionCounts[reg] || 0) + 1;
      }
    });

    let topRegionName = '';
    let topRegionCases = 0;
    Object.entries(regionCounts).forEach(([reg, count]) => {
      if (count > topRegionCases) {
        topRegionCases = count;
        topRegionName = reg;
      }
    });
    const topRegionSharePct =
      totalCasesAll > 0 ? Math.round((topRegionCases / totalCasesAll) * 100) : 0;

    const activeUsersCount = users.filter(
      (u) => u.active && (!u.approvalStatus || u.approvalStatus === 'approved')
    ).length;
    const pendingUsersCount = users.filter((u) => u.approvalStatus === 'pending').length;

    return {
      totalCasesAll,
      liveHospitalCases,
      liveOfficeCount,
      totalRevenue,
      liveWonRevenue,
      liveOfficeRevenue,
      activeHospitalsCount,
      hospitalsWithCases,
      topRegionName,
      topRegionCases,
      topRegionSharePct,
      activeUsersCount,
      pendingUsersCount,
      totalUsersCount: users.length,
    };
  }, [scopedHospitals, scopedDeals, scopedOfficeCases, hospitals, users]);

  // Approved active sales representatives registered in the system
  const approvedSalesUsers = useMemo(() => {
    return users
      .filter(
        (u) =>
          u.role === 'sales' &&
          u.active &&
          (!u.approvalStatus || u.approvalStatus === 'approved')
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'th'));
  }, [users]);

  // Admin / Office Admin accounts (excluded from appearing as salesperson rows)
  const adminAccountLookup = useMemo(() => {
    const uids = new Set<string>();
    const names = new Set<string>();
    users.forEach((u) => {
      if (u.role === 'admin' || u.role === 'office_admin') {
        uids.add(u.uid);
        const norm = normalizePersonKey(u.displayName);
        if (norm) names.add(norm);
      }
    });
    return { uids, names };
  }, [users]);

  // Available years from current year + live deals & office cases
  const availableSalesYears = useMemo(() => {
    const yearSet = new Set<number>([nowDate.getFullYear(), nowDate.getFullYear() - 1, 2024]);
    scopedDeals.forEach((d) => {
      const parsed =
        parseDateToYearMonth(d.dateKey) ||
        parseDateToYearMonth(d.expectedCloseDate, d.createdAt);
      if (parsed && parsed.year >= 2020 && parsed.year <= 2035) yearSet.add(parsed.year);
    });
    scopedOfficeCases.forEach((oc) => {
      const parsed =
        parseDateToYearMonth(oc.receivedDate) ||
        parseDateToYearMonth(oc.surgeryDate) ||
        parseDateToYearMonth(oc.deliveryDate, oc.createdAt);
      if (parsed && parsed.year >= 2020 && parsed.year <= 2035) yearSet.add(parsed.year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [nowDate, scopedDeals, scopedOfficeCases]);

  // Monthly & 12-Month Salesperson Case Count
  // Connects registered sales users + salesperson names (caseReceiver) from Admin-entered officeCases + sales deals
  const monthlySalesPerformance = useMemo(() => {
    interface MonthSlot {
      cases: number;
      revenue: number;
      pipeline: number;
    }

    interface RepBucket {
      key: string;
      uid?: string;
      name: string;
      territory: string;
      isRegisteredSales: boolean;
      months: Record<number, MonthSlot>;
    }

    const createEmptyMonths = () => {
      const months: Record<number, MonthSlot> = {};
      for (let m = 1; m <= 12; m += 1) {
        months[m] = { cases: 0, revenue: 0, pipeline: 0 };
      }
      return months;
    };

    const bucketsByKey = new Map<string, RepBucket>();
    const uidToKey = new Map<string, string>();
    const nameNormToKey = new Map<string, string>();

    // 1. Seed ALL approved active registered salespeople first
    approvedSalesUsers.forEach((u) => {
      const key = `uid:${u.uid}`;
      bucketsByKey.set(key, {
        key,
        uid: u.uid,
        name: u.displayName,
        territory: u.territory || 'ทั่วประเทศ',
        isRegisteredSales: true,
        months: createEmptyMonths(),
      });
      uidToKey.set(u.uid, key);
      const norm = normalizePersonKey(u.displayName);
      if (norm) nameNormToKey.set(norm, key);
    });

    const resolveOrCreateSalesRep = (
      rawName: string | undefined,
      uid?: string
    ): RepBucket | null => {
      const cleanedName = (rawName || '').trim();
      const normName = normalizePersonKey(cleanedName);

      // Match registered sales user by exact name or UID first
      if (normName && nameNormToKey.has(normName)) {
        return bucketsByKey.get(nameNormToKey.get(normName)!) || null;
      }
      if (uid && uidToKey.has(uid)) {
        return bucketsByKey.get(uidToKey.get(uid)!) || null;
      }

      // Skip blank placeholders or Admin/Office Admin accounts
      if (!cleanedName || cleanedName === '-' || cleanedName === 'ไม่ระบุ') {
        return null;
      }
      if (
        (uid && adminAccountLookup.uids.has(uid)) ||
        (normName && adminAccountLookup.names.has(normName))
      ) {
        return null;
      }

      const fallbackKey = `sales-name:${normName}`;
      const existing = bucketsByKey.get(fallbackKey);
      if (existing) return existing;

      const created: RepBucket = {
        key: fallbackKey,
        name: cleanedName,
        territory: '',
        isRegisteredSales: false,
        months: createEmptyMonths(),
      };
      bucketsByKey.set(fallbackKey, created);
      nameNormToKey.set(normName, fallbackKey);
      return created;
    };

    // 2. Roll up Admin-entered / Excel-imported office cases linked by salesperson name (caseReceiver)
    scopedOfficeCases.forEach((oc) => {
      const parsed =
        parseDateToYearMonth(oc.receivedDate) ||
        parseDateToYearMonth(oc.surgeryDate) ||
        parseDateToYearMonth(oc.deliveryDate, oc.createdAt);
      if (!parsed || parsed.year !== salesYear) return;

      const salesName = (oc.caseReceiver || '').trim();
      if (!salesName || salesName === '-') return;

      const bucket = resolveOrCreateSalesRep(salesName);
      if (!bucket) return;

      const slot = bucket.months[parsed.month];
      slot.cases += 1;
      slot.revenue += oc.price || 0;
    });

    // 3. Roll up Sales Pipeline deals (excluding admin accounts)
    scopedDeals.forEach((d) => {
      const parsed =
        parseDateToYearMonth(d.dateKey) ||
        parseDateToYearMonth(d.expectedCloseDate, d.createdAt);
      if (!parsed || parsed.year !== salesYear) return;

      const bucket = resolveOrCreateSalesRep(d.ownerName, d.ownerId);
      if (!bucket) return;

      const caseQty = d.caseVolume && d.caseVolume > 0 ? d.caseVolume : 1;
      const slot = bucket.months[parsed.month];
      slot.cases += caseQty;
      if (d.stage === 'won') {
        slot.revenue += d.amount || 0;
      } else if (d.stage !== 'lost') {
        slot.pipeline += d.amount || 0;
      }
    });

    const rows = Array.from(bucketsByKey.values()).map((bucket) => {
      let selectedCases = 0;
      let selectedRevenue = 0;
      let selectedPipeline = 0;
      let yearlyCases = 0;
      let yearlyRevenue = 0;

      for (let m = 1; m <= 12; m += 1) {
        yearlyCases += bucket.months[m].cases;
        yearlyRevenue += bucket.months[m].revenue;
      }

      if (salesMonth === 'all') {
        selectedCases = yearlyCases;
        selectedRevenue = yearlyRevenue;
        for (let m = 1; m <= 12; m += 1) {
          selectedPipeline += bucket.months[m].pipeline;
        }
      } else {
        selectedCases = bucket.months[salesMonth].cases;
        selectedRevenue = bucket.months[salesMonth].revenue;
        selectedPipeline = bucket.months[salesMonth].pipeline;
      }

      return {
        ...bucket,
        closedCases: selectedCases,
        revenue: selectedRevenue,
        pipeline: selectedPipeline,
        yearlyCases,
        yearlyRevenue,
      };
    });

    rows.sort((a, b) => {
      const primary =
        leaderboardSort === 'cases'
          ? b.closedCases - a.closedCases || b.revenue - a.revenue
          : b.revenue - a.revenue || b.closedCases - a.closedCases;
      if (primary !== 0) return primary;
      if (b.yearlyCases !== a.yearlyCases) return b.yearlyCases - a.yearlyCases;
      if (a.isRegisteredSales !== b.isRegisteredSales) {
        return a.isRegisteredSales ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'th');
    });

    const maxVal = rows.reduce(
      (m, r) => Math.max(m, leaderboardSort === 'cases' ? r.closedCases : r.revenue),
      0
    );

    const totalRevenuePeriod = rows.reduce((s, r) => s + r.revenue, 0);
    const totalCasesPeriod = rows.reduce((s, r) => s + r.closedCases, 0);
    const totalCasesYear = rows.reduce((s, r) => s + r.yearlyCases, 0);

    const ranked = rows.map((item, idx) => ({
      ...item,
      sharePct:
        maxVal > 0
          ? item.closedCases > 0 || item.revenue > 0
            ? Math.max(
                8,
                Math.round(
                  ((leaderboardSort === 'cases' ? item.closedCases : item.revenue) / maxVal) * 100
                )
              )
            : 0
          : 0,
      starPerformer: idx === 0 && (item.closedCases > 0 || item.revenue > 0),
    }));

    return {
      rows: ranked,
      totalRevenuePeriod,
      totalCasesPeriod,
      totalCasesYear,
    };
  }, [
    approvedSalesUsers,
    adminAccountLookup,
    scopedDeals,
    scopedOfficeCases,
    salesYear,
    salesMonth,
    leaderboardSort,
  ]);

  const selectedMonthLabel =
    salesMonth === 'all'
      ? `ทั้งปี ${salesYear + 543}`
      : `${THAI_MONTH_LIST[salesMonth - 1]?.full || ''} ${salesYear + 543}`;

  // 100% Live Top Hospital Hotspots (merges live CRM hospitals + live officeCases)
  const topHotspots = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        hospitalId?: string;
        name: string;
        specialty: string;
        cases: number;
      }
    >();

    scopedHospitals.forEach((h) => {
      const key = normalizeHospitalNameKey(h.name);
      map.set(key, {
        id: h.id,
        hospitalId: h.id,
        name: h.name,
        specialty: `${h.hospitalType} · ${h.province || h.region}`,
        cases: h.caseCount,
      });
    });

    scopedOfficeCases.forEach((oc) => {
      const rawName = oc.hospitalName.trim();
      if (!rawName) return;
      const key = normalizeHospitalNameKey(rawName);
      const existing = map.get(key);
      if (existing) {
        existing.cases += 1;
      } else {
        const matched = matchCatalogHospitalByName(rawName);
        map.set(key, {
          id: matched?.id || `oc-${key}`,
          name: matched?.name || rawName,
          specialty: matched
            ? `${matched.hospitalType} · ${matched.province}`
            : 'เคสออฟฟิศ CTEC',
          cases: 1,
        });
      }
    });

    const rows = Array.from(map.values())
      .filter((r) => r.cases > 0)
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 5);

    const maxCases = rows[0]?.cases || 1;
    return rows.map((r) => {
      const density = getDensityMeta(r.cases);
      return {
        ...r,
        tierCode: density.tierCode,
        color: density.color,
        progressPct: Math.min(100, Math.max(12, Math.round((r.cases / maxCases) * 100))),
      };
    });
  }, [scopedHospitals, scopedOfficeCases]);

  // Pipeline Stage Chart Data (100% live deals)
  const stageChartData = useMemo(() => {
    return DEAL_STAGE_ORDER.map((stage) => {
      const matched = scopedDeals.filter((d) => d.stage === stage);
      return {
        stage,
        name: DEAL_STAGE_META[stage].shortLabel,
        count: matched.length,
        amount: matched.reduce((acc, d) => acc + d.amount, 0),
        color: DEAL_STAGE_META[stage].color,
      };
    });
  }, [scopedDeals]);

  // Product Category Breakdown (100% live deals only — zero demo fallback)
  const categoryData = useMemo(() => {
    const liveCategories = PRODUCT_CATEGORIES.map((cat, idx) => {
      const matched = scopedDeals.filter((d) => d.productCategory === cat);
      const amount = matched.reduce((sum, d) => sum + d.amount, 0);
      return {
        name: cat,
        value: amount,
        count: matched.length,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      };
    }).filter((c) => c.value > 0 || c.count > 0);

    const total = liveCategories.reduce((s, item) => s + item.value, 0);
    return liveCategories.map((item) => ({
      ...item,
      share: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [scopedDeals]);

  // Regional Density Breakdown (100% live hospitals + officeCases)
  const regionDensityData = useMemo(() => {
    const hospRegionLookup = new Map<string, RegionName>();
    hospitals.forEach((h) => hospRegionLookup.set(normalizeHospitalNameKey(h.name), h.region));

    const officeByRegion: Record<string, number> = {};
    officeCases.forEach((oc) => {
      const key = normalizeHospitalNameKey(oc.hospitalName);
      const reg =
        hospRegionLookup.get(key) ||
        matchCatalogHospitalByName(oc.hospitalName)?.region;
      if (reg) officeByRegion[reg] = (officeByRegion[reg] || 0) + 1;
    });

    return REGIONS.map((region) => {
      const liveCases = hospitals
        .filter((h) => h.region === region)
        .reduce((s, h) => s + h.caseCount, 0);
      return {
        region: region
          .replace('กรุงเทพและปริมณฑล', 'กทม./ปริมณฑล')
          .replace('ภาคตะวันออกเฉียงเหนือ', 'ภาคอีสาน'),
        cases: liveCases + (officeByRegion[region] || 0),
      };
    });
  }, [hospitals, officeCases]);

  // 100% Live Activity Cards (strictly from live Firestore notifications)
  const activityCards = useMemo(() => {
    return notifications.slice(0, 3).map((n) => ({
      id: n.id,
      timeLabel: formatTimestamp(n.createdAt),
      locationLabel: n.type === 'daily_summary' ? 'สรุปยอดทั้งองค์กร' : 'อัปเดตหน้างาน',
      headline: n.title,
      detail: n.message,
      amount: n.amount,
      statusLabel:
        n.type === 'deal_won'
          ? 'ปิดการขายสำเร็จ'
          : n.type === 'high_density_alert'
            ? 'เคสหนาแน่นสูง'
            : 'แจ้งเตือนเรียลไทม์',
      accentColor: n.type === 'high_density_alert' ? '#FF5E1E' : '#FFCF90',
    }));
  }, [notifications]);

  return (
    <div className="space-y-6">
      {/* Section 1: Executive Command Header & Filter Rail */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#C8B6AE]">
            <span className="font-semibold text-[#FFB59D]">Firebase Firestore Live</span>
            <span aria-hidden="true">·</span>
            <span>ข้อมูลใช้งานจริง 100%</span>
            <span aria-hidden="true">·</span>
            <span>CTEC Devices CRM</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#F4F6FB] tracking-tight leading-tight">
            {mode === 'dashboard'
              ? 'ภาพรวมผลงานการขายและสถิติเคสโรงพยาบาลทั่วประเทศ'
              : 'วิเคราะห์ข้อมูลเชิงลึก จำนวนเคสรายเดือน รายปี และสถานะการขาย'}
          </h1>
          <p className="text-sm text-[#B5BDCB]">
            ศูนย์รวมข้อมูลธุรกรรมเคสผ่าตัดและอุปกรณ์การแพทย์ระดับผู้บริหาร CTEC Devices
          </p>
        </div>

        {/* Synchronized Apple Glass Filter Rail */}
        <div className="glass-panel rounded-2xl p-2 flex flex-wrap items-center gap-2">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value as 'all' | RegionName)}
            aria-label="เลือกภูมิภาค"
            className="glass-input h-9 px-3 rounded-xl text-xs font-medium cursor-pointer"
          >
            <option value="all">ทุกภูมิภาค (ทั่วประเทศ)</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onNotifyToast('ข้อมูลซิงก์แบบเรียลไทม์จาก Firebase Firestore แล้ว')}
            className="btn-glass h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FFB59D]" />
            <span>รีเฟรชสถิติ</span>
          </button>
        </div>
      </div>

      {/* Section 2: 5 Apple Frosted Glass KPI Cards (100% Live Firestore Metrics) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Live Cases */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-[#FF5E1E]/20 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">เคสสะสมทั้งหมด</span>
            <span className="text-[#FFB59D] font-mono tabular-nums font-semibold">
              Live
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-3xl font-bold text-[#F4F6FB]">
              {displayKpis.totalCasesAll.toLocaleString('th-TH')}
            </span>
            <span className="text-xs text-[#B5BDCB]">เคส</span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#8E97AB] font-mono tabular-nums">
            ออฟฟิศ {displayKpis.liveOfficeCount} · ฝ่ายขาย {displayKpis.liveHospitalCases}
          </div>
        </div>

        {/* KPI 2: Net Cumulative Revenue */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-[#FFAA00]/18 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">ยอดขายสะสมสุทธิ</span>
            <span className="text-[#FFCF90] font-mono tabular-nums font-semibold">
              {summary.winRate > 0 ? `Win ${summary.winRate.toFixed(0)}%` : '฿'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="apple-stat text-3xl font-bold text-[#FFCF90]">
              {formatCompactCurrency(displayKpis.totalRevenue)}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#8E97AB] font-mono tabular-nums">
            วันนี้ {formatCurrency(summary.todayWonRevenue)}
          </div>
        </div>

        {/* KPI 3: Partner Hospitals (Linked CRM + Office Cases) */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">โรงพยาบาล</span>
            <Building2 className="w-4 h-4 text-[#FFB59D]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-3xl font-bold text-[#F4F6FB]">
              {displayKpis.activeHospitalsCount.toLocaleString('th-TH')}
            </span>
            <span className="text-xs text-[#8E97AB] font-mono tabular-nums">
              / {THAILAND_HOSPITALS_CATALOG.length} แห่ง
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#B5BDCB]">
            มีเคสเชื่อมแล้ว {displayKpis.hospitalsWithCases.toLocaleString('th-TH')} แห่ง · แผนที่ครบ 77 จว.
          </div>
        </div>

        {/* KPI 4: Top Regional Hotspot */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">พื้นที่เคสหนาแน่นสูงสุด</span>
            <Flame className="w-4 h-4 text-[#FF5E1E]" />
          </div>
          <div className="mt-2">
            <div className="text-base font-semibold text-[#F4F6FB] truncate">
              {displayKpis.topRegionCases > 0 ? displayKpis.topRegionName : 'ยังไม่มีข้อมูล'}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="apple-stat text-2xl font-bold text-[#FFB59D]">
                {displayKpis.topRegionCases.toLocaleString('th-TH')}
              </span>
              <span className="text-[11px] text-[#B5BDCB]">
                เคส {displayKpis.topRegionCases > 0 ? `(${displayKpis.topRegionSharePct}%)` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Active Users in System */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">ทีมงานในระบบ</span>
            <Users className="w-4 h-4 text-[#FFCF90]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-3xl font-bold text-[#F4F6FB]">
              {displayKpis.activeUsersCount}
            </span>
            <span className="text-xs text-[#8E97AB] font-mono tabular-nums">
              / {displayKpis.totalUsersCount} บัญชี
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#B5BDCB] flex items-center justify-between gap-2">
            <span className="truncate">
              ฝ่ายขายอนุมัติแล้ว {approvedSalesUsers.length} คน
            </span>
            {displayKpis.pendingUsersCount > 0 ? (
              <span className="text-[#FFCF90] font-semibold shrink-0">
                รออนุมัติ {displayKpis.pendingUsersCount}
              </span>
            ) : (
              <span className="text-[#8E97AB] font-mono tabular-nums shrink-0">
                ดีลวันนี้ +{summary.todayNewDeals}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Flagship Monthly & Yearly Case Volume Analytics Chart (100% Live Data) */}
      <MonthlyYearlyCasesChart deals={scopedDeals} officeCases={scopedOfficeCases} />

      {/* Section 4: Dashboard Central Split OR Deep Analytics Charts */}
      {mode === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Monthly Salesperson Case Count Board (Linked from Admin Office Cases + Sales Deals, Salespeople Only) */}
          <section
            className={`${
              salesViewMode === 'matrix12' ? 'lg:col-span-12' : 'lg:col-span-7'
            } glass-panel rounded-2xl p-5 sm:p-6`}
          >
            <div className="flex flex-col gap-3.5 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#FFAA00]" />
                    <h2 className="text-lg font-semibold text-[#F4F6FB]">
                      จำนวนเคสประจำเดือน
                    </h2>
                  </div>
                  <p className="text-xs text-[#B5BDCB] mt-0.5">
                    แสดงยอดเคสแยกตามชื่อพนักงานฝ่ายขาย โดยเชื่อมต่อข้อมูลจากเคสที่แอดมินและฝ่ายขายบันทึกไว้โดยอัตโนมัติ
                  </p>
                </div>

                {/* View Mode Toggle: Monthly Detail vs 12-Month Table */}
                <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08] self-start shrink-0">
                  <button
                    type="button"
                    onClick={() => setSalesViewMode('monthly')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      salesViewMode === 'monthly'
                        ? 'bg-[#262A34] text-[#FFB59D]'
                        : 'text-[#8E97AB] hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    สรุปรายเดือน
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesViewMode('matrix12')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      salesViewMode === 'matrix12'
                        ? 'bg-[#262A34] text-[#FFB59D]'
                        : 'text-[#8E97AB] hover:text-white'
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    ตาราง 12 เดือน
                  </button>
                </div>
              </div>

              {/* Filter Bar: Year, Month, Sort */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={salesYear}
                  onChange={(e) => setSalesYear(Number(e.target.value))}
                  aria-label="เลือกปีจำนวนเคส"
                  className="glass-input h-8 px-2.5 rounded-xl text-xs font-medium cursor-pointer"
                >
                  {availableSalesYears.map((yr) => (
                    <option key={yr} value={yr}>
                      ปี {yr + 543} ({yr})
                    </option>
                  ))}
                </select>

                {salesViewMode === 'monthly' && (
                  <select
                    value={salesMonth === 'all' ? 'all' : String(salesMonth)}
                    onChange={(e) =>
                      setSalesMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    aria-label="เลือกเดือนจำนวนเคส"
                    className="glass-input h-8 px-2.5 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="all">รวมทั้งปี (12 เดือน)</option>
                    {THAI_MONTH_LIST.map((m) => (
                      <option key={m.month} value={m.month}>
                        เดือน {m.full}
                      </option>
                    ))}
                  </select>
                )}

                <div className="inline-flex items-center p-0.5 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08] sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => setLeaderboardSort('cases')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      leaderboardSort === 'cases'
                        ? 'bg-[#262A34] text-[#FFB59D]'
                        : 'text-[#8E97AB] hover:text-white'
                    }`}
                  >
                    จำนวนเคส
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardSort('revenue')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      leaderboardSort === 'revenue'
                        ? 'bg-[#262A34] text-[#FFB59D]'
                        : 'text-[#8E97AB] hover:text-white'
                    }`}
                  >
                    ยอดเงิน
                  </button>
                </div>
              </div>
            </div>

            {monthlySalesPerformance.rows.length === 0 ? (
              <div className="glass-tile rounded-xl p-8 text-center space-y-3">
                <UserCheck className="w-8 h-8 text-[#FFCF90] mx-auto opacity-80" />
                <p className="text-sm font-semibold text-white">
                  ยังไม่มีข้อมูลเคสของพนักงานฝ่ายขาย
                </p>
                <p className="text-xs text-[#B5BDCB] max-w-md mx-auto leading-relaxed">
                  เมื่อแอดมินบันทึกเคสพร้อมระบุชื่อผู้รับเคส (ฝ่ายขาย) หรือเมื่อพนักงานฝ่ายขายได้รับอนุมัติเข้าใช้งาน ชื่อและจำนวนเคสแต่ละเดือนจะแสดงขึ้นที่นี่โดยอัตโนมัติ
                </p>
                <button
                  type="button"
                  onClick={onOpenNewDeal}
                  className="btn-luxury-orange inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  บันทึกเคสแรก
                </button>
              </div>
            ) : salesViewMode === 'monthly' ? (
              <div className="space-y-3">
                {salesMonth !== 'all' &&
                  monthlySalesPerformance.totalCasesPeriod === 0 &&
                  monthlySalesPerformance.totalCasesYear > 0 && (
                    <div className="rounded-xl bg-[#FFAA00]/10 border border-[#FFAA00]/25 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[#FFCF90]">
                        เดือน {THAI_MONTH_LIST[salesMonth - 1]?.full} {salesYear + 543} ยังไม่มีเคสที่บันทึก (แต่ปีนี้มีสะสม{' '}
                        <span className="font-mono tabular-nums font-bold">
                          {monthlySalesPerformance.totalCasesYear.toLocaleString('th-TH')}
                        </span>{' '}
                        เคส)
                      </span>
                      <button
                        type="button"
                        onClick={() => setSalesMonth('all')}
                        className="text-[#FFB59D] hover:text-white font-semibold underline underline-offset-2 cursor-pointer"
                      >
                        ดูรวมทั้งปี {salesYear + 543}
                      </button>
                    </div>
                  )}

                {monthlySalesPerformance.rows.map((rep, idx) => (
                  <div
                    key={rep.key}
                    className="glass-tile group rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          rep.starPerformer
                            ? 'bg-gradient-to-br from-[#FF7038] to-[#D94309] text-white shadow-[0_6px_18px_rgba(255,94,30,0.4)]'
                            : 'bg-[#262A34] text-[#DFE2EF] border border-white/[0.08]'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-[#F4F6FB] truncate">
                            {rep.name}
                          </span>
                          {rep.starPerformer && (
                            <span className="text-[11px] font-semibold text-[#FFCF90]">
                              · สูงสุดประจำช่วงนี้
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#B5BDCB] mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span className="text-[#FFB59D]">
                            พนักงานฝ่ายขาย
                            {rep.territory ? ` · ${rep.territory}` : ''}
                          </span>
                          {rep.revenue > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-[#DFE2EF]">
                                ยอดรวม {formatCompactCurrency(rep.revenue)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                      <div className="text-right">
                        <div
                          className={`apple-stat text-base font-bold ${
                            rep.starPerformer ? 'text-[#FFCF90]' : 'text-[#F4F6FB]'
                          }`}
                        >
                          {rep.closedCases.toLocaleString('th-TH')}{' '}
                          <span className="text-xs font-normal text-[#B5BDCB]">เคส</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className="text-[10px] text-[#8E97AB] font-mono tabular-nums">
                            ทั้งปี {rep.yearlyCases.toLocaleString('th-TH')} เคส
                          </span>
                          <div className="w-20 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${rep.sharePct}%`,
                                backgroundColor:
                                  idx === 0
                                    ? '#FFCF90'
                                    : idx === 1
                                      ? '#FF5E1E'
                                      : idx === 2
                                        ? '#FFAA00'
                                        : '#EEC058',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8E97AB] group-hover:text-[#FFB59D] transition-colors hidden sm:block" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 12-Month Case Count Matrix Table (Salespeople Only) */
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0B0F18]/65">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[#B5BDCB]">
                      <th className="sticky left-0 z-10 bg-[#121723] px-3.5 py-3 text-left font-semibold min-w-[170px] border-r border-white/[0.08]">
                        พนักงานฝ่ายขาย
                      </th>
                      {THAI_MONTH_LIST.map((m) => (
                        <th
                          key={m.month}
                          className={`px-2.5 py-3 text-right font-semibold whitespace-nowrap min-w-[70px] ${
                            salesMonth === m.month ? 'text-[#FFCF90] bg-[#FF5E1E]/10' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSalesMonth(m.month);
                              setSalesViewMode('monthly');
                            }}
                            className="hover:text-[#FFB59D] transition-colors cursor-pointer"
                            title={`ดูจำนวนเคสเดือน ${m.full}`}
                          >
                            {m.short}
                          </button>
                        </th>
                      ))}
                      <th className="px-3.5 py-3 text-right font-semibold text-[#FFCF90] whitespace-nowrap min-w-[96px] border-l border-white/[0.08]">
                        รวมปี {salesYear + 543}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {monthlySalesPerformance.rows.map((rep) => (
                      <tr key={rep.key} className="hover:bg-white/[0.03] transition-colors">
                        <td className="sticky left-0 z-10 bg-[#121723] px-3.5 py-3 border-r border-white/[0.08]">
                          <div className="font-semibold text-[#F4F6FB] truncate max-w-[160px]">
                            {rep.name}
                          </div>
                          <div className="text-[10px] text-[#8E97AB] truncate max-w-[160px]">
                            {rep.territory || 'พนักงานฝ่ายขาย'}
                          </div>
                        </td>
                        {THAI_MONTH_LIST.map((m) => {
                          const cell = rep.months[m.month];
                          const hasVal = cell.cases > 0 || cell.revenue > 0;
                          return (
                            <td
                              key={m.month}
                              className={`px-2.5 py-3 text-right font-mono tabular-nums whitespace-nowrap ${
                                salesMonth === m.month ? 'bg-[#FF5E1E]/[0.06]' : ''
                              }`}
                            >
                              {hasVal ? (
                                <div>
                                  <div className="text-[#F4F6FB] font-semibold">
                                    {cell.cases.toLocaleString('th-TH')} เคส
                                  </div>
                                  {cell.revenue > 0 && (
                                    <div className="text-[10px] text-[#FFB59D]">
                                      {formatCompactCurrency(cell.revenue)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#4B5568]">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3.5 py-3 text-right font-mono tabular-nums whitespace-nowrap border-l border-white/[0.08]">
                          <div className="font-bold text-[#FFCF90]">
                            {rep.yearlyCases.toLocaleString('th-TH')} เคส
                          </div>
                          <div className="text-[10px] text-[#B5BDCB]">
                            {formatCompactCurrency(rep.yearlyRevenue)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#8E97AB]">
                ช่วงแสดงผล:{' '}
                <span className="text-[#DFE2EF] font-medium">{selectedMonthLabel}</span> · รวม{' '}
                <span className="font-mono tabular-nums font-semibold text-[#FFCF90]">
                  {monthlySalesPerformance.totalCasesPeriod.toLocaleString('th-TH')} เคส
                </span>{' '}
                · ฝ่ายขาย {monthlySalesPerformance.rows.length} คน
                {monthlySalesPerformance.totalRevenuePeriod > 0 && (
                  <>
                    {' '}
                    ·{' '}
                    <span className="font-mono tabular-nums text-[#FFB59D]">
                      {formatCompactCurrency(monthlySalesPerformance.totalRevenuePeriod)}
                    </span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={onOpenNewDeal}
                className="text-[#FFB59D] hover:text-[#FFDBD0] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่มเคสใหม่
              </button>
            </div>
          </section>

          {/* 40% Column: Live Top Hospital Hotspots */}
          <section
            className={`${
              salesViewMode === 'matrix12' ? 'lg:col-span-12' : 'lg:col-span-5'
            } glass-panel rounded-2xl p-5 sm:p-6`}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#FF5E1E]" />
                  <h2 className="text-lg font-semibold text-[#F4F6FB]">
                    โรงพยาบาลเคสหนาแน่นสูงสุด
                  </h2>
                </div>
                <p className="text-xs text-[#B5BDCB] mt-0.5">
                  จัดลำดับจากยอดเคสจริงในระบบ CRM และเคสออฟฟิศ
                </p>
              </div>
              <button
                type="button"
                onClick={() => onJumpToMap()}
                className="text-xs font-semibold text-[#FFB59D] hover:text-[#FFDBD0] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                ดูแผนที่
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topHotspots.length === 0 ? (
              <div className="glass-tile rounded-xl p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-white">
                  ยังไม่มีข้อมูลความหนาแน่นโรงพยาบาล
                </p>
                <p className="text-xs text-[#B5BDCB]">
                  เมื่อบันทึกเคสออฟฟิศหรือเพิ่มเคสในโรงพยาบาล รายชื่อ รพ. ที่หนาแน่นที่สุดจะแสดงที่นี่
                </p>
                <button
                  type="button"
                  onClick={() => onJumpToMap()}
                  className="btn-glass inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#FFB59D]" />
                  เปิดแผนที่โรงพยาบาล 77 จังหวัด
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {topHotspots.map((h, idx) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onJumpToMap(h.hospitalId)}
                    className="w-full text-left glass-tile rounded-xl p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#F4F6FB] truncate flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: h.color }} />
                          <span className="truncate">
                            {idx + 1}. {h.name}
                          </span>
                        </div>
                        <div className="text-xs text-[#C8B6AE] mt-0.5 truncate">
                          {h.specialty}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className="apple-stat text-lg font-bold leading-none"
                          style={{ color: idx === 0 ? '#FFB59D' : '#F4F6FB' }}
                        >
                          {h.cases}{' '}
                          <span className="text-xs font-normal text-[#8E97AB]">เคส</span>
                        </div>
                        <div
                          className="text-[10px] font-mono font-bold tracking-wider mt-1"
                          style={{ color: h.color }}
                        >
                          {h.tierCode}
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-white/[0.08] rounded-full h-1.5 mt-3 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${h.progressPct}%`, backgroundColor: h.color }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Deep Analytics Mode: Pipeline Funnel, Product Share, Regional Density */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Sales Pipeline Stage Chart */}
          <section className="lg:col-span-6 glass-panel rounded-2xl p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#F4F6FB]">
                กราฟสรุปสถานะไปป์ไลน์การขาย (Sales Pipeline)
              </h2>
              <p className="text-xs text-[#B5BDCB] mt-0.5">
                มูลค่ารวมแยกตามขั้นตอนการติดตามลูกค้าในระบบ
              </p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stageChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCompactCurrency(Number(v))}
                    tick={{ fontSize: 11, fill: '#8E97AB' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={76}
                    tick={{ fontSize: 11, fill: '#DFE2EF', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [formatCurrency(Number(val)), 'มูลค่ารวม']}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 19, 28, 0.94)',
                      border: '1px solid rgba(255, 181, 157, 0.25)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F4F6FB',
                    }}
                  />
                  <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={22}>
                    {stageChartData.map((entry) => (
                      <Cell key={entry.stage} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Product Specialty Donut */}
          <section className="lg:col-span-6 glass-panel rounded-2xl p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#F4F6FB]">
                สัดส่วนมูลค่าตามกลุ่มอุปกรณ์การแพทย์ CTEC
              </h2>
              <p className="text-xs text-[#B5BDCB] mt-0.5">
                กลุ่มผลิตภัณฑ์ศัลยกรรมและอุปกรณ์เฉพาะทางจากดีลจริง
              </p>
            </div>
            {categoryData.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-center gap-2 text-xs text-[#8E97AB]">
                <p className="text-sm font-semibold text-white">ยังไม่มีข้อมูลดีลตามกลุ่มผลิตภัณฑ์</p>
                <p>เมื่อบันทึกดีลในระบบ กราฟสัดส่วนกลุ่มอุปกรณ์จะแสดงที่นี่อัตโนมัติ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {categoryData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [formatCurrency(Number(val)), 'มูลค่า']}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 19, 28, 0.94)',
                          border: '1px solid rgba(255, 181, 157, 0.25)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#F4F6FB',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="divide-y divide-white/[0.06] text-xs">
                  {categoryData.slice(0, 5).map((cat) => (
                    <div key={cat.name} className="py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-[#DFE2EF] truncate">{cat.name}</span>
                      </div>
                      <span className="font-mono tabular-nums text-[#FFCF90] shrink-0">
                        {cat.share}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Regional Case Density Chart */}
          <section className="lg:col-span-12 glass-panel rounded-2xl p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#F4F6FB]">
                ความหนาแน่นเคสโรงพยาบาลแยกตามภูมิภาคทั่วประเทศ
              </h2>
              <p className="text-xs text-[#B5BDCB] mt-0.5">
                เปรียบเทียบปริมาณเคสจริงในแต่ละเขตพื้นที่เพื่อวางแผนสต็อกและทีมภาคสนาม
              </p>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionDensityData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
                  <XAxis
                    dataKey="region"
                    tick={{ fontSize: 11, fill: '#B5BDCB' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#8E97AB' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [`${Number(val).toLocaleString('th-TH')} เคส`, 'จำนวนเคส']}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 19, 28, 0.94)',
                      border: '1px solid rgba(255, 181, 157, 0.25)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F4F6FB',
                    }}
                  />
                  <Bar dataKey="cases" fill="#FF5E1E" radius={[8, 8, 2, 2]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* Section 5: Live Activity Stream & Executive Export Hub */}
      <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5E1E]/15 border border-[#FF5E1E]/25 text-[#FFB59D] flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F4F6FB]">
                ฟีดกิจกรรมล่าสุดของทีม (Live Firebase Stream)
              </h2>
              <p className="text-xs text-[#B5BDCB] mt-0.5">
                อัปเดตเคสผ่าตัด การปิดการขาย และประกาศสรุปยอดแบบเรียลไทม์ พร้อมส่งออกรายงานผู้บริหารทันที
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canBroadcast && (
              <button
                type="button"
                disabled={broadcasting}
                onClick={() => void handleBroadcastClick()}
                className="btn-glass min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-55"
              >
                <Send className="w-3.5 h-3.5 text-[#FFB59D]" />
                {broadcasting ? 'กำลังส่งแจ้งเตือน...' : 'แจ้งเตือนสรุปยอดวันนี้'}
              </button>
            )}

            <button
              type="button"
              onClick={onExportExcel}
              className="btn-glass min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#FFCF90]" />
              Excel / Sheets
            </button>

            <button
              type="button"
              disabled={exportingPdf}
              onClick={onExportPdf}
              className="btn-luxury-orange min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <FileText className="w-4 h-4" />
              {exportingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดรายงานสรุป (PDF)'}
            </button>
          </div>
        </div>

        {/* 3-Column Live Activity Cards */}
        {activityCards.length === 0 ? (
          <div className="glass-tile rounded-xl p-6 text-center text-xs text-[#B5BDCB]">
            ยังไม่มีกิจกรรมแจ้งเตือนในระบบ — เมื่อทีมบันทึกดีล ปิดการขาย หรือประกาศสรุปยอดรายวัน รายการจะแสดงที่นี่ทันที
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {activityCards.map((ev) => (
              <div key={ev.id} className="glass-tile rounded-xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#B5BDCB]">
                    <span className="font-semibold" style={{ color: ev.accentColor }}>
                      {ev.timeLabel}
                    </span>
                    <span className="text-[#8E97AB] truncate">{ev.locationLabel}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#F4F6FB] mt-2 leading-snug">
                    {ev.headline}
                  </h3>
                  <p className="text-xs text-[#B5BDCB] mt-1 leading-relaxed line-clamp-2">
                    {ev.detail}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono tabular-nums font-bold text-[#FFCF90]">
                    {ev.amount > 0 ? formatCurrency(ev.amount) : '—'}
                  </span>
                  <span className="font-medium" style={{ color: ev.accentColor }}>
                    {ev.statusLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
