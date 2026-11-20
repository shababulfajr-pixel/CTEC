import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  BarChart3,
  Bell,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Search,
  Shield,
  X,
} from 'lucide-react';
import { AdminPanelView } from './components/AdminPanelView';
import { CustomersDealsView } from './components/CustomersDealsView';
import { DashboardView } from './components/DashboardView';
import { HospitalMapView } from './components/HospitalMapView';
import { LoginView } from './components/LoginView';
import { NotificationsPanel } from './components/NotificationsPanel';
import { OfficeAdminCasesView } from './components/OfficeAdminCasesView';
import { PdfReportTemplate } from './components/PdfReportTemplate';
import { auth, db, getFriendlyFirestoreError, OperationType } from './firebase';
import {
  ensureUserProfile,
  logAuditEvent,
  publishNotification,
} from './services/crmService';
import {
  formatCurrency,
  getDensityLevel,
  getTodayDateKey,
  ORG_ID,
  ROLE_META,
  type ActiveTab,
  type AuditLogItem,
  type Deal,
  type Hospital,
  type NotificationItem,
  type OfficeCase,
  type UserProfile,
} from './types';
import {
  exportToExcel,
  exportToPdf,
  type ExecutiveSummaryMetrics,
} from './utils/exportReports';

function sanitizeMapsKey(raw?: string): string {
  const cleaned = (raw || '').trim();
  return cleaned && cleaned !== 'MY_GOOGLE_MAPS_API_KEY' ? cleaned : '';
}

