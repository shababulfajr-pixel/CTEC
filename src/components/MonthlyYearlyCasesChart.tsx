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
import { CTEC_MONTHLY_YEARLY_CASES } from '../data/ctecReferenceData';
import { formatCompactCurrency, formatCurrency, type Deal } from '../types';

type ChartViewMode = 'monthly' | 'yoy' | 'yearly';
type SelectedYear = '2026' | '2025' | '2024';

interface MonthlyYearlyCasesChartProps {
  deals: Deal[];
  includeReferenceBaseline: boolean;
}

export const MonthlyYearlyCasesChart: React.FC<MonthlyYearlyCasesChartProps> = ({
  deals,
  includeReferenceBaseline,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('monthly');
  const [selectedYear, setSelectedYear] = useState<SelectedYear>('2026');

  // Merge live Firestore deals into monthly/yearly buckets (2024, 2025, 2026)
  const mergedMonthlyData = useMemo(() => {
    const liveBuckets: Record<
      string,
      { cases: number; revenue: number }
    > = {};

    deals.forEach((deal) => {
      const dateStr = deal.dateKey || deal.expectedCloseDate || '';
      if (dateStr.length < 7) return;
      const year = dateStr.slice(0, 4);
      const month = Number(dateStr.slice(5, 7));
      if (!month || month < 1 || month > 12) return;
      const key = `${year}-${month}`;
      if (!liveBuckets[key]) liveBuckets[key] = { cases: 0, revenue: 0 };
      liveBuckets[key].cases += deal.caseVolume || 0;
      if (deal.stage === 'won') {
        liveBuckets[key].revenue += deal.amount || 0;
      }
    });

    return CTEC_MONTHLY_YEARLY_CASES.map((base) => {
      const m = base.monthIndex;
      const b24 = liveBuckets[`2024-${m}`] || { cases: 0, revenue: 0 };
      const b25 = liveBuckets[`2025-${m}`] || { cases: 0, revenue: 0 };
      const b26 = liveBuckets[`2026-${m}`] || { cases: 0, revenue: 0 };

      const c24 = (includeReferenceBaseline ? base.cases2024 : 0) + b24.cases;
      const c25 = (includeReferenceBaseline ? base.cases2025 : 0) + b25.cases;
      const c26 = (includeReferenceBaseline ? base.cases2026 : 0) + b26.cases;

      const r24 = (includeReferenceBaseline ? base.revenue2024 : 0) + b24.revenue;
      const r25 = (includeReferenceBaseline ? base.revenue2025 : 0) + b25.revenue;
      const r26 = (includeReferenceBaseline ? base.revenue2026 : 0) + b26.revenue;

      return {
        monthShort: base.monthShort,
        monthFull: base.monthFull,
        cases2024: c24,
        cases2025: c25,
        cases2026: c26,
        revenue2024: r24,
        revenue2025: r25,
        revenue2026: r26,
        activeCases:
          selectedYear === '2026' ? c26 : selectedYear === '2025' ? c25 : c24,
        activeRevenue:
          selectedYear === '2026' ? r26 : selectedYear === '2025' ? r25 : r24,
      };
    });
  }, [deals, includeReferenceBaseline, selectedYear]);

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
    const avgPerMonth = Math.round(totalCases / 12);
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
            <span>สถิติจำนวนเคสผ่าตัดและยอดขายรายเดือน / รายปี</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#F4F6FB]">
            กราฟจำนวนเคสแต่ละเดือนและเปรียบเทียบแต่ละปี (2024 – 2026)
          </h2>
          <p className="text-xs text-[#B5BDCB]">
            อัปเดตอัตโนมัติร่วมกับรายการเคสที่บันทึกจริงใน Firebase Firestore · แสดงผลคมชัดบนมือถือและเดสก์ท็อป
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
          <div className="text-[11px] text-[#B5BDCB]">เฉลี่ยต่อเดือน</div>
          <div className="apple-stat text-2xl font-bold text-[#FFCF90] mt-1">
            {activeYearStats.avgPerMonth.toLocaleString('th-TH')}{' '}
            <span className="text-xs font-normal text-[#8E97AB]">เคส/เดือน</span>
          </div>
        </div>

        <div className="glass-tile rounded-xl p-3.5">
          <div className="text-[11px] text-[#B5BDCB]">เดือนที่เคสสูงสุด</div>
          <div className="apple-stat text-2xl font-bold text-[#FFB59D] mt-1">
            {activeYearStats.peakMonth.monthShort}{' '}
            <span className="text-xs font-mono text-[#DFE2EF]">
              ({activeYearStats.peakMonth.activeCases} เคส)
            </span>
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
        </span>
      </div>
    </section>
  );
};
