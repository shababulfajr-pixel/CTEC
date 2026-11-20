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
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Flame,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  Trophy,
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
  const [regionFilter, setRegionFilter] = useState<'all' | RegionName>('all');
  const [leaderboardSort, setLeaderboardSort] = useState<'revenue' | 'cases'>('revenue');
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

    const activeUsersCount = users.filter((u) => u.active).length;

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
      totalUsersCount: users.length,
    };
  }, [scopedHospitals, scopedDeals, scopedOfficeCases, hospitals, users]);

  // 100% Live Sales Rep / Operator Leaderboard (strictly from live deals & officeCases)
  const leaderboard = useMemo(() => {
    const liveMap: Record<
      string,
      { name: string; team: string; closedCases: number; revenue: number }
    > = {};

    scopedDeals.forEach((d) => {
      const key = (d.ownerName || d.ownerId || 'ไม่ระบุผู้ดูแล').trim();
      if (!liveMap[key]) {
        liveMap[key] = {
          name: key,
          team: 'ฝ่ายขาย (Sales Pipeline)',
          closedCases: 0,
          revenue: 0,
        };
      }
      liveMap[key].closedCases += d.caseVolume || 0;
      if (d.stage === 'won') liveMap[key].revenue += d.amount || 0;
    });

    scopedOfficeCases.forEach((oc) => {
      const key = (oc.caseReceiver || oc.createdByName || 'ทีมออฟฟิศ').trim();
      if (!liveMap[key]) {
        liveMap[key] = {
          name: key,
          team: 'ทีมประสานงานเคส (ออฟฟิศ)',
          closedCases: 0,
          revenue: 0,
        };
      }
      liveMap[key].closedCases += 1;
      liveMap[key].revenue += oc.price || 0;
    });

    const list = Object.values(liveMap);
    const maxVal = list.reduce(
      (m, r) => Math.max(m, leaderboardSort === 'revenue' ? r.revenue : r.closedCases),
      0
    );

    list.sort((a, b) =>
      leaderboardSort === 'revenue'
        ? b.revenue - a.revenue || b.closedCases - a.closedCases
        : b.closedCases - a.closedCases || b.revenue - a.revenue
    );

    return list.slice(0, 5).map((item, idx) => ({
      ...item,
      sharePct:
        maxVal > 0
          ? Math.max(
              8,
              Math.round(
                ((leaderboardSort === 'revenue' ? item.revenue : item.closedCases) / maxVal) * 100
              )
            )
          : 0,
      starPerformer: idx === 0 && (item.revenue > 0 || item.closedCases > 0),
    }));
  }, [scopedDeals, scopedOfficeCases, leaderboardSort]);

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
            <span className="text-[#C8B6AE] font-medium">โรงพยาบาลคู่ค้า</span>
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
          <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#B5BDCB]">
            ดีลใหม่วันนี้ +{summary.todayNewDeals} · ไปป์ไลน์ {formatCompactCurrency(summary.activePipelineValue)}
          </div>
        </div>
      </section>

      {/* Section 3: Flagship Monthly & Yearly Case Volume Analytics Chart (100% Live Data) */}
      <MonthlyYearlyCasesChart deals={scopedDeals} officeCases={scopedOfficeCases} />

      {/* Section 4: Dashboard Central Split OR Deep Analytics Charts */}
      {mode === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* 60% Column: Live Leaderboard */}
          <section className="lg:col-span-7 glass-panel rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FFAA00]" />
                  <h2 className="text-lg font-semibold text-[#F4F6FB]">
                    ยอดขายและจำนวนเคสแยกตามผู้รับผิดชอบ
                  </h2>
                </div>
                <p className="text-xs text-[#B5BDCB] mt-0.5">
                  จัดอันดับจากข้อมูลจริงของฝ่ายขายและทีมรับเคสออฟฟิศแบบเรียลไทม์
                </p>
              </div>

              <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08] self-start">
                <button
                  type="button"
                  onClick={() => setLeaderboardSort('revenue')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    leaderboardSort === 'revenue'
                      ? 'bg-[#262A34] text-[#FFB59D]'
                      : 'text-[#8E97AB] hover:text-white'
                  }`}
                >
                  ยอดเงิน (Revenue)
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardSort('cases')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    leaderboardSort === 'cases'
                      ? 'bg-[#262A34] text-[#FFB59D]'
                      : 'text-[#8E97AB] hover:text-white'
                  }`}
                >
                  จำนวนเคส
                </button>
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="glass-tile rounded-xl p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-white">
                  ยังไม่มีข้อมูลผลงานในระบบ
                </p>
                <p className="text-xs text-[#B5BDCB]">
                  เริ่มบันทึกเคสผ่าตัดหรือรายการขายจริง อันดับและยอดขายจะคำนวณขึ้นที่นี่อัตโนมัติ
                </p>
                <button
                  type="button"
                  onClick={onOpenNewDeal}
                  className="btn-luxury-orange inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  บันทึกดีล / เคสแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((rep, idx) => (
                  <div
                    key={rep.name}
                    className="glass-tile group rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          idx === 0
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
                              · อันดับ 1
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#B5BDCB] mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span className={idx === 0 ? 'text-[#FFCF90]' : 'text-[#B5BDCB]'}>
                            {rep.team}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{rep.closedCases} เคส</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                      <div className="text-right">
                        <div
                          className={`apple-stat text-base font-bold ${
                            idx === 0 ? 'text-[#FFCF90]' : 'text-[#F4F6FB]'
                          }`}
                        >
                          {formatCurrency(rep.revenue)}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <div className="w-24 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
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
            )}

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-[#8E97AB]">
                แสดงอันดับสูงสุด {leaderboard.length} รายการจากข้อมูลจริง
              </span>
              <button
                type="button"
                onClick={onOpenNewDeal}
                className="text-[#FFB59D] hover:text-[#FFDBD0] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                บันทึกเคสใหม่
              </button>
            </div>
          </section>

          {/* 40% Column: Live Top Hospital Hotspots */}
          <section className="lg:col-span-5 glass-panel rounded-2xl p-5 sm:p-6">
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
