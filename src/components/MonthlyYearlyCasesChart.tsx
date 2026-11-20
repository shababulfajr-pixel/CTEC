import React, { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';
import {
  formatCompactCurrency,
  formatCurrency,
  type Deal,
  type OfficeCase,
} from '../types';

type ChartViewMode = 'monthly' | 'yoy' | 'yearly';
type SelectedYear = '2026' | '2025' | '2024';

interface MonthlyYearlyCasesChartProps {
  deals: Deal[];
  officeCases?: OfficeCase[];
}

const THAI_MONTHS = [
  { monthIndex: 1, monthShort: 'ม.ค.', monthFull: 'มกราคม' },
  { monthIndex: 2, monthShort: 'ก.พ.', monthFull: 'กุมภาพันธ์' },
  { monthIndex: 3, monthShort: 'มี.ค.', monthFull: 'มีนาคม' },
  { monthIndex: 4, monthShort: 'เม.ย.', monthFull: 'เมษายน' },
  { monthIndex: 5, monthShort: 'พ.ค.', monthFull: 'พฤษภาคม' },
  { monthIndex: 6, monthShort: 'มิ.ย.', monthFull: 'มิถุนายน' },
  { monthIndex: 7, monthShort: 'ก.ค.', monthFull: 'กรกฎาคม' },
  { monthIndex: 8, monthShort: 'ส.ค.', monthFull: 'สิงหาคม' },
  { monthIndex: 9, monthShort: 'ก.ย.', monthFull: 'กันยายน' },
  { monthIndex: 10, monthShort: 'ต.ค.', monthFull: 'ตุลาคม' },
  { monthIndex: 11, monthShort: 'พ.ย.', monthFull: 'พฤศจิกายน' },
  { monthIndex: 12, monthShort: 'ธ.ค.', monthFull: 'ธันวาคม' },
] as const;

function parseDateToYearMonth(raw?: string | null): { year: string; month: number } | null {
  const s = (raw || '').trim();
  if (!s) return null;

  // ISO format: YYYY-MM-DD or YYYY-MM
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    let yr = Number(isoMatch[1]);
    const mo = Number(isoMatch[2]);
    if (yr > 2400) yr -= 543;
    if (mo >= 1 && mo <= 12) return { year: String(yr), month: mo };
  }

  // Thai / Slash format: DD/MM/YYYY or D/M/YY (supports BE 2569 -> CE 2026)
  const slashMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (slashMatch) {
    const mo = Number(slashMatch[2]);
    let yr = Number(slashMatch[3]);
    if (yr < 100) {
      yr = yr >= 50 ? 2500 + yr - 543 : 2000 + yr;
    } else if (yr > 2400) {
      yr -= 543;
    }
    if (mo >= 1 && mo <= 12) return { year: String(yr), month: mo };
  }

  return null;
}