function getInitialGoogleMapsApiKey(): string {
  const runtimeKey =
    typeof window !== 'undefined'
      ? sanitizeMapsKey(window.__APP_RUNTIME_CONFIG__?.googleMapsApiKey)
      : '';
  if (runtimeKey) return runtimeKey;

  const viteKey = sanitizeMapsKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  if (viteKey) return viteKey;

  const definedKey = sanitizeMapsKey(
    typeof __GOOGLE_MAPS_API_KEY__ !== 'undefined' ? __GOOGLE_MAPS_API_KEY__ : ''
  );
  return definedKey;
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [focusedHospitalId, setFocusedHospitalId] = useState<string | null>(null);
  const [preselectedHospitalForDeal, setPreselectedHospitalForDeal] =
    useState<Hospital | null>(null);
  const [openAddHospitalSignal, setOpenAddHospitalSignal] = useState(0);
  const [openAddDealSignal, setOpenAddDealSignal] = useState(0);
  const [openAddOfficeCaseSignal, setOpenAddOfficeCaseSignal] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>(getInitialGoogleMapsApiKey);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [mapsErrorCode, setMapsErrorCode] = useState<string | null>(null);

  // Firestore synced data
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [officeCases, setOfficeCases] = useState<OfficeCase[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const pdfReportRef = useRef<HTMLDivElement | null>(null);
  const lastSeenNotifIdRef = useRef<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Fallback fetch of runtime Maps key (supports Cloud Run / Shared App runtime env injection)
  useEffect(() => {
    if (googleMapsApiKey) return;
    let cancelled = false;
    fetch('/api/runtime-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { googleMapsApiKey?: string } | null) => {
        if (cancelled || !data) return;
        const key = sanitizeMapsKey(data.googleMapsApiKey);
        if (key) setGoogleMapsApiKey(key);
      })
      .catch(() => {
        // Ignore when running purely static preview without Express server
      });
    return () => {
      cancelled = true;
    };
  }, [googleMapsApiKey]);

  // Listen to Google Maps Demo Key quota & error events
  useEffect(() => {
    const quotaHandler = () => setMapsQuotaExceeded(true);
    const errorHandler = (ev: Event) => {
      const detail = (ev as CustomEvent<string>).detail;
      if (detail) setMapsErrorCode(detail);
    };
    window.addEventListener('gmp-quota-exceeded', quotaHandler);
    window.addEventListener('gmp-map-error', errorHandler);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', quotaHandler);
      window.removeEventListener('gmp-map-error', errorHandler);
    };
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setProfileLoading(true);
        try {
          const profile = await ensureUserProfile(user);
          setCurrentUser(profile);
        } catch (err) {
          console.error('Failed to load profile:', err);
          setCurrentUser(null);
        } finally {
          setProfileLoading(false);
          setAuthReady(true);
        }
      } else {
        setCurrentUser(null);
        setUsers([]);
        setHospitals([]);
        setDeals([]);
        setOfficeCases([]);
        setNotifications([]);
        setAuditLogs([]);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Auto-redirect away from restricted tabs if user's role changes in real time
  useEffect(() => {
    if (!currentUser) return;
    const isAdminOrMgr =
      currentUser.role === 'admin' ||
      currentUser.role === 'executive' ||
      currentUser.role === 'manager';
    const canOffice = isAdminOrMgr || currentUser.role === 'office_admin';

    if (activeTab === 'admin' && !isAdminOrMgr) {
      setActiveTab('dashboard');
    } else if (activeTab === 'office_cases' && !canOffice) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser]);

  // Real-time Firestore listeners (strictly gated by authenticated, active user + profile)
  useEffect(() => {
    if (!authReady || !firebaseUser || !currentUser || !currentUser.active) return;

    const handleListenerError = (err: unknown, path: string) => {
      console.error(`Firestore listener error (${OperationType.LIST} ${path}):`, err);
      showToast(getFriendlyFirestoreError(err, `ไม่สามารถซิงก์ข้อมูล (${path}) ได้ในขณะนี้`));
    };

    const isManagerOrAbove =
      currentUser.role === 'admin' ||
      currentUser.role === 'executive' ||
      currentUser.role === 'manager';

    // 1. Users list & live current user role sync
    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('orgId', '==', ORG_ID)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<UserProfile, 'id'>) }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'th'));
        setUsers(list);
        const me = list.find((u) => u.uid === firebaseUser.uid);
        if (me) setCurrentUser(me);
      },
      (err) => handleListenerError(err, 'users')
    );

    // 2. Hospitals list
    const unsubHospitals = onSnapshot(
      query(collection(db, 'hospitals'), where('orgId', '==', ORG_ID)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Hospital, 'id'>) }))
          .sort((a, b) => b.caseCount - a.caseCount);
        setHospitals(list);
      },
      (err) => handleListenerError(err, 'hospitals')
    );

    // 3. Deals list (strict RBAC: managers/executives/admins see all org deals, sales reps see own deals)
    const dealsQuery = isManagerOrAbove
      ? query(collection(db, 'deals'), where('orgId', '==', ORG_ID))
      : query(collection(db, 'deals'), where('ownerId', '==', firebaseUser.uid));

    const unsubDeals = onSnapshot(
      dealsQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Deal, 'id'>) }))
          .sort((a, b) => {
            const ta = a.updatedAt?.toMillis?.() ?? 0;
            const tb = b.updatedAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
        setDeals(list);
      },
      (err) => handleListenerError(err, 'deals')
    );

    // 4. Real-time Notifications feed
    const unsubNotifications = onSnapshot(
      query(collection(db, 'notifications'), where('orgId', '==', ORG_ID)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
        setNotifications(list);

        if (list.length > 0) {
          const newest = list[0];
          if (lastSeenNotifIdRef.current && lastSeenNotifIdRef.current !== newest.id) {
            setUnreadCount((c) => c + 1);
            showToast(`แจ้งเตือนใหม่: ${newest.title}`);
          }
          lastSeenNotifIdRef.current = newest.id;
        }
      },
      (err) => handleListenerError(err, 'notifications')
    );

    const canAccessOfficeCases =
      isManagerOrAbove || currentUser.role === 'office_admin';

    // 5. Audit Logs (Managers/Executives/Admins only)
    let unsubAudit: (() => void) | null = null;
    if (isManagerOrAbove) {
      unsubAudit = onSnapshot(
        query(collection(db, 'auditLogs'), where('orgId', '==', ORG_ID)),
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLogItem, 'id'>) }))
            .sort((a, b) => {
              const ta = a.createdAt?.toMillis?.() ?? 0;
              const tb = b.createdAt?.toMillis?.() ?? 0;
              return tb - ta;
            });
          setAuditLogs(list);
        },
        (err) => handleListenerError(err, 'auditLogs')
      );
    } else {
      setAuditLogs([]);
    }

    // 6. Office Cases Ledger (Authorized Office Admin, Manager, Executive, Admin only — contains patient PII)
    let unsubOfficeCases: (() => void) | null = null;
    if (canAccessOfficeCases) {
      unsubOfficeCases = onSnapshot(
        query(collection(db, 'officeCases'), where('orgId', '==', ORG_ID)),
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<OfficeCase, 'id'>) }))
            .sort((a, b) => (b.salesSeqNo || 0) - (a.salesSeqNo || 0));
          setOfficeCases(list);
        },
        (err) => handleListenerError(err, 'officeCases')
      );
    } else {
      setOfficeCases([]);
    }

    return () => {
      unsubUsers();
      unsubHospitals();
      unsubDeals();
      unsubNotifications();
      if (unsubAudit) unsubAudit();
      if (unsubOfficeCases) unsubOfficeCases();
    };
  }, [authReady, firebaseUser, currentUser?.uid, currentUser?.role, currentUser?.active, showToast]);

  // Compute Executive & Daily Summary Metrics in Real Time
  const summary: ExecutiveSummaryMetrics = useMemo(() => {
    const todayKey = getTodayDateKey();
    const wonDeals = deals.filter((d) => d.stage === 'won');
    const lostDeals = deals.filter((d) => d.stage === 'lost');
    const activeDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');

    const closedWonRevenue = wonDeals.reduce((sum, d) => sum + d.amount, 0);
    const activePipelineValue = activeDeals.reduce((sum, d) => sum + d.amount, 0);
    const totalCases = hospitals.reduce((sum, h) => sum + h.caseCount, 0);
    const closedTotal = wonDeals.length + lostDeals.length;
    const winRate = closedTotal > 0 ? (wonDeals.length / closedTotal) * 100 : 0;

    const todayDeals = deals.filter((d) => d.dateKey === todayKey);
    const todayWonRevenue = todayDeals
      .filter((d) => d.stage === 'won')
      .reduce((sum, d) => sum + d.amount, 0);
    const todayNewDeals = todayDeals.length;
    const todayNewCases = todayDeals.reduce((sum, d) => sum + d.caseVolume, 0);
    const highDensityHospitalsCount = hospitals.filter(
      (h) => getDensityLevel(h.caseCount) === 'high'
    ).length;

    return {
      closedWonRevenue,
      activePipelineValue,
      totalCases,
      winRate,
      todayWonRevenue,
      todayNewDeals,
      todayNewCases,
      highDensityHospitalsCount,
    };
  }, [deals, hospitals]);

  const handleBroadcastDailySummary = useCallback(async () => {
    if (!currentUser) return;
    const topHosp = hospitals[0];
    const message = `สรุปยอดขายวันนี้ (${getTodayDateKey()}): ปิดการขายสำเร็จ ${formatCurrency(
      summary.todayWonRevenue
    )} · ดีลใหม่ ${summary.todayNewDeals} รายการ · เคสเพิ่ม +${
      summary.todayNewCases
    } เคส · มูลค่าไปป์ไลน์รวม ${formatCurrency(summary.activePipelineValue)}${
      topHosp ? ` · เคสหนาแน่นสูงสุด: ${topHosp.name} (${topHosp.caseCount} เคส)` : ''
    }`;

    try {
      await publishNotification({
        type: 'daily_summary',
        title: `สรุปยอดขายประจำวัน · ${formatCurrency(summary.todayWonRevenue)}`,
        message,
        amount: summary.todayWonRevenue,
        caseCount: summary.todayNewCases,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName,
      });

      await logAuditEvent({
        action: 'ประกาศแจ้งเตือนสรุปยอดขายรายวัน',
        targetType: 'notification',
        targetId: getTodayDateKey(),
        targetLabel: `สรุปยอดขาย ${getTodayDateKey()}`,
        actorId: currentUser.uid,
        actorName: currentUser.displayName,
        details: message.slice(0, 380),
      });

      showToast('ส่งแจ้งเตือนสรุปยอดขายประจำวันแบบเรียลไทม์เรียบร้อยแล้ว');
    } catch (err) {
      showToast(getFriendlyFirestoreError(err, 'ไม่สามารถส่งแจ้งเตือนสรุปยอดได้ในขณะนี้'));
    }
  }, [currentUser, hospitals, summary, showToast]);

  const handleExportExcel = useCallback(() => {
    if (!currentUser) return;
    exportToExcel(hospitals, deals, summary, currentUser.displayName);
    void logAuditEvent({
      action: 'ส่งออกรายงาน Excel',
      targetType: 'report',
      targetId: `xlsx-${getTodayDateKey()}`,
      targetLabel: `CTEC-MedSales-CRM-Report-${getTodayDateKey()}.xlsx`,
      actorId: currentUser.uid,
      actorName: currentUser.displayName,
      details: `โรงพยาบาล ${hospitals.length} แห่ง · ดีล ${deals.length} รายการ`,
    });
    showToast('ดาวน์โหลดรายงาน Excel (.xlsx) เรียบร้อยแล้ว');
  }, [currentUser, hospitals, deals, summary, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (!currentUser || !pdfReportRef.current) return;
    setExportingPdf(true);
    try {
      await exportToPdf(pdfReportRef.current);
      void logAuditEvent({
        action: 'ส่งออกรายงาน PDF',
        targetType: 'report',
        targetId: `pdf-${getTodayDateKey()}`,
        targetLabel: `CTEC-MedSales-CRM-Report-${getTodayDateKey()}.pdf`,
        actorId: currentUser.uid,
        actorName: currentUser.displayName,
        details: 'รายงานสรุปผู้บริหารและตารางความหนาแน่นโรงพยาบาล',
      });
      showToast('ดาวน์โหลดรายงาน PDF (.pdf) เรียบร้อยแล้ว');
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast('ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setExportingPdf(false);
    }
  }, [currentUser, showToast]);

  const handleJumpToMap = useCallback((hospitalId?: string) => {
    setFocusedHospitalId(hospitalId || null);
    setActiveTab('map');
  }, []);

  const handleSelectAddDealFromMap = useCallback((hospital: Hospital) => {
    setPreselectedHospitalForDeal(hospital);
    setActiveTab('pipeline');
  }, []);

  const handleSelectAddHospital = useCallback(() => {
    setActiveTab('pipeline');
    setOpenAddHospitalSignal((n) => n + 1);
  }, []);

  const handleOpenNewDeal = useCallback(() => {
    setActiveTab('pipeline');
    setOpenAddDealSignal((n) => n + 1);
  }, []);

  const handleTopBarQuickCreate = useCallback(() => {
    const canWriteOffice =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'manager' ||
      currentUser?.role === 'office_admin';

    if (
      canWriteOffice &&
      (activeTab === 'office_cases' || currentUser?.role === 'office_admin')
    ) {
      setActiveTab('office_cases');
      setOpenAddOfficeCaseSignal((n) => n + 1);
      return;
    }

    setActiveTab('pipeline');
    setOpenAddDealSignal((n) => n + 1);
  }, [activeTab, currentUser?.role]);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0f131c] flex items-center justify-center relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#ff5e1e]/15 blur-[120px]"
        />
        <div className="apple-glass px-7 py-5 rounded-2xl flex flex-col items-center gap-3.5 text-sm text-[#dfe2ef]">
          <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-[0_8px_24px_rgba(255,94,30,0.3)] ring-1 ring-white/25">
            <img
              src="/assets/aistudio/IMG_0007_bea31e22.jpeg"
              alt="CTEC Customized Technologies Co., Ltd."
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-[#ff5e1e]" />
            <span>กำลังตรวจสอบสิทธิ์และเชื่อมต่อฐานข้อมูล CTEC...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !currentUser) {
    return <LoginView />;
  }

  if (!currentUser.active) {
    return (
      <div className="min-h-screen bg-[#0f131c] flex items-center justify-center p-6">
        <div className="max-w-md w-full apple-glass rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-[0_6px_18px_rgba(255,94,30,0.28)] ring-1 ring-white/20">
            <img
              src="/assets/aistudio/IMG_0007_bea31e22.jpeg"
              alt="CTEC Customized Technologies Co., Ltd."
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-lg font-bold text-white">บัญชีถูกระงับสิทธิ์การใช้งาน</h1>
          <p className="text-sm text-[#e3beb3]/80">
            กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานบัญชีของคุณอีกครั้ง
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="orange-cta px-5 py-2.5 text-sm font-semibold rounded-xl cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  const canAccessAdmin =
    currentUser.role === 'admin' ||
    currentUser.role === 'executive' ||
    currentUser.role === 'manager';

  const canAccessOfficeCases =
    canAccessAdmin || currentUser.role === 'office_admin';

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'ภาพรวมผู้บริหาร', shortLabel: 'ภาพรวม', icon: LayoutDashboard },
    ...(canAccessOfficeCases
      ? [
          {
            id: 'office_cases' as ActiveTab,
            label: 'กรอกข้อมูลเคส (ออฟฟิศ)',
            shortLabel: 'ออฟฟิศ',
            icon: ClipboardList,
          },
        ]
      : []),
    { id: 'map', label: 'แผนที่โรงพยาบาล', shortLabel: 'แผนที่', icon: MapPin },
    { id: 'pipeline', label: 'ลูกค้าและเคสการขาย', shortLabel: 'การขาย', icon: Briefcase },
    { id: 'analytics', label: 'วิเคราะห์เชิงลึก', shortLabel: 'กราฟ', icon: BarChart3 },
    ...(canAccessAdmin
      ? [{ id: 'admin' as ActiveTab, label: 'แอดมินและสิทธิ์', shortLabel: 'แอดมิน', icon: Shield }]
      : []),
  ];

  const userInitial = (currentUser.displayName || 'C').trim().charAt(0).toUpperCase();

  const workspaceContent = (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ef] flex flex-col lg:flex-row relative overflow-x-clip">
      {/* Subtle Apple-Glass Ambient Burnt-Orange & Amber Atmospheric Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 left-1/4 w-[520px] h-[520px] rounded-full bg-[#ff5e1e]/[0.09] blur-[140px] z-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 w-[440px] h-[440px] rounded-full bg-[#ffaa00]/[0.07] blur-[130px] z-0"
      />

      {/* Google Maps Demo Key Quota Banner (Section 8 Case A) */}
      {mapsQuotaExceeded && (
        <div className="bg-amber-950/95 backdrop-blur-md border-b border-amber-500/35 text-amber-200 px-4 py-2.5 text-xs md:text-sm text-center fixed top-0 inset-x-0 z-50 shadow-lg">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-[#ffcf90] hover:text-white"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Desktop Left Sidebar (260px Apple Frosted Glass) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 apple-glass-bar border-r border-white/[0.07] z-30">
        <div className="h-16 px-4 flex items-center gap-3 border-b border-white/[0.07]">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_4px_14px_rgba(255,94,30,0.28)] ring-1 ring-white/20">
            <img
              src="/assets/aistudio/IMG_0007_bea31e22.jpeg"
              alt="CTEC Customized Technologies Co., Ltd."
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-white truncate">
              CTEC Devices CRM
            </div>
            <div className="text-[10px] font-mono text-[#e3beb3]/65 truncate">
              sale-representative-ctec
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#262a34]/90 text-[#ffb59d] font-semibold ring-1 ring-[#ffb59d]/30 shadow-sm'
                    : 'text-[#e3beb3]/70 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-[#ff5e1e]' : 'text-[#aa897f]'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.07] space-y-3">
          <div className="flex items-center gap-2.5 px-1.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff5e1e]/30 to-[#ffaa00]/20 border border-[#ffb59d]/25 text-[#ffcf90] text-xs font-bold flex items-center justify-center shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser.displayName}
              </div>
              <div className={`text-[11px] font-medium ${ROLE_META[currentUser.role].textClass}`}>
                {ROLE_META[currentUser.role].label}
              </div>
              <div className="text-[10px] text-[#aa897f] truncate">
                {currentUser.territory}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full min-h-[38px] px-3 py-2 text-xs font-medium text-[#e3beb3]/75 hover:text-rose-400 hover:bg-rose-500/10 border border-white/[0.06] rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 relative z-10">
        {/* Top Bar (Compact 56px on mobile to honor <=15% mobile sticky cap) */}
        <header className="sticky top-0 z-20 h-14 lg:h-16 apple-glass-bar border-b border-white/[0.07] px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="lg:hidden flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ring-1 ring-white/20">
                <img
                  src="/assets/aistudio/IMG_0007_bea31e22.jpeg"
                  alt="CTEC Customized Technologies Co., Ltd."
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                CTEC CRM
              </span>
            </div>

            {/* Global Search (Desktop & Tablet) */}
            <div className="hidden md:block relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#aa897f] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && globalSearch.trim()) {
                    setActiveTab('pipeline');
                  }
                }}
                placeholder="ค้นหาเคสผ่าตัด, โรงพยาบาล, หรือผู้แทนขาย..."
                className="glass-input w-full h-9 pl-10 pr-8 text-xs rounded-xl"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  aria-label="ล้างคำค้นหา"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#aa897f] hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTopBarQuickCreate}
              className="orange-cta min-h-[38px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {activeTab === 'office_cases' || currentUser.role === 'office_admin'
                  ? 'รับเคสออฟฟิศใหม่'
                  : 'บันทึกเคสใหม่'}
              </span>
              <span className="sm:hidden">เคสใหม่</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(true);
                setUnreadCount(0);
              }}
              aria-label="เปิดแจ้งเตือนสรุปยอดขายเรียลไทม์"
              className="relative min-h-[38px] px-3 py-2 rounded-xl text-xs font-semibold text-[#dfe2ef] bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.09] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#ffcf90]" />
              <span className="hidden xl:inline">สรุปยอดวันนี้</span>
              {unreadCount > 0 && (
                <span className="font-mono tabular-nums text-[11px] font-bold text-[#ff5e1e]">
                  ({unreadCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="ออกจากระบบ"
              className="lg:hidden min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#e3beb3]/75 hover:text-rose-400 bg-white/[0.05] border border-white/[0.08] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-10 max-w-[1440px] w-full mx-auto">
          {(activeTab === 'dashboard' || activeTab === 'analytics') && (
            <DashboardView
              mode={activeTab}
              currentUser={currentUser}
              hospitals={hospitals}
              deals={deals}
              notifications={notifications}
              summary={summary}
              exportingPdf={exportingPdf}
              onExportExcel={handleExportExcel}
              onExportPdf={() => void handleExportPdf()}
              onBroadcastDailySummary={handleBroadcastDailySummary}
              onJumpToMap={handleJumpToMap}
              onOpenNewDeal={handleOpenNewDeal}
              onNotifyToast={showToast}
            />
          )}

          {activeTab === 'office_cases' && canAccessOfficeCases && (
            <OfficeAdminCasesView
              currentUser={currentUser}
              officeCases={officeCases}
              hospitals={hospitals}
              globalSearch={globalSearch}
              openAddCaseSignal={openAddOfficeCaseSignal}
              onConsumedAddCaseSignal={() => setOpenAddOfficeCaseSignal(0)}
              onNotifyToast={showToast}
            />
          )}

          {activeTab === 'map' && (
            <HospitalMapView
              hospitals={hospitals}
              currentUser={currentUser}
              focusedHospitalId={focusedHospitalId}
              hasMapsKey={Boolean(googleMapsApiKey)}
              mapsErrorCode={mapsErrorCode}
              onSelectAddDeal={handleSelectAddDealFromMap}
              onSelectAddHospital={handleSelectAddHospital}
              onNotifyToast={showToast}
            />
          )}

          {activeTab === 'pipeline' && (
            <CustomersDealsView
              currentUser={currentUser}
              hospitals={hospitals}
              deals={deals}
              hasMapsKey={Boolean(googleMapsApiKey)}
              globalSearch={globalSearch}
              preselectedHospitalForDeal={preselectedHospitalForDeal}
              openAddHospitalSignal={openAddHospitalSignal}
              openAddDealSignal={openAddDealSignal}
              onConsumedAddHospitalSignal={() => setOpenAddHospitalSignal(0)}
              onConsumedAddDealSignal={() => setOpenAddDealSignal(0)}
              onClearPreselectedHospital={() => setPreselectedHospitalForDeal(null)}
              onJumpToMap={handleJumpToMap}
              onNotifyToast={showToast}
            />
          )}

          {activeTab === 'admin' && canAccessAdmin && (
            <AdminPanelView
              currentUser={currentUser}
              users={users}
              auditLogs={auditLogs}
              onNotifyToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Compact 56px, thumb-friendly 44px+ targets) */}
      <nav
        aria-label="เมนูหลักมือถือ"
        className="lg:hidden fixed bottom-0 inset-x-0 h-14 apple-glass-bar border-t border-white/[0.08] z-30 flex items-center justify-around px-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                active ? 'text-[#ffb59d] font-semibold' : 'text-[#aa897f]'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#ff5e1e]' : ''}`} />
              <span className="truncate">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Real-time Notifications & Daily Summary Drawer */}
      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        summary={summary}
        currentUser={currentUser}
        onBroadcastDailySummary={handleBroadcastDailySummary}
      />

      {/* Offscreen A4 Thai PDF Export Template */}
      <PdfReportTemplate
        reportRef={pdfReportRef}
        hospitals={hospitals}
        deals={deals}
        summary={summary}
        exportedBy={currentUser.displayName}
      />

      {/* Live Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-16 lg:bottom-6 right-4 z-50 max-w-sm apple-glass border-[#ffb59d]/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs">
          <span className="leading-snug">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="ปิดการแจ้งเตือน"
            className="text-[#aa897f] hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (googleMapsApiKey) {
    return (
      <APIProvider
        apiKey={googleMapsApiKey}
        language="th"
        region="TH"
        libraries={['places', 'marker']}
        onError={(err) => {
          console.error('Google Maps APIProvider error:', err);
          setMapsErrorCode('ScriptLoadError');
          showToast('ไม่สามารถโหลด Google Maps ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือโควตา API');
        }}
      >
        {workspaceContent}
      </APIProvider>
    );
  }

  return workspaceContent;
}
