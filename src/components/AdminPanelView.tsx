import React, { useState } from 'react';
import { AlertTriangle, Check, Loader2, Lock, Shield, Trash2, UserCheck, UserX } from 'lucide-react';
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
  clearAllWorkspaceRecords,
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

const ROLES_LIST: UserRole[] = ['admin', 'executive', 'manager', 'office_admin', 'sales'];

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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingWorkspace, setResettingWorkspace] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<string, { role: UserRole; department: string; territory: string; active: boolean }>
  >({});

  const totalStoredRecords =
    hospitals.length + deals.length + officeCases.length + notifications.length;

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
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถล้างข้อมูลบางรายการได้ กรุณาลองใหม่'));
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
      await updateUserRoleAndStatus(target, draft, currentUser);
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
      capability: 'กรอกและอัปเดตทะเบียนเคสออฟฟิศ (CTEC Personalized Implant)',
      admin: 'เต็มรูปแบบ (รวมลบ/ปลดล็อก)',
      executive: 'อ่านและส่งออก Excel',
      manager: 'เพิ่มและอัปเดตเคส',
      office_admin: 'กรอก/อัปเดต/นำเข้า-ส่งออก Excel',
      sales: 'ไม่อนุญาต (ป้องกันข้อมูลคนไข้)',
    },
    {
      capability: 'ดูแดชบอร์ดรวมผู้บริหารและกราฟวิเคราะห์ทุกทีม',
      admin: 'เข้าถึงเต็มรูปแบบ',
      executive: 'เข้าถึงเต็มรูปแบบ',
      manager: 'เข้าถึงเต็มรูปแบบ',
      office_admin: 'ดูภาพรวมและกราฟ',
      sales: 'เฉพาะข้อมูลของตนเอง',
    },
    {
      capability: 'แผนที่ติดตามสถานะและความหนาแน่นโรงพยาบาล',
      admin: 'ดูและจัดการทั้งหมด',
      executive: 'ดูภาพรวมทั้งหมด',
      manager: 'ดูและจัดการทั้งหมด',
      office_admin: 'ดูและเพิ่มโรงพยาบาล',
      sales: 'ดูและเพิ่มโรงพยาบาล',
    },
    {
      capability: 'แก้ไขหรือปลดล็อกดีลที่ปิดสำเร็จ/ยกเลิกแล้ว',
      admin: 'อนุญาต (Override)',
      executive: 'ไม่อนุญาต',
      manager: 'ไม่อนุญาต (ล็อกสถานะ)',
      office_admin: 'ไม่อนุญาต',
      sales: 'ไม่อนุญาต (ล็อกสถานะ)',
    },
    {
      capability: 'ส่งออกรายงาน PDF / Excel และประกาศสรุปยอดรายวัน',
      admin: 'อนุญาต',
      executive: 'อนุญาต',
      manager: 'อนุญาต',
      office_admin: 'ส่งออกทะเบียนเคสออฟฟิศ',
      sales: 'ส่งออกเฉพาะข้อมูลตน',
    },
    {
      capability: 'จัดการสิทธิ์ผู้ใช้ (RBAC) และตรวจสอบ Audit Log',
      admin: 'จัดการเต็มรูปแบบ',
      executive: 'อ่านอย่างเดียว',
      manager: 'อ่านประวัติได้',
      office_admin: 'ไม่อนุญาต',
      sales: 'ไม่อนุญาต',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            ระบบแอดมินหลังบ้านและการจัดการสิทธิ์ผู้ใช้งาน
          </h1>
          <p className="text-sm text-[#e3beb3]/75 mt-1">
            กำหนดบทบาทการทำงาน ควบคุมเขตพื้นที่รับผิดชอบ และตรวจสอบบันทึกความปลอดภัย (RBAC &amp; Audit Log)
          </p>
        </div>
        {!isAdmin && (
          <div className="text-xs text-[#ffcf90] bg-[#ffaa00]/12 border border-[#ffaa00]/30 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>โหมดอ่านอย่างเดียว — เฉพาะผู้ดูแลระบบสูงสุดจึงจะแก้ไขสิทธิ์ได้</span>
          </div>
        )}
      </div>

      {/* User Directory & RBAC Controls */}
      <section className="apple-glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">
              รายชื่อผู้ใช้งานและกำหนดบทบาท ({users.length} บัญชี)
            </h2>
            <p className="text-xs text-[#e3beb3]/70 mt-0.5">
              ข้อมูลส่วนบุคคล (อีเมล/เบอร์โทร) ถูกแยกเก็บในคอลเลกชันส่วนตัวตามมาตรฐานความปลอดภัย
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/[0.08] text-xs font-semibold text-[#e3beb3]">
                <th className="py-3 px-4">ชื่อผู้ใช้งาน</th>
                <th className="py-3 px-4">บทบาท (Role)</th>
                <th className="py-3 px-4">แผนก</th>
                <th className="py-3 px-4">เขตพื้นที่ดูแล</th>
                <th className="py-3 px-4">สถานะบัญชี</th>
                {isAdmin && <th className="py-3 px-4 text-right">บันทึก</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-sm">
              {users.map((u) => {
                const draft = getDraft(u);
                const isDirty =
                  draft.role !== u.role ||
                  draft.department !== u.department ||
                  draft.territory !== u.territory ||
                  draft.active !== u.active;
                const isSelf = u.uid === currentUser.uid;

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
                        <span className={`text-xs font-semibold ${ROLE_META[u.role].textClass}`}>
                          {ROLE_META[u.role].label}
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
                              เปิดใช้งาน
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4" />
                              ระงับสิทธิ์
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`text-xs font-medium ${
                            u.active ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {u.active ? 'เปิดใช้งาน' : 'ระงับสิทธิ์'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={!isDirty || savingUid === u.uid}
                          onClick={() => handleSaveUser(u)}
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
            ตารางกำหนดสิทธิ์การเข้าถึงตามบทบาท (RBAC Policy Matrix)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/[0.08] text-xs font-semibold text-[#e3beb3]">
                <th className="py-3 px-4">ขอบเขตสิทธิ์การทำงาน</th>
                <th className="py-3 px-4">ผู้ดูแลระบบสูงสุด</th>
                <th className="py-3 px-4">ผู้บริหาร</th>
                <th className="py-3 px-4">ผู้จัดการฝ่ายขาย</th>
                <th className="py-3 px-4">แอดมินออฟฟิศ</th>
                <th className="py-3 px-4">ผู้แทนขาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-xs">
              {permissionMatrix.map((row) => (
                <tr key={row.capability}>
                  <td className="py-3 px-4 font-medium text-white">{row.capability}</td>
                  <td className="py-3 px-4 text-[#ffb59d] font-medium">{row.admin}</td>
                  <td className="py-3 px-4 text-[#ffcf90]">{row.executive}</td>
                  <td className="py-3 px-4 text-[#dfe2ef]">{row.manager}</td>
                  <td className="py-3 px-4 text-sky-300 font-medium">{row.office_admin}</td>
                  <td className="py-3 px-4 text-[#aa897f]">{row.sales}</td>
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
                    <span className="text-[#aa897f]" aria-hidden="true">·</span>
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
              <span>โรงพยาบาลใน CRM: <strong className="text-white">{hospitals.length}</strong></span>
              <span>ดีลการขาย: <strong className="text-white">{deals.length}</strong></span>
              <span>เคสออฟฟิศ: <strong className="text-white">{officeCases.length}</strong></span>
              <span>แจ้งเตือน: <strong className="text-white">{notifications.length}</strong></span>
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
                  ระบบจะลบข้อมูลในฐานข้อมูลทั้งหมด ได้แก่ โรงพยาบาล {hospitals.length} แห่ง, ดีล {deals.length} รายการ, เคสออฟฟิศ {officeCases.length} รายการ และแจ้งเตือน {notifications.length} รายการ โดยไม่สามารถกู้คืนได้ (บัญชีผู้ใช้จะคงอยู่ครบ)
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
