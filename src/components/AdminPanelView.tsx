import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  XCircle,
} from 'lucide-react';
import {
  formatTimestamp,
  REGIONS,
  ROLE_META,
  type AuditLogItem,
  type Deal,
  type Hospital,
  type NotificationItem,
  type OfficeCase,
  type UserProfile,
  type UserRole,
} from '../types';
import { getFriendlyFirestoreError } from '../firebase';
import {
  approveUserRegistration,
  clearAllWorkspaceRecords,
  rejectUserRegistration,
  updateUserRoleAndStatus,
} from '../services/crmService';

interface AdminPanelViewProps {
  currentUser: UserProfile;
  users: UserProfile[];
  hospitals: Hospital[];
  deals: Deal[];
  officeCases: OfficeCase[];
  notifications: NotificationItem[];
  auditLogs: AuditLogItem[];
  onNotifyToast: (msg: string) => void;
}

const ROLES_LIST: UserRole[] = [
  'admin',
  'executive',
  'manager',
  'sales',
  'office_admin',
  'employee',
  'accounting',
];

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  users,
  hospitals,
  deals,
  officeCases,
  notifications,
  auditLogs,
  onNotifyToast,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [rejectingUid, setRejectingUid] = useState<string | null>(null);
  const [pendingRoleOverrides, setPendingRoleOverrides] = useState<Record<string, UserRole>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingWorkspace, setResettingWorkspace] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<string, { role: UserRole; department: string; territory: string; active: boolean }>
  >({});

  const pendingUsers = useMemo(
    () =>
      users
        .filter((u) => u.approvalStatus === 'pending')
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)),
    [users]
  );

  const directoryUsers = useMemo(
    () => users.filter((u) => u.approvalStatus !== 'pending'),
    [users]
  );

  const totalStoredRecords =
    hospitals.length + deals.length + officeCases.length + notifications.length;

  const handleApprovePending = async (target: UserProfile) => {
    if (!isAdmin || approvingUid) return;
    const assignedRole =
      pendingRoleOverrides[target.uid] || target.requestedRole || target.role || 'employee';
    setApprovingUid(target.uid);
    try {
      await approveUserRegistration(target, assignedRole, currentUser);
      setPendingRoleOverrides((prev) => {
        const next = { ...prev };
        delete next[target.uid];
        return next;
      });
      onNotifyToast(
        `อนุมัติ "${target.displayName}" เข้าใช้งานในตำแหน่ง ${ROLE_META[assignedRole].label} เรียบร้อยแล้ว`
      );
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถอนุมัติผู้ใช้งานได้'));
    } finally {
      setApprovingUid(null);
    }
  };

  const handleRejectPending = async (target: UserProfile) => {
    if (!isAdmin || rejectingUid) return;
    setRejectingUid(target.uid);
    try {
      await rejectUserRegistration(target, currentUser);
      onNotifyToast(`ปฏิเสธคำขอลงทะเบียนของ "${target.displayName}" แล้ว`);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถปฏิเสธคำขอได้'));
    } finally {
      setRejectingUid(null);
    }
  };

  const handleConfirmResetWorkspace = async () => {
    if (!isAdmin || resettingWorkspace) return;
    setResettingWorkspace(true);
    try {
      const res = await clearAllWorkspaceRecords({
        dealsIds: deals.map((d) => d.id),
        hospitalsIds: hospitals.map((h) => h.id),
        officeCaseIds: officeCases.map((c) => c.id),
        notificationIds: notifications.map((n) => n.id),
        actor: currentUser,
      });
      setShowResetConfirm(false);
      onNotifyToast(
        `ล้างข้อมูลเรียบร้อยแล้ว (ดีล ${res.dealsDeleted} · รพ. ${res.hospitalsDeleted} · เคสออฟฟิศ ${res.officeCasesDeleted} · แจ้งเตือน ${res.notificationsDeleted}) พร้อมเริ่มใช้งานจริง`
      );
    } catch (err) {
      onNotifyToast(
        getFriendlyFirestoreError(err, 'ไม่สามารถล้างข้อมูลบางรายการได้ กรุณาลองใหม่')
      );
    } finally {
      setResettingWorkspace(false);
    }
  };

  const getDraft = (u: UserProfile) =>
    drafts[u.uid] || {
      role: u.role,
      department: u.department,
      territory: u.territory,
      active: u.active,
    };

  const updateDraft = (
    u: UserProfile,
    patch: Partial<{ role: UserRole; department: string; territory: string; active: boolean }>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [u.uid]: { ...getDraft(u), ...patch },
    }));
  };

  const handleSaveUser = async (target: UserProfile) => {
    if (!isAdmin) return;
    const draft = getDraft(target);
    setSavingUid(target.uid);
    try {
      await updateUserRoleAndStatus(
        target,
        {
          ...draft,
          approvalStatus: draft.active ? 'approved' : target.approvalStatus || 'approved',
        },
        currentUser
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[target.uid];
        return next;
      });
      onNotifyToast(`บันทึกสิทธิ์การใช้งานของ ${target.displayName} เรียบร้อยแล้ว`);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถบันทึกสิทธิ์ผู้ใช้งานได้'));
    } finally {
      setSavingUid(null);
    }
  };

  const permissionMatrix = [
    {
      capability: 'อนุมัติผู้ลงทะเบียนใหม่และจัดการสิทธิ์ (RBAC)',
      admin: 'เต็มรูปแบบ',
      executive: 'ดูอย่างเดียว',
      manager: 'ดูอย่างเดียว',
      office_admin: 'ไม่อนุญาต',
      accounting: 'ไม่อนุญาต',
      sales: 'ไม่อนุญาต',
      employee: 'ไม่อนุญาต',
    },
    {
      capability: 'ระบบรับเคสใหม่และทะเบียนเคสกลาง (ฝ่ายขาย & แอดมิน)',
      admin: 'เต็มรูปแบบ',
      executive: 'อ่านและส่งออก',
      manager: 'รับเคส/อัปเดต',
      office_admin: 'รับเคส/นำเข้า Excel',
      accounting: 'อ่านและตรวจสอบยอด',
      sales: 'รับเคสใหม่/อัปเดต',
      employee: 'ไม่อนุญาต',
    },
    {
      capability: 'แดชบอร์ดรวม & ตารางจำนวนเคสประจำเดือนฝ่ายขาย',
      admin: 'เข้าถึงทั้งหมด',
      executive: 'เข้าถึงทั้งหมด',
      manager: 'เข้าถึงทั้งหมด',
      office_admin: 'เข้าถึงทั้งหมด',
      accounting: 'เข้าถึงทั้งหมด',
      sales: 'เข้าถึงและแสดงชื่อตน',
      employee: 'ภาพรวมบริษัท',
    },
    {
      capability: 'แผนที่ความหนาแน่นโรงพยาบาล 77 จังหวัด',
      admin: 'ดูทั้งหมด',
      executive: 'ดูทั้งหมด',
      manager: 'ดูทั้งหมด',
      office_admin: 'ดูทั้งหมด',
      accounting: 'ดูทั้งหมด',
      sales: 'ดูทั้งหมด',
      employee: 'ดูทั้งหมด',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            ระบบแอดมินหลังบ้าน อนุมัติผู้ลงทะเบียน และจัดการสิทธิ์
          </h1>
          <p className="text-sm text-[#e3beb3]/75 mt-1">
            ตรวจสอบคำขอลงทะเบียนผู้ใช้งานใหม่ กำหนดตำแหน่งงาน และติดตามบันทึกความปลอดภัย (RBAC &amp; Audit Log)
          </p>
        </div>
        {!isAdmin && (
          <div className="text-xs text-[#ffcf90] bg-[#ffaa00]/12 border border-[#ffaa00]/30 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>โหมดอ่านอย่างเดียว — เฉพาะผู้ดูแลระบบสูงสุดจึงจะอนุมัติและแก้ไขสิทธิ์ได้</span>
          </div>
        )}
      </div>

      {/* Pending User Registrations Approval Queue */}
      <section className="apple-glass rounded-2xl overflow-hidden border border-[#FFAA00]/25">
        <div className="px-5 py-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-[#FF5E1E]/[0.06]">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#FFCF90] shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-white">
                คำขอลงทะเบียนรอการอนุมัติ ({pendingUsers.length} รายการ)
              </h2>
              <p className="text-xs text-[#e3beb3]/75 mt-0.5">
                ผู้ลงทะเบียนใหม่จะถูกล็อกสิทธิ์ไม่ให้เข้าถึงข้อมูลใดๆ จนกว่าผู้ดูแลระบบจะกดอนุมัติ
              </p>
            </div>
          </div>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="px-5 py-7 text-center text-xs text-[#B5BDCB] flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400/80" />
            <span className="font-medium text-[#F4F6FB]">ไม่มีคำขอลงทะเบียนค้างรออนุมัติ</span>
            <span className="text-[#8E97AB]">
              เมื่อมีพนักงานหรือผู้บริหารล็อกอินลงทะเบียนใหม่ รายการจะปรากฏที่นี่แบบเรียลไทม์
            </span>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {pendingUsers.map((u) => {
              const reqRole = u.requestedRole || 'employee';
              const chosenRole = pendingRoleOverrides[u.uid] || reqRole;
              const busy = approvingUid === u.uid || rejectingUid === u.uid;

              return (
                <div
                  key={u.uid}
                  className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.02]"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">{u.displayName}</span>
                      <span className="text-xs font-semibold text-[#FFCF90] inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ขอสมัครตำแหน่ง: {ROLE_META[reqRole]?.label || reqRole}
                      </span>
                    </div>
                    <div className="text-xs text-[#B5BDCB] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>แผนก: {u.department || '-'}</span>
                      <span>·</span>
                      <span>พื้นที่: {u.territory || 'ทั่วประเทศ'}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-[#8E97AB]">
                        ส่งคำขอเมื่อ {formatTimestamp(u.createdAt)}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <select
                        aria-label={`กำหนดตำแหน่งอนุมัติสำหรับ ${u.displayName}`}
                        value={chosenRole}
                        disabled={busy}
                        onChange={(e) =>
                          setPendingRoleOverrides((prev) => ({
                            ...prev,
                            [u.uid]: e.target.value as UserRole,
                          }))
                        }
                        className="h-9 px-2.5 text-xs rounded-xl glass-input"
                      >
                        {ROLES_LIST.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_META[r].label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleApprovePending(u)}
                        className="btn-luxury-orange min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-55 whitespace-nowrap"
                      >
                        {approvingUid === u.uid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        อนุมัติเข้าใช้งาน
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRejectPending(u)}
                        className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-200 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-55 whitespace-nowrap"
                      >
                        {rejectingUid === u.uid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        ไม่อนุมัติ
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* User Directory & RBAC Controls */}
      <section className="apple-glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">
              รายชื่อผู้ใช้งานในระบบและกำหนดตำแหน่ง ({directoryUsers.length} บัญชี)
            </h2>
            <p className="text-xs text-[#e3beb3]/70 mt-0.5">
              พนักงานตำแหน่ง &quot;พนักงานฝ่ายขาย&quot; ที่เปิดใช้งานจะถูกนำชื่อไปแสดงในตารางผลงานการขายแต่ละเดือนอัตโนมัติ
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/[0.08] text-xs font-semibold text-[#e3beb3]">
                <th className="py-3 px-4">ชื่อ-สกุล</th>
                <th className="py-3 px-4">ตำแหน่ง (Role)</th>
                <th className="py-3 px-4">แผนก</th>
                <th className="py-3 px-4">เขตพื้นที่ดูแล</th>
                <th className="py-3 px-4">สถานะบัญชี</th>
                {isAdmin && <th className="py-3 px-4 text-right">บันทึก</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {directoryUsers.map((u) => {
                const draft = getDraft(u);
                const isDirty =
                  draft.role !== u.role ||
                  draft.department !== u.department ||
                  draft.territory !== u.territory ||
                  draft.active !== u.active;
                const isSelf = u.uid === currentUser.uid;
                const isRejected = u.approvalStatus === 'rejected';

                return (
                  <tr key={u.uid} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">
                        {u.displayName}
                        {isSelf && (
                          <span className="ml-2 text-xs text-[#ffb59d] font-normal">
                            (บัญชีของคุณ)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#aa897f] font-mono">
                        UID: {u.uid.slice(0, 10)}...
                        {isRejected && (
                          <span className="ml-2 font-sans text-rose-300">· เคยถูกปฏิเสธคำขอ</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isAdmin && !isSelf ? (
                        <select
                          value={draft.role}
                          onChange={(e) =>
                            updateDraft(u, { role: e.target.value as UserRole })
                          }
                          className="h-9 px-2.5 text-xs rounded-lg glass-input"
                        >
                          {ROLES_LIST.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`text-xs font-semibold ${
                            ROLE_META[u.role]?.textClass || 'text-slate-300'
                          }`}
                        >
                          {ROLE_META[u.role]?.label || u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <input
                          type="text"
                          value={draft.department}
                          onChange={(e) => updateDraft(u, { department: e.target.value })}
                          maxLength={80}
                          className="h-9 w-44 px-2.5 text-xs rounded-lg glass-input"
                        />
                      ) : (
                        <span className="text-xs text-[#dfe2ef]">{u.department || '-'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <select
                          value={draft.territory}
                          onChange={(e) => updateDraft(u, { territory: e.target.value })}
                          className="h-9 px-2.5 text-xs rounded-lg glass-input"
                        >
                          <option value="ทั่วประเทศ">ทั่วประเทศ</option>
                          {REGIONS.map((reg) => (
                            <option key={reg} value={reg}>
                              {reg}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-[#dfe2ef]">{u.territory || '-'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isAdmin && !isSelf ? (
                        <button
                          type="button"
                          onClick={() => updateDraft(u, { active: !draft.active })}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                            draft.active ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {draft.active ? (
                            <>
                              <UserCheck className="w-4 h-4" />
                              อนุมัติ / เปิดใช้งาน
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4" />
                              {isRejected ? 'ไม่อนุมัติ' : 'ระงับสิทธิ์'}
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`text-xs font-medium ${
                            u.active ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {u.active ? 'เปิดใช้งาน' : isRejected ? 'ไม่อนุมัติ' : 'ระงับสิทธิ์'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={!isDirty || savingUid === u.uid}
                          onClick={() => void handleSaveUser(u)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                            isDirty
                              ? 'orange-cta cursor-pointer'
                              : 'bg-white/[0.06] text-[#aa897f]/60 cursor-not-allowed'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {savingUid === u.uid ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Role Permission Matrix */}
      <section className="apple-glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#ffb59d]" />
          <h2 className="text-base font-semibold text-white">
            ตารางกำหนดสิทธิ์การเข้าถึงตามตำแหน่ง (RBAC Policy Matrix)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/[0.08] text-xs font-semibold text-[#e3beb3]">
                <th className="py-3 px-4">ขอบเขตสิทธิ์การทำงาน</th>
                <th className="py-3 px-3">ผู้ดูแลระบบ</th>
                <th className="py-3 px-3">ผู้บริหาร</th>
                <th className="py-3 px-3">ผู้จัดการ</th>
                <th className="py-3 px-3">ฝ่ายแอดมิน</th>
                <th className="py-3 px-3">ฝ่ายบัญชี</th>
                <th className="py-3 px-3">พนักงานฝ่ายขาย</th>
                <th className="py-3 px-3">พนักงานบริษัท</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs">
              {permissionMatrix.map((row) => (
                <tr key={row.capability}>
                  <td className="py-3 px-4 font-medium text-white">{row.capability}</td>
                  <td className="py-3 px-3 text-[#ffb59d] font-medium">{row.admin}</td>
                  <td className="py-3 px-3 text-[#ffcf90]">{row.executive}</td>
                  <td className="py-3 px-3 text-[#EEC058]">{row.manager}</td>
                  <td className="py-3 px-3 text-sky-300 font-medium">{row.office_admin}</td>
                  <td className="py-3 px-3 text-violet-300 font-medium">{row.accounting}</td>
                  <td className="py-3 px-3 text-emerald-300">{row.sales}</td>
                  <td className="py-3 px-3 text-slate-300">{row.employee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Immutable Audit Logs */}
      <section className="apple-glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.08]">
          <h2 className="text-base font-semibold text-white">
            บันทึกความปลอดภัยและประวัติการทำรายการ (Audit Trail)
          </h2>
          <p className="text-xs text-[#e3beb3]/70 mt-0.5">
            บันทึกถาวรไม่สามารถแก้ไขหรือลบได้ เพื่อความโปร่งใสในการตรวจสอบระบบ
          </p>
        </div>
        <div className="divide-y divide-white/[0.06] max-h-96 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#aa897f]">
              ยังไม่มีประวัติการทำรายการในระบบ
            </div>
          ) : (
            auditLogs.slice(0, 40).map((log) => (
              <div
                key={log.id}
                className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-white/[0.02]"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 text-white font-medium">
                    <span>{log.action}</span>
                    <span className="text-[#aa897f]" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[#ffcf90] truncate">{log.targetLabel}</span>
                  </div>
                  <div className="text-[#e3beb3]/75">{log.details}</div>
                </div>
                <div className="text-[#aa897f] sm:text-right shrink-0">
                  <div className="font-medium text-[#dfe2ef]">{log.actorName}</div>
                  <div className="font-mono tabular-nums text-[11px]">
                    {formatTimestamp(log.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Admin-Only: Production Clean-Start Data Reset */}
      {isAdmin && (
        <section className="apple-glass rounded-2xl p-5 border border-rose-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>ล้างข้อมูลทดลอง / รีเซ็ตฐานข้อมูลเริ่มต้น (สำหรับผู้ดูแลระบบ)</span>
            </div>
            <p className="text-xs text-[#e3beb3]/80 leading-relaxed">
              หากเคยนำเข้าข้อมูลเดโม่หรือข้อมูลทดสอบเก็บไว้ในระบบ สามารถกดล้างข้อมูลทั้งหมดในฐานข้อมูลเพื่อเริ่มใช้งานจริงจากศูนย์ได้ (บัญชีผู้ใช้และสิทธิ์ RBAC จะไม่ถูกลบ)
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-mono tabular-nums text-[#C8B6AE]">
              <span>
                โรงพยาบาลคู่ค้า: <strong className="text-white">{hospitals.length}</strong>
              </span>
              <span>
                ดีลการขาย: <strong className="text-white">{deals.length}</strong>
              </span>
              <span>
                เคสออฟฟิศ: <strong className="text-white">{officeCases.length}</strong>
              </span>
              <span>
                แจ้งเตือน: <strong className="text-white">{notifications.length}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={totalStoredRecords === 0 || resettingWorkspace}
            onClick={() => setShowResetConfirm(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-rose-200 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            {totalStoredRecords === 0
              ? 'ฐานข้อมูลว่างพร้อมใช้งานจริงแล้ว'
              : `ล้างข้อมูลในระบบ (${totalStoredRecords} รายการ)`}
          </button>
        </section>
      )}

      {/* Confirmation Modal for Workspace Clean Start */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-glass rounded-2xl max-w-md w-full p-6 border border-rose-400/30 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  ยืนยันล้างข้อมูลทั้งหมดเพื่อเริ่มใช้งานจริง?
                </h3>
                <p className="text-xs text-[#e3beb3]/80 leading-relaxed">
                  ระบบจะลบข้อมูลในฐานข้อมูลทั้งหมด ได้แก่ โรงพยาบาล {hospitals.length} แห่ง, ดีล{' '}
                  {deals.length} รายการ, เคสออฟฟิศ {officeCases.length} รายการ และแจ้งเตือน{' '}
                  {notifications.length} รายการ โดยไม่สามารถกู้คืนได้ (บัญชีผู้ใช้จะคงอยู่ครบ)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={resettingWorkspace}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#dfe2ef] bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={resettingWorkspace}
                onClick={() => void handleConfirmResetWorkspace()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {resettingWorkspace ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    กำลังล้างข้อมูล...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    ยืนยันล้างข้อมูลทั้งหมด
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
