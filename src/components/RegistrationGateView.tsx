import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Briefcase,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Clock,
  Crown,
  Edit3,
  Loader2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { getFriendlyFirestoreError } from '../firebase';
import { submitUserRegistration } from '../services/crmService';
import {
  DEFAULT_DEPARTMENT_BY_ROLE,
  REGIONS,
  REGISTRATION_ROLES,
  ROLE_META,
  type RegistrationRole,
  type UserProfile,
} from '../types';

interface RegistrationGateViewProps {
  firebaseUser: User;
  profile: UserProfile | null;
  onRegistered: (profile: UserProfile) => void;
  onSignOut: () => void;
}

const ROLE_ICONS: Record<RegistrationRole, React.ComponentType<{ className?: string }>> = {
  executive: Crown,
  manager: Briefcase,
  sales: TrendingUp,
  office_admin: ClipboardList,
  employee: Users,
  accounting: Calculator,
};

export const RegistrationGateView: React.FC<RegistrationGateViewProps> = ({
  firebaseUser,
  profile,
  onRegistered,
  onSignOut,
}) => {
  const isPending = profile?.approvalStatus === 'pending';
  const isRejected = profile?.approvalStatus === 'rejected';

  const [editing, setEditing] = useState(!profile);
  const [displayName, setDisplayName] = useState(
    profile?.displayName || firebaseUser.displayName || ''
  );
  const [requestedRole, setRequestedRole] = useState<RegistrationRole>(
    (profile?.requestedRole &&
    REGISTRATION_ROLES.includes(profile.requestedRole as RegistrationRole)
      ? (profile.requestedRole as RegistrationRole)
      : 'sales')
  );
  const [territory, setTerritory] = useState(profile?.territory || 'กรุงเทพและปริมณฑล');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      setError('กรุณากรอกชื่อ-นามสกุลจริงอย่างน้อย 2 ตัวอักษร');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const saved = await submitUserRegistration(
        firebaseUser,
        {
          displayName: trimmedName,
          requestedRole,
          department: DEFAULT_DEPARTMENT_BY_ROLE[requestedRole],
          territory:
            requestedRole === 'sales' || requestedRole === 'manager'
              ? territory
              : 'ทั่วประเทศ',
          phone: phone.trim(),
        },
        profile
      );
      onRegistered(saved);
      setEditing(false);
    } catch (err) {
      setError(getFriendlyFirestoreError(err, 'ไม่สามารถส่งคำขอลงทะเบียนได้ กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = !profile || editing;
  const activeRoleLabel =
    (ROLE_META[profile?.requestedRole || profile?.role || 'employee'] ?? ROLE_META.employee).label;

  return (
    <div className="min-h-screen bg-[#0F131C] text-[#DFE2EF] relative overflow-hidden flex items-center justify-center p-4 sm:p-8">
      {/* Ambient Luxury Orange & Gold Glows */}
      <div
        aria-hidden="true"
        className="fixed -top-40 -left-24 w-[480px] h-[480px] rounded-full bg-[#FF5E1E]/14 blur-[140px] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="fixed bottom-0 right-0 w-[520px] h-[520px] rounded-full bg-[#FFAA00]/10 blur-[150px] pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Top Identity Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_8px_24px_rgba(255,94,30,0.3)] ring-1 ring-white/25">
              <img
                src="/assets/aistudio/IMG_0007_bea31e22.jpeg"
                alt="CTEC Customized Technologies Co., Ltd."
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-[#F4F6FB] truncate">
                CTEC Medical Devices CRM
              </div>
              <div className="text-xs text-[#B5BDCB] truncate">
                บัญชี Google: <span className="text-[#FFCF90]">{firebaseUser.email}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#e3beb3] hover:text-rose-300 bg-white/[0.05] hover:bg-rose-500/12 border border-white/[0.08] inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#FFB59D] text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>ระบบยืนยันตัวตนก่อนเข้าถึงข้อมูลองค์กร</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#F4F6FB] tracking-tight">
                {profile ? 'แก้ไขข้อมูลลงทะเบียนขออนุมัติสิทธิ์' : 'ลงทะเบียนผู้ใช้งานใหม่'}
              </h1>
              <p className="text-xs sm:text-sm text-[#B5BDCB] leading-relaxed">
                กรุณากรอกชื่อ-สกุลและเลือกตำแหน่งงานของคุณ หลังส่งคำขอจะยังไม่สามารถเข้าถึงข้อมูลในระบบได้จนกว่าผู้ดูแลระบบจะกดอนุมัติ
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-xs text-rose-200 leading-relaxed">
                {error}
              </div>
            )}

            {/* Full Name Input */}
            <div className="space-y-2">
              <label
                htmlFor="reg-fullname"
                className="block text-xs font-semibold text-[#F4F6FB]"
              >
                ชื่อ-สกุล <span className="text-[#FF5E1E]">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#8E97AB] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุลจริง เช่น สมชาย ใจดี"
                  className="glass-input w-full h-11 pl-10 pr-4 text-sm rounded-xl placeholder:text-[#8E97AB]"
                />
              </div>
              {requestedRole === 'sales' && (
                <p className="text-[11px] text-[#FFCF90]">
                  ชื่อ-สกุลนี้จะถูกนำไปแสดงในตารางผลงานการขายแต่ละเดือนของพนักงานฝ่ายขายโดยอัตโนมัติหลังได้รับอนุมัติ
                </p>
              )}
            </div>

            {/* Position / Role Selection (6 Required Positions) */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#F4F6FB]">
                เลือกตำแหน่งงาน <span className="text-[#FF5E1E]">*</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REGISTRATION_ROLES.map((roleKey) => {
                  const Icon = ROLE_ICONS[roleKey];
                  const selected = requestedRole === roleKey;
                  const meta = ROLE_META[roleKey];

                  return (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => setRequestedRole(roleKey)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        selected
                          ? 'bg-[#FF5E1E]/16 border-[#FF5E1E]/70 shadow-[0_0_0_1px_rgba(255,94,30,0.35)]'
                          : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          selected
                            ? 'bg-[#FF5E1E] text-white'
                            : 'bg-white/[0.06] text-[#B5BDCB]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#F4F6FB]">
                            {meta.label}
                          </span>
                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-[#FFB59D] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#B5BDCB] mt-0.5 leading-snug line-clamp-2">
                          {meta.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Territory & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(requestedRole === 'sales' || requestedRole === 'manager') && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-territory"
                    className="block text-xs font-semibold text-[#F4F6FB]"
                  >
                    เขตพื้นที่ดูแล
                  </label>
                  <select
                    id="reg-territory"
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  >
                    <option value="ทั่วประเทศ">ทั่วประเทศ</option>
                    {REGIONS.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                className={
                  requestedRole === 'sales' || requestedRole === 'manager'
                    ? 'space-y-1.5'
                    : 'sm:col-span-2 space-y-1.5'
                }
              >
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-semibold text-[#F4F6FB]"
                >
                  เบอร์โทรศัพท์ติดต่อ <span className="text-[#8E97AB] font-normal">(ไม่บังคับ)</span>
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  maxLength={40}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className="glass-input w-full h-10 px-3.5 text-sm rounded-xl placeholder:text-[#8E97AB]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              {profile && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setEditing(false)}
                  className="btn-glass min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-luxury-orange min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังส่งข้อมูลลงทะเบียน...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    ส่งคำขอลงทะเบียนเพื่อรอการอนุมัติ
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Pending or Rejected Status View */
          <div className="py-4 space-y-6">
            <div className="text-center space-y-3">
              <div
                className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
                  isRejected
                    ? 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                    : 'bg-[#FFAA00]/15 border-[#FFAA00]/35 text-[#FFCF90]'
                }`}
              >
                {isRejected ? (
                  <ShieldAlert className="w-8 h-8" />
                ) : (
                  <Clock className="w-8 h-8" />
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-[#F4F6FB]">
                {isRejected
                  ? 'คำขอลงทะเบียนไม่ได้รับการอนุมัติ'
                  : 'ลงทะเบียนเรียบร้อย · รอผู้ดูแลระบบอนุมัติ'}
              </h1>
              <p className="text-sm text-[#B5BDCB] max-w-md mx-auto leading-relaxed">
                {isRejected
                  ? 'ผู้ดูแลระบบยังไม่อนุมัติคำขอเข้าใช้งานของคุณ กรุณาตรวจสอบข้อมูลชื่อ-สกุลหรือตำแหน่งที่เลือกแล้วส่งคำขอใหม่อีกครั้ง'
                  : 'เพื่อความปลอดภัยของข้อมูลบริษัท ระบบได้ล็อกการเข้าถึงข้อมูลทั้งหมดไว้ชั่วคราว เมื่อผู้ดูแลระบบกดอนุมัติ หน้าจอนี้จะเปิดเข้าใช้งานอัตโนมัติทันที'}
              </p>
            </div>

            {/* Submitted Registration Summary */}
            <div className="glass-tile rounded-2xl p-4 sm:p-5 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#8E97AB]">ชื่อ-สกุลที่ลงทะเบียน</span>
                <span className="font-semibold text-[#F4F6FB]">{profile.displayName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#8E97AB]">ตำแหน่งที่ขอเข้าใช้งาน</span>
                <span className="font-semibold text-[#FFCF90]">{activeRoleLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#8E97AB]">เขตพื้นที่ดูแล</span>
                <span className="text-[#DFE2EF]">{profile.territory || 'ทั่วประเทศ'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
                <span className="text-xs text-[#8E97AB]">สถานะการตรวจสอบ</span>
                <span
                  className={`text-xs font-semibold ${
                    isPending ? 'text-[#FFCF90]' : 'text-rose-300'
                  }`}
                >
                  {isPending ? 'รอผู้ดูแลระบบกดอนุมัติ' : 'ไม่ได้รับการอนุมัติ'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-glass w-full sm:w-auto min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#FFB59D]" />
                {isRejected ? 'แก้ไขข้อมูลและส่งคำขอใหม่' : 'แก้ไขข้อมูลลงทะเบียน'}
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full sm:w-auto min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-semibold text-[#e3beb3] hover:text-rose-300 bg-white/[0.04] hover:bg-rose-500/12 border border-white/[0.08] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
