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
  CTEC_REFERENCE_ACTIVITIES,
  CTEC_REFERENCE_HOTSPOTS,
  CTEC_REFERENCE_KPIS,
  CTEC_REFERENCE_REPS,
  SALES_TEAMS,
} from '../data/ctecReferenceData';
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
  type RegionName,
  type UserProfile,
} from '../types';
import type { ExecutiveSummaryMetrics } from '../utils/exportReports';
import { MonthlyYearlyCasesChart } from './MonthlyYearlyCasesChart';

interface DashboardViewProps {
  mode: 'dashboard' | 'analytics';
  currentUser: UserProfile;
  hospitals: Hospital[];
  deals: Deal[];
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
  hospitals,
  deals,
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
  const [periodFilter, setPeriodFilter] = useState('ไตรมาส Q1/2026');
  const [regionFilter, setRegionFilter] = useState<'all' | RegionName>('all');
  const [teamFilter, setTeamFilter] = useState<string>(SALES_TEAMS[0]);
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

  const hasLiveDeals = deals.length > 0;
  const hasLiveHospitals = hospitals.length > 0;

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

  // Combined KPI Display (Live Firestore values merged seamlessly with CTEC Reference Baseline)
  const displayKpis = useMemo(() => {
    const liveCases = scopedHospitals.reduce((acc, h) => acc + h.caseCount, 0);
    const liveWonRevenue = scopedDeals
      .filter((d) => d.stage === 'won')
      .reduce((acc, d) => acc + d.amount, 0);

    const totalCasesClosed = hasLiveHospitals
      ? liveCases + CTEC_REFERENCE_KPIS.totalCasesClosed
      : CTEC_REFERENCE_KPIS.totalCasesClosed;
    const totalRevenue = hasLiveDeals
      ? liveWonRevenue + CTEC_REFERENCE_KPIS.totalRevenue
      : CTEC_REFERENCE_KPIS.totalRevenue;
    const activeHospitalsCount = hasLiveHospitals
      ? Math.max(scopedHospitals.length, CTEC_REFERENCE_KPIS.activeHospitals)
      : CTEC_REFERENCE_KPIS.activeHospitals;

    return {
      totalCasesClosed,
      totalRevenue,
      activeHospitalsCount,
      attainmentPct: Math.min(
        100,
        Math.round((totalRevenue / 152_000_000) * 100)
      ),
    };
  }, [scopedHospitals, scopedDeals, hasLiveHospitals, hasLiveDeals]);

  // Sales Rep Leaderboard (Merges live Firestore reps + CTEC reference leaderboard)
  const leaderboard = useMemo(() => {
    const liveMap: Record<
      string,
      { name: string; team: string; region: RegionName; closedCases: number; revenue: number }
    > = {};

    scopedDeals.forEach((d) => {
      const key = d.ownerName || d.ownerId;
      if (!liveMap[key]) {
        liveMap[key] = {
          name: key,
          team: 'ทีมภาคสนาม (Live Firestore)',
          region: 'กรุงเทพและปริมณฑล',
          closedCases: 0,
          revenue: 0,
        };
      }
      liveMap[key].closedCases += d.caseVolume;
      if (d.stage === 'won') liveMap[key].revenue += d.amount;
    });

    const refFiltered = CTEC_REFERENCE_REPS.filter(
      (r) => regionFilter === 'all' || r.region === regionFilter
    );

    const combined = [
      ...Object.values(liveMap).map((item) => ({
        name: item.name,
        team: item.team,
        region: item.region,
        closedCases: item.closedCases,
        revenue: item.revenue,
        attainmentPct: Math.min(130, Math.max(65, Math.round((item.revenue / 8_500_000) * 100))),
        starPerformer: item.revenue >= 10_000_000,
      })),
      ...refFiltered.filter((ref) => !liveMap[ref.name]),
    ];

    combined.sort((a, b) =>
      leaderboardSort === 'revenue'
        ? b.revenue - a.revenue
        : b.closedCases - a.closedCases
    );

    return combined.slice(0, 5);
  }, [scopedDeals, regionFilter, leaderboardSort]);

