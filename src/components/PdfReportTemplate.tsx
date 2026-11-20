import React from 'react';
import {
  DEAL_STAGE_META,
  DEAL_STAGE_ORDER,
  formatCurrency,
  getDensityMeta,
  type Deal,
  type Hospital,
} from '../types';
import type { ExecutiveSummaryMetrics } from '../utils/exportReports';

interface PdfReportTemplateProps {
  reportRef: React.RefObject<HTMLDivElement | null>;
  hospitals: Hospital[];
  deals: Deal[];
  summary: ExecutiveSummaryMetrics;
  exportedBy: string;
}

export const PdfReportTemplate: React.FC<PdfReportTemplateProps> = ({
  reportRef,
  hospitals,
  deals,
  summary,
  exportedBy,
}) => {
  const stageBreakdown = DEAL_STAGE_ORDER.map((stage) => {
    const items = deals.filter((d) => d.stage === stage);
    return {
      stage,
      label: DEAL_STAGE_META[stage].label,
      count: items.length,
      amount: items.reduce((acc, d) => acc + d.amount, 0),
      cases: items.reduce((acc, d) => acc + d.caseVolume, 0),
    };
  });

  const topHospitals = hospitals
    .slice()
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, 12);

  const yearlyTotals = (['2024', '2025', '2026'] as const).map((year) => {
    const liveYearDeals = deals.filter(
      (d) => (d.dateKey || d.expectedCloseDate || '').startsWith(year)
    );
    const liveCases = liveYearDeals.reduce((sum, d) => sum + (d.caseVolume || 0), 0);
    const liveRev = liveYearDeals
      .filter((d) => d.stage === 'won')
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    return {
      year,
      cases: liveCases,
      avgPerMonth: Math.round(liveCases / 12),
      revenue: liveRev,
    };
  });

  return (
    <div
      style={{
        position: 'fixed',
        left: '-99999px',
        top: 0,
        width: '794px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Thonburi", "Sukhumvit Set", "IBM Plex Sans Thai", "Plus Jakarta Sans", sans-serif',
      }}
      aria-hidden="true"
    >
      <div ref={reportRef} style={{ padding: '32px', backgroundColor: '#ffffff' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #ff5e1e',
            paddingBottom: '14px',
            marginBottom: '20px',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/aistudio/IMG_0007_bea31e22.jpeg"
              alt="CTEC Customized Technologies Co., Ltd."
              style={{
                width: '62px',
                height: '62px',
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                CTEC Devices — MedSales CRM
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                รายงานสรุปยอดขายรายวัน สถานะการขาย และความหนาแน่นเคสโรงพยาบาล
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569', lineHeight: 1.6, flexShrink: 0 }}>
            <div>วันที่จัดทำ: {new Date().toLocaleString('th-TH')}</div>
            <div>ผู้ส่งออกรายงาน: {exportedBy}</div>
          </div>
        </div>

        {/* KPI Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {[
            { label: 'ยอดขายปิดสำเร็จสะสม', value: formatCurrency(summary.closedWonRevenue), sub: `วันนี้ ${formatCurrency(summary.todayWonRevenue)}` },
            { label: 'มูลค่าไปป์ไลน์ติดตาม', value: formatCurrency(summary.activePipelineValue), sub: `${deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').length} ดีลที่เปิดอยู่` },
            { label: 'เคสสะสมทุกโรงพยาบาล', value: `${summary.totalCases.toLocaleString('th-TH')} เคส`, sub: `หนาแน่นสูง ${summary.highDensityHospitalsCount} แห่ง` },
            { label: 'อัตราปิดการขาย', value: `${summary.winRate.toFixed(1)}%`, sub: `โรงพยาบาลทั้งหมด ${hospitals.length} แห่ง` },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ fontSize: '11px', color: '#475569' }}>{kpi.label}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Pipeline Stage Breakdown */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            1. สรุปสถานะการขายตามขั้นตอน (Sales Pipeline Summary)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600 }}>ขั้นตอนการขาย</th>
                <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>จำนวนดีล</th>
                <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>จำนวนเคส</th>
                <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>มูลค่ารวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {stageBreakdown.map((row) => (
                <tr key={row.stage} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 8px', color: '#0f172a' }}>{row.label}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{row.count}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{row.cases.toLocaleString('th-TH')}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Hospitals by Case Density */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            2. รายชื่อโรงพยาบาลจัดลำดับตามความหนาแน่นเคส (Top Hospitals by Case Density)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600 }}>โรงพยาบาล</th>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600 }}>จังหวัด / ภูมิภาค</th>
                <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>จำนวนเคส</th>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600 }}>ความหนาแน่น</th>
                <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>ยอดขายสะสม</th>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600 }}>ผู้รับผิดชอบ</th>
              </tr>
            </thead>
            <tbody>
              {topHospitals.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '14px', textAlign: 'center', color: '#64748b' }}>
                    ยังไม่มีข้อมูลโรงพยาบาลในระบบ
                  </td>
                </tr>
              ) : (
                topHospitals.map((h) => {
                  const density = getDensityMeta(h.caseCount);
                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '7px 8px', fontWeight: 500, color: '#0f172a' }}>{h.name}</td>
                      <td style={{ padding: '7px 8px', color: '#475569' }}>
                        {h.province || '-'} / {h.region}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>
                        {h.caseCount.toLocaleString('th-TH')}
                      </td>
                      <td style={{ padding: '7px 8px', color: density.color, fontWeight: 600 }}>
                        {density.label}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                        {formatCurrency(h.totalRevenue)}
                      </td>
                      <td style={{ padding: '7px 8px', color: '#475569' }}>{h.ownerName}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Yearly Case Volume Summary (2024-2026) */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            3. สรุปสถิติจำนวนเคสผ่าตัดและยอดขายรายปี (2024 – 2026)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontWeight: 600 }}>ปี พ.ศ. / ค.ศ.</th>
                <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>จำนวนเคสรวมทั้งปี</th>
                <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>เฉลี่ยต่อเดือน</th>
                <th style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>มูลค่ายอดขายรวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {yearlyTotals.map((row) => (
                <tr key={row.year} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 8px', fontWeight: 600, color: '#0f172a' }}>
                    ปี {row.year}
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#d94309' }}>
                    {row.cases.toLocaleString('th-TH')} เคส
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#475569' }}>
                    {row.avgPerMonth.toLocaleString('th-TH')} เคส/เดือน
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#64748b',
          }}
        >
          <span>เอกสารภายในองค์กร · CTEC MedSales CRM</span>
          <span>ระบบรักษาความปลอดภัยฐานข้อมูลตามสิทธิ์ผู้ใช้งาน (RBAC)</span>
        </div>
      </div>
    </div>
  );
};
