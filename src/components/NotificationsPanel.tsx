import React, { useState } from 'react';
import { Bell, CheckCircle2, Flame, Send, TrendingUp, X } from 'lucide-react';
import {
  formatCurrency,
  formatTimestamp,
  type NotificationItem,
  type UserProfile,
} from '../types';
import type { ExecutiveSummaryMetrics } from '../utils/exportReports';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  summary: ExecutiveSummaryMetrics;
  currentUser: UserProfile;
  onBroadcastDailySummary: () => Promise<void>;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  open,
  onClose,
  notifications,
  summary,
  currentUser,
  onBroadcastDailySummary,
}) => {
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const canBroadcast =
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'executive';

  const handleBroadcast = async () => {
    setSending(true);
    try {
      await onBroadcastDailySummary();
    } catch (err) {
      console.error('Broadcast summary failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-surface h-full flex flex-col border-l border-white/[0.1] shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#F4F6FB]">
              แจ้งเตือนและสรุปยอดขายเรียลไทม์
            </h2>
            <p className="text-xs text-[#B5BDCB] mt-0.5">
              อัปเดตอัตโนมัติทุกความเคลื่อนไหวของทีมขายวันนี้
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างแจ้งเตือน"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#B5BDCB] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Daily Digest Summary Block */}
        <div className="p-5 bg-[#0A0E17]/60 border-b border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#FFB59D]">
              สรุปยอดขายประจำวันนี้ (Live)
            </span>
            <span className="text-xs text-[#8E97AB] font-mono tabular-nums">
              {new Date().toLocaleDateString('th-TH', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="glass-tile rounded-xl p-3">
              <div className="text-[11px] text-[#8E97AB]">ปิดสำเร็จวันนี้</div>
              <div className="text-sm font-bold text-[#FFCF90] font-mono tabular-nums mt-1">
                {formatCurrency(summary.todayWonRevenue)}
              </div>
            </div>
            <div className="glass-tile rounded-xl p-3">
              <div className="text-[11px] text-[#8E97AB]">ดีลใหม่วันนี้</div>
              <div className="text-sm font-bold text-[#F4F6FB] font-mono tabular-nums mt-1">
                {summary.todayNewDeals} ดีล
              </div>
            </div>
            <div className="glass-tile rounded-xl p-3">
              <div className="text-[11px] text-[#8E97AB]">เคสใหม่วันนี้</div>
              <div className="text-sm font-bold text-[#FFB59D] font-mono tabular-nums mt-1">
                +{summary.todayNewCases} เคส
              </div>
            </div>
          </div>

          {canBroadcast && (
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={sending}
              className="btn-luxury-orange w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              {sending
                ? 'กำลังส่งแจ้งเตือนสรุปยอด...'
                : 'ส่งแจ้งเตือนสรุปยอดขายรายวันถึงทีมทุกคน'}
            </button>
          )}
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
          {notifications.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Bell className="w-8 h-8 text-[#8E97AB] mx-auto" />
              <div className="text-sm font-medium text-[#F4F6FB]">
                ยังไม่มีประวัติการแจ้งเตือน
              </div>
              <p className="text-xs text-[#8E97AB]">
                เมื่อมีการปิดการขาย โรงพยาบาลเคสหนาแน่นสูง หรือประกาศสรุปยอดรายวัน ข้อมูลจะปรากฏทันทีที่นี่
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const Icon =
                item.type === 'deal_won'
                  ? CheckCircle2
                  : item.type === 'high_density_alert'
                    ? Flame
                    : TrendingUp;
              const iconColor =
                item.type === 'deal_won'
                  ? 'text-emerald-300 bg-emerald-500/15'
                  : item.type === 'high_density_alert'
                    ? 'text-[#FFB59D] bg-[#FF5E1E]/20'
                    : 'text-[#FFCF90] bg-[#FFAA00]/15';
              const typeLabel =
                item.type === 'daily_summary'
                  ? 'สรุปยอดขายรายวัน'
                  : item.type === 'deal_won'
                    ? 'ปิดการขายสำเร็จ'
                    : item.type === 'high_density_alert'
                      ? 'แจ้งเตือนเคสหนาแน่นสูง'
                      : 'อัปเดตสถานะการขาย';

              return (
                <div key={item.id} className="p-4 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-[#8E97AB]">
                        <span className="font-semibold text-[#DFE2EF]">{typeLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatTimestamp(item.createdAt)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#F4F6FB] leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#B5BDCB] leading-relaxed">
                        {item.message}
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums text-[#8E97AB]">
                        {item.amount > 0 && (
                          <span className="text-[#FFCF90] font-semibold">
                            {formatCurrency(item.amount)}
                          </span>
                        )}
                        {item.caseCount > 0 && <span>{item.caseCount} เคส</span>}
                        <span className="font-sans">โดย {item.createdByName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