export const MonthlyYearlyCasesChart: React.FC<MonthlyYearlyCasesChartProps> = ({
  deals,
  officeCases = [],
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('monthly');
  const [selectedYear, setSelectedYear] = useState<SelectedYear>('2026');

  // 100% live Firestore aggregation: merges live deals + live officeCases into monthly/yearly buckets
  const mergedMonthlyData = useMemo(() => {
    const liveBuckets: Record<string, { cases: number; revenue: number }> = {};

    const addBucket = (year: string, month: number, cases: number, revenue: number) => {
      const key = `${year}-${month}`;
      if (!liveBuckets[key]) liveBuckets[key] = { cases: 0, revenue: 0 };
      liveBuckets[key].cases += cases;
      liveBuckets[key].revenue += revenue;
    };

    deals.forEach((deal) => {
      const parsed =
        parseDateToYearMonth(deal.dateKey) ||
        parseDateToYearMonth(deal.expectedCloseDate);
      if (!parsed) return;
      addBucket(
        parsed.year,
        parsed.month,
        deal.caseVolume || 0,
        deal.stage === 'won' ? deal.amount || 0 : 0
      );
    });

    officeCases.forEach((oc) => {
      let parsed =
        parseDateToYearMonth(oc.receivedDate) ||
        parseDateToYearMonth(oc.surgeryDate) ||
        parseDateToYearMonth(oc.deliveryDate);
      if (!parsed && oc.createdAt?.toDate) {
        const dt = oc.createdAt.toDate();
        parsed = { year: String(dt.getFullYear()), month: dt.getMonth() + 1 };
      }
      if (!parsed) return;
      addBucket(parsed.year, parsed.month, 1, oc.price || 0);
    });

    return THAI_MONTHS.map((base) => {
      const m = base.monthIndex;
      const b24 = liveBuckets[`2024-${m}`] || { cases: 0, revenue: 0 };
      const b25 = liveBuckets[`2025-${m}`] || { cases: 0, revenue: 0 };
      const b26 = liveBuckets[`2026-${m}`] || { cases: 0, revenue: 0 };

      return {
        monthShort: base.monthShort,
        monthFull: base.monthFull,
        cases2024: b24.cases,
        cases2025: b25.cases,
        cases2026: b26.cases,
        revenue2024: b24.revenue,
        revenue2025: b25.revenue,
        revenue2026: b26.revenue,
        activeCases:
          selectedYear === '2026'
            ? b26.cases
            : selectedYear === '2025'
              ? b25.cases
              : b24.cases,
        activeRevenue:
          selectedYear === '2026'
            ? b26.revenue
            : selectedYear === '2025'
              ? b25.revenue
              : b24.revenue,
      };
    });
  }, [deals, officeCases, selectedYear]);

  const yearlySummary = useMemo(() => {
    const sum = (key: 'cases2024' | 'cases2025' | 'cases2026') =>
      mergedMonthlyData.reduce((acc, m) => acc + m[key], 0);
    const rev = (key: 'revenue2024' | 'revenue2025' | 'revenue2026') =>
      mergedMonthlyData.reduce((acc, m) => acc + m[key], 0);

    const c24 = sum('cases2024');
    const c25 = sum('cases2025');
    const c26 = sum('cases2026');

    const growth25 = c24 > 0 ? ((c25 - c24) / c24) * 100 : 0;
    const growth26 = c25 > 0 ? ((c26 - c25) / c25) * 100 : 0;

    return [
      { year: '2024', cases: c24, revenue: rev('revenue2024'), growthPct: 0, color: '#EEC058' },
      { year: '2025', cases: c25, revenue: rev('revenue2025'), growthPct: growth25, color: '#FFAA00' },
      { year: '2026', cases: c26, revenue: rev('revenue2026'), growthPct: growth26, color: '#FF5E1E' },
    ];
  }, [mergedMonthlyData]);

  const activeYearStats = useMemo(() => {
    const totalCases = mergedMonthlyData.reduce((acc, m) => acc + m.activeCases, 0);
    const totalRevenue = mergedMonthlyData.reduce((acc, m) => acc + m.activeRevenue, 0);
    const activeMonthsCount = mergedMonthlyData.filter((m) => m.activeCases > 0).length;
    const avgPerMonth = activeMonthsCount > 0 ? Math.round(totalCases / activeMonthsCount) : 0;
    const peakMonth = mergedMonthlyData.reduce(
      (best, cur) => (cur.activeCases > best.activeCases ? cur : best),
      mergedMonthlyData[0]
    );
    const currentYearRow = yearlySummary.find((y) => y.year === selectedYear);

    return {
      totalCases,
      totalRevenue,
      avgPerMonth,
      peakMonth,
      growthPct: currentYearRow?.growthPct ?? 0,
    };
  }, [mergedMonthlyData, selectedYear, yearlySummary]);

  return (
    <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#FFB59D] text-xs font-semibold">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>สถิติจำนวนเคสผ่าตัดและยอดขายรายเดือน / รายปี (ข้อมูลจริง)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#F4F6FB]">
            กราฟจำนวนเคสแต่ละเดือนและเปรียบเทียบแต่ละปี (2024 – 2026)
          </h2>
          <p className="text-xs text-[#B5BDCB]">
            คำนวณจากข้อมูลจริงใน Firebase Firestore ทั้งเคสฝ่ายขายและทะเบียนเคสออฟฟิศแบบเรียลไทม์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08]">
            {(
              [
                { id: 'monthly', label: 'รายเดือน' },
                { id: 'yoy', label: 'เทียบข้ามปี' },
                { id: 'yearly', label: 'สรุปรายปี' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  viewMode === tab.id
                    ? 'bg-[#FF5E1E] text-white shadow-[0_4px_14px_rgba(255,94,30,0.4)]'
                    : 'text-[#B5BDCB] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Year Selector (for Monthly mode) */}
          {viewMode === 'monthly' && (
            <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08]">
              {(['2026', '2025', '2024'] as const).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono tabular-nums font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-[#262A34] text-[#FFCF90] ring-1 ring-[#FFCF90]/30'
                      : 'text-[#8E97AB] hover:text-white'
                  }`}
                >
                  ปี {yr}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline Year Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-tile rounded-xl p-3.5">
          <div className="text-[11px] text-[#B5BDCB]">
            จำนวนเคสรวมปี {selectedYear}
          </div>
          <div className="apple-stat text-2xl font-bold text-[#F4F6FB] mt-1">
            {activeYearStats.totalCases.toLocaleString('th-TH')}{' '}
            <span className="text-xs font-normal text-[#8E97AB]">เคส</span>
          </div>
        </div>

        <div className="glass-tile rounded-xl p-3.5">
          <div className="text-[11px] text-[#B5BDCB]">เฉลี่ยต่อเดือนที่มีเคส</div>
          <div className="apple-stat text-2xl font-bold text-[#FFCF90] mt-1">
            {activeYearStats.avgPerMonth.toLocaleString('th-TH')}{' '}
            <span className="text-xs font-normal text-[#8E97AB]">เคส/เดือน</span>
          </div>
        </div>

        <div className="glass-tile rounded-xl p-3.5">
          <div className="text-[11px] text-[#B5BDCB]">เดือนที่เคสสูงสุด</div>
          <div className="apple-stat text-2xl font-bold text-[#FFB59D] mt-1">
            {activeYearStats.totalCases > 0 ? (
              <>
                {activeYearStats.peakMonth.monthShort}{' '}
                <span className="text-xs font-mono text-[#DFE2EF]">
                  ({activeYearStats.peakMonth.activeCases} เคส)
                </span>
              </>
            ) : (
              <span className="text-base text-[#8E97AB]">ยังไม่มีข้อมูล</span>
            )}
          </div>
        </div>

        <div className="glass-tile rounded-xl p-3.5">
          <div className="text-[11px] text-[#B5BDCB]">มูลค่ายอดขายปี {selectedYear}</div>
          <div className="apple-stat text-2xl font-bold text-[#F4F6FB] mt-1 flex items-baseline gap-2">
            <span>{formatCompactCurrency(activeYearStats.totalRevenue)}</span>
            {activeYearStats.growthPct > 0 && (
              <span className="text-xs font-semibold text-emerald-300 inline-flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />+{activeYearStats.growthPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Responsive Chart Canvas */}
      <div className="h-[280px] sm:h-[320px] w-full pt-2">
        {viewMode === 'monthly' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={mergedMonthlyData}
              margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="luxuryOrangeBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5E1E" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#FFAA00" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="monthShort"
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
                cursor={{ fill: 'rgba(255, 94, 30, 0.08)' }}
                contentStyle={{
                  backgroundColor: 'rgba(15, 19, 28, 0.94)',
                  border: '1px solid rgba(255, 181, 157, 0.25)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#F4F6FB',
                  backdropFilter: 'blur(16px)',
                }}
                formatter={(value, name) =>
                  name === 'activeCases'
                    ? [`${Number(value).toLocaleString('th-TH')} เคส`, `จำนวนเคสปี ${selectedYear}`]
                    : [formatCurrency(Number(value)), `ยอดขายปี ${selectedYear}`]
                }
                labelFormatter={(label) => `เดือน ${label} ${selectedYear}`}
              />
              <Bar
                dataKey="activeCases"
                fill="url(#luxuryOrangeBar)"
                radius={[8, 8, 2, 2]}
                maxBarSize={34}
              />
              <Line
                type="monotone"
                dataKey="activeCases"
                tooltipType="none"
                stroke="#FFCF90"
                strokeWidth={2}
                dot={{ r: 3, fill: '#FFCF90', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#FF5E1E', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'yoy' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={mergedMonthlyData}
              margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="yoy2026Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5E1E" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#FF5E1E" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="monthShort"
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
                contentStyle={{
                  backgroundColor: 'rgba(15, 19, 28, 0.94)',
                  border: '1px solid rgba(255, 181, 157, 0.25)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#F4F6FB',
                }}
                formatter={(value, name) => {
                  const label =
                    name === 'cases2026'
                      ? 'ปี 2026'
                      : name === 'cases2025'
                        ? 'ปี 2025'
                        : 'ปี 2024';
                  return [`${Number(value).toLocaleString('th-TH')} เคส`, label];
                }}
              />
              <Area
                type="monotone"
                dataKey="cases2026"
                stroke="#FF5E1E"
                strokeWidth={2.5}
                fill="url(#yoy2026Fill)"
              />
              <Line
                type="monotone"
                dataKey="cases2025"
                stroke="#FFAA00"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#FFAA00' }}
              />
              <Line
                type="monotone"
                dataKey="cases2024"
                stroke="#94A3B8"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'yearly' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={yearlySummary}
              margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="year"
                tickFormatter={(v) => `ปี ${v}`}
                tick={{ fontSize: 12, fill: '#DFE2EF', fontWeight: 600 }}
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
                cursor={{ fill: 'rgba(255, 170, 0, 0.08)' }}
                contentStyle={{
                  backgroundColor: 'rgba(15, 19, 28, 0.94)',
                  border: '1px solid rgba(255, 181, 157, 0.25)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#F4F6FB',
                }}
                formatter={(value) => [`${Number(value).toLocaleString('th-TH')} เคส`, 'เคสสะสมตลอดปี']}
                labelFormatter={(label) => `สรุปผลประกอบการปี ${label}`}
              />
              <Bar dataKey="cases" radius={[12, 12, 4, 4]} maxBarSize={76}>
                {yearlySummary.map((entry) => (
                  <Cell key={entry.year} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Clean Legend & Yearly Comparison Strip */}
      <div className="pt-3 border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[#B5BDCB]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF5E1E]" />
            ปี 2026: <strong className="text-[#F4F6FB] font-mono tabular-nums">{yearlySummary[2].cases.toLocaleString('th-TH')} เคส</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FFAA00]" />
            ปี 2025: <strong className="text-[#FFCF90] font-mono tabular-nums">{yearlySummary[1].cases.toLocaleString('th-TH')} เคส</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#94A3B8]" />
            ปี 2024: <strong className="text-[#DFE2EF] font-mono tabular-nums">{yearlySummary[0].cases.toLocaleString('th-TH')} เคส</strong>
          </span>
        </div>

        <span className="text-[11px] text-[#8E97AB]">
          {yearlySummary[1].cases > 0 ? (
            <>
              เติบโตเฉลี่ยต่อปี (2025 → 2026):{' '}
              <strong
                className={`font-mono tabular-nums ${
                  yearlySummary[2].growthPct > 0
                    ? 'text-emerald-300'
                    : yearlySummary[2].growthPct < 0
                      ? 'text-rose-300'
                      : 'text-[#DFE2EF]'
                }`}
              >
                {yearlySummary[2].growthPct > 0 ? '+' : ''}
                {yearlySummary[2].growthPct.toFixed(1)}%
              </strong>
            </>
          ) : (
            'บันทึกเคสจริงเพื่อเริ่มสะสมสถิติรายเดือนและรายปี'
          )}
        </span>
      </div>
    </section>
  );
};