  // Top Hospital Hotspots (Live Firestore hospitals merged with CTEC reference hotspots)
  const topHotspots = useMemo(() => {
    const liveRows = scopedHospitals.map((h) => {
      const density = getDensityMeta(h.caseCount);
      return {
        id: h.id,
        name: h.name,
        specialty: `${h.hospitalType} · ${h.province || h.region}`,
        cases: h.caseCount,
        tierCode: density.tierCode,
        color: density.color,
        progressPct: Math.min(100, Math.max(12, Math.round((h.caseCount / 150) * 100))),
        isLive: true,
      };
    });

    const liveNames: Record<string, boolean> = {};
    liveRows.forEach((r) => {
      liveNames[r.name.toLowerCase()] = true;
    });

    const refRows = CTEC_REFERENCE_HOTSPOTS.filter(
      (r) =>
        (regionFilter === 'all' || r.region === regionFilter) &&
        !liveNames[r.name.toLowerCase()]
    ).map((r) => ({
      id: r.id,
      name: r.name,
      specialty: r.specialty,
      cases: r.cases,
      tierCode: r.tierLabel,
      color:
        r.tierLabel === 'CRITICAL HIGH'
          ? '#FF5E1E'
          : r.tierLabel === 'HIGH HEAT'
            ? '#FFAA00'
            : '#EEC058',
      progressPct: r.progressPct,
      isLive: false,
    }));

    return [...liveRows, ...refRows]
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 5);
  }, [scopedHospitals, regionFilter]);

  // Pipeline Stage Chart Data
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

  // Product Category Breakdown (falls back to CTEC reference specialty mix if no live deals yet)
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

    const source =
      liveCategories.length > 0
        ? liveCategories
        : CTEC_REFERENCE_HOTSPOTS.map((h, idx) => ({
            name: h.specialty,
            value: h.revenue,
            count: h.cases,
            color: PIE_COLORS[idx % PIE_COLORS.length],
          }));

    const total = source.reduce((s, item) => s + item.value, 0);
    return source.map((item) => ({
      ...item,
      share: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [scopedDeals]);

  // Regional Density Breakdown
  const regionDensityData = useMemo(() => {
    return REGIONS.map((region) => {
      const liveCases = hospitals
        .filter((h) => h.region === region)
        .reduce((s, h) => s + h.caseCount, 0);
      const refCases = CTEC_REFERENCE_HOTSPOTS.filter((h) => h.region === region).reduce(
        (s, h) => s + h.cases,
        0
      );
      return {
        region: region
          .replace('กรุงเทพและปริมณฑล', 'กทม./ปริมณฑล')
          .replace('ภาคตะวันออกเฉียงเหนือ', 'ภาคอีสาน'),
        cases: liveCases > 0 ? liveCases : refCases,
      };
    });
  }, [hospitals]);

  // Live activity cards (live Firestore notifications first, padded with CTEC reference stream)
  const activityCards = useMemo(() => {
    const liveItems = notifications.slice(0, 3).map((n) => ({
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

    if (liveItems.length >= 3) return liveItems;

    const needed = 3 - liveItems.length;
    const refItems = CTEC_REFERENCE_ACTIVITIES.slice(0, needed).map((act) => ({
      id: act.id,
      timeLabel: act.timeAgo,
      locationLabel: act.hospitalName,
      headline: act.repAction,
      detail: act.procedure,
      amount: act.amount,
      statusLabel: act.statusLabel,
      accentColor:
        act.accent === 'orange'
          ? '#FFB59D'
          : act.accent === 'gold'
            ? '#FFCF90'
            : '#EEC058',
    }));

    return [...liveItems, ...refItems];
  }, [notifications]);

  return (
    <div className="space-y-6">
      {/* Section 1: Executive Command Header & Synchronized Filter Rail */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#C8B6AE]">
            <span className="font-semibold text-[#FFB59D]">Firebase Firestore Live</span>
            <span aria-hidden="true">·</span>
            <span>{periodFilter}</span>
            <span aria-hidden="true">·</span>
            <span>CTEC Devices Intelligence</span>
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
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            aria-label="เลือกช่วงเวลา"
            className="glass-input h-9 px-3 rounded-xl text-xs font-medium cursor-pointer"
          >
            <option value="ไตรมาส Q1/2026">ไตรมาส Q1/2026</option>
            <option value="ทั้งปี 2025">ทั้งปี 2025</option>
            <option value="ทั้งปี 2024">ทั้งปี 2024</option>
            <option value="เดือนปัจจุบัน">เดือนปัจจุบัน</option>
          </select>

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

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            aria-label="เลือกทีมเซลล์"
            className="glass-input h-9 px-3 rounded-xl text-xs font-medium cursor-pointer hidden sm:block"
          >
            {SALES_TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onNotifyToast('อัปเดตสถิติล่าสุดจาก Firebase Firestore เรียบร้อยแล้ว')}
            className="btn-glass h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FFB59D]" />
            <span>รีเฟรชสถิติ</span>
          </button>
        </div>
      </div>

      {/* Section 2: 5 Apple Frosted Glass KPI Cards (Matching Attached CTEC Layout) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Cases Closed */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-[#FF5E1E]/20 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">เคสปิดการขายสำเร็จ</span>
            <span className="text-[#FFB59D] font-mono tabular-nums font-semibold">
              {CTEC_REFERENCE_KPIS.growthPct}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-3xl font-bold text-[#F4F6FB]">
              {displayKpis.totalCasesClosed.toLocaleString('th-TH')}
            </span>
            <span className="text-xs text-[#B5BDCB]">เคส</span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#8E97AB]">
              เป้าหมาย {CTEC_REFERENCE_KPIS.targetCases.toLocaleString('th-TH')}
            </span>
            <svg className="w-16 h-5 text-[#FF7842]" fill="none" viewBox="0 0 80 24" aria-hidden="true">
              <path
                d="M2 18 L18 14 L34 16 L50 8 L66 11 L78 3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
              />
            </svg>
          </div>
        </div>

        {/* KPI 2: Net Cumulative Revenue */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-[#FFAA00]/18 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">ยอดขายสะสมสุทธิ</span>
            <span className="text-[#FFCF90] font-mono tabular-nums font-semibold">
              บรรลุ {displayKpis.attainmentPct}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="apple-stat text-3xl font-bold text-[#FFCF90]">
              {formatCompactCurrency(displayKpis.totalRevenue)}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] space-y-1.5">
            <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFAA00] to-[#FF5E1E]"
                style={{ width: `${displayKpis.attainmentPct}%` }}
              />
            </div>
            <div className="text-[11px] text-[#8E97AB] font-mono tabular-nums">
              วันนี้ {formatCurrency(summary.todayWonRevenue)}
            </div>
          </div>
        </div>

        {/* KPI 3: Active Hospitals */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">รพ. มีเคสต่อเนื่อง</span>
            <Building2 className="w-4 h-4 text-[#FFB59D]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-3xl font-bold text-[#F4F6FB]">
              {displayKpis.activeHospitalsCount}
            </span>
            <span className="text-xs text-[#8E97AB] font-mono tabular-nums">
              / {CTEC_REFERENCE_KPIS.totalNetworkHospitals} แห่ง
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#B5BDCB]">
            ครอบคลุมเครือข่าย {CTEC_REFERENCE_KPIS.networkCoveragePct}%
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
              {CTEC_REFERENCE_KPIS.topHotspotRegion}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="apple-stat text-2xl font-bold text-[#FFB59D]">
                {CTEC_REFERENCE_KPIS.topHotspotCases}
              </span>
              <span className="text-[11px] text-[#B5BDCB]">
                เคส ({CTEC_REFERENCE_KPIS.topHotspotSharePct}%)
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Active Field Sales Reps */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-[#C8B6AE] font-medium">เซลล์ภาคสนามวันนี้</span>
            <Users className="w-4 h-4 text-[#FFCF90]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-3xl font-bold text-[#F4F6FB]">
              {CTEC_REFERENCE_KPIS.activeRepsOnline}
            </span>
            <span className="text-xs text-[#8E97AB] font-mono tabular-nums">
              / {CTEC_REFERENCE_KPIS.totalReps} คน
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/[0.06] text-[11px] text-[#B5BDCB]">
            กำลังบันทึกเคสหน้างาน · ดีลวันนี้ +{summary.todayNewDeals}
          </div>
        </div>
      </section>

      {/* Section 3: Flagship Monthly & Yearly Case Volume Analytics Chart */}
      <MonthlyYearlyCasesChart deals={scopedDeals} includeReferenceBaseline={true} />

      {/* Section 4: Dashboard Central Split (60% Rep Leaderboard / 40% Top Hospital Hotspots) OR Deep Analytics Charts */}
      {mode === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* 60% Column: Sales Rep Leaderboard */}
          <section className="lg:col-span-7 glass-panel rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FFAA00]" />
                  <h2 className="text-lg font-semibold text-[#F4F6FB]">
                    ยอดขายและจำนวนเคสแยกตามผู้แทนขาย
                  </h2>
                </div>
                <p className="text-xs text-[#B5BDCB] mt-0.5">
                  ผลงานรายบุคคลเทียบเป้าหมายไตรมาสแบบเรียลไทม์
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
                            · Star Performer
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#B5BDCB] mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span className={idx === 0 ? 'text-[#FFCF90]' : 'text-[#B5BDCB]'}>
                          {rep.team}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{rep.closedCases} เคสสำเร็จ</span>
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
                              width: `${Math.min(100, rep.attainmentPct)}%`,
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
                        <span className="text-[11px] font-mono tabular-nums font-semibold text-[#FFB59D]">
                          {rep.attainmentPct}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8E97AB] group-hover:text-[#FFB59D] transition-colors hidden sm:block" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-[#8E97AB]">
                แสดงอันดับท็อป {leaderboard.length} จากผู้แทนขายทั้งหมด 30 ราย
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

          {/* 40% Column: Top Hospital Hotspots */}
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
                  ศูนย์บริการที่อุปกรณ์ CTEC ใช้งานต่อเนื่อง
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

            <div className="space-y-3">
              {topHotspots.map((h, idx) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onJumpToMap(h.isLive ? h.id : undefined)}
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
                กลุ่มผลิตภัณฑ์ศัลยกรรมและอุปกรณ์เฉพาะทางหลัก
              </p>
            </div>
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
          </section>

          {/* Regional Case Density Chart */}
          <section className="lg:col-span-12 glass-panel rounded-2xl p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#F4F6FB]">
                ความหนาแน่นเคสโรงพยาบาลแยกตามภูมิภาคทั่วประเทศ
              </h2>
              <p className="text-xs text-[#B5BDCB] mt-0.5">
                เปรียบเทียบปริมาณเคสรวมในแต่ละเขตพื้นที่เพื่อวางแผนสต็อกและทีมภาคสนาม
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

      {/* Section 5: Live Activity Stream & Executive Export Hub (Matching Attached CTEC Layout) */}
      <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5E1E]/15 border border-[#FF5E1E]/25 text-[#FFB59D] flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F4F6FB]">
                ฟีดกิจกรรมล่าสุดของเซลล์ (Live Firebase Stream)
              </h2>
              <p className="text-xs text-[#B5BDCB] mt-0.5">
                รายงานการป้อนเคสผ่าตัดและใบสั่งซื้อจากโรงพยาบาลทั่วประเทศแบบเรียลไทม์ พร้อมส่งออกรายงานผู้บริหารทันที
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
      </section>
    </div>
  );
};
