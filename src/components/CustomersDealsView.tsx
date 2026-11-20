import React, { useMemo, useState } from 'react';
import {
  Building2,
  Edit3,
  Lock,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  DEAL_STAGE_META,
  DEAL_STAGE_ORDER,
  formatCurrency,
  getDensityMeta,
  getDensityTierLabel,
  HOSPITAL_STATUS_LABEL,
  HOSPITAL_TYPES,
  PRODUCT_CATEGORIES,
  REGIONS,
  type Deal,
  type DealStage,
  type Hospital,
  type HospitalStatus,
  type HospitalType,
  type ProductCategory,
  type RegionName,
  type UserProfile,
} from '../types';
import { getFriendlyFirestoreError } from '../firebase';
import {
  createDeal,
  createHospital,
  deleteDeal,
  deleteHospital,
  updateDeal,
  updateHospital,
} from '../services/crmService';
import {
  HospitalPlaceAutocomplete,
  type SelectedHospitalPlace,
} from './HospitalPlaceAutocomplete';

interface CustomersDealsViewProps {
  currentUser: UserProfile;
  hospitals: Hospital[];
  deals: Deal[];
  hasMapsKey: boolean;
  globalSearch?: string;
  preselectedHospitalForDeal: Hospital | null;
  openAddHospitalSignal: number;
  openAddDealSignal: number;
  onConsumedAddHospitalSignal?: () => void;
  onConsumedAddDealSignal?: () => void;
  onClearPreselectedHospital: () => void;
  onJumpToMap: (hospitalId: string) => void;
  onNotifyToast: (msg: string) => void;
}

export const CustomersDealsView: React.FC<CustomersDealsViewProps> = ({
  currentUser,
  hospitals,
  deals,
  hasMapsKey,
  globalSearch = '',
  preselectedHospitalForDeal,
  openAddHospitalSignal,
  openAddDealSignal,
  onConsumedAddHospitalSignal,
  onConsumedAddDealSignal,
  onClearPreselectedHospital,
  onJumpToMap,
  onNotifyToast,
}) => {
  const [subTab, setSubTab] = useState<'deals' | 'hospitals'>('deals');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | DealStage>('all');
  const [regionFilter, setRegionFilter] = useState<'all' | RegionName>('all');

  // Modals
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingDealId, setUpdatingDealId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { type: 'deal'; item: Deal }
    | { type: 'hospital'; item: Hospital }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // Hospital form state
  const [hospForm, setHospForm] = useState({
    name: '',
    placeId: '',
    address: '',
    province: 'กรุงเทพมหานคร',
    region: 'กรุงเทพและปริมณฑล' as RegionName,
    lat: 13.7563,
    lng: 100.5018,
    hospitalType: 'โรงเรียนแพทย์' as HospitalType,
    caseCount: 0,
    totalRevenue: 0,
    status: 'prospect' as HospitalStatus,
    contactName: '',
    contactRole: 'ฝ่ายจัดซื้อเครื่องมือแพทย์',
    contactPhone: '',
    notes: '',
  });

  // Deal form state
  const [dealForm, setDealForm] = useState({
    title: '',
    hospitalId: '',
    productCategory: PRODUCT_CATEGORIES[0] as ProductCategory,
    amount: 0,
    caseVolume: 5,
    stage: 'lead' as DealStage,
    probability: 15,
    expectedCloseDate: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
    notes: '',
  });

  // Sync external signals and consume immediately so revisiting the tab does not re-open modals
  React.useEffect(() => {
    if (openAddHospitalSignal > 0) {
      openNewHospitalModal();
      onConsumedAddHospitalSignal?.();
    }
  }, [openAddHospitalSignal]);

  React.useEffect(() => {
    if (openAddDealSignal > 0) {
      openNewDealModal(preselectedHospitalForDeal || undefined);
      onConsumedAddDealSignal?.();
    }
  }, [openAddDealSignal]);

  React.useEffect(() => {
    if (preselectedHospitalForDeal) {
      openNewDealModal(preselectedHospitalForDeal);
      onClearPreselectedHospital();
    }
  }, [preselectedHospitalForDeal]);

  const openNewHospitalModal = () => {
    setEditingHospital(null);
    setHospForm({
      name: '',
      placeId: '',
      address: '',
      province: 'กรุงเทพมหานคร',
      region: 'กรุงเทพและปริมณฑล',
      lat: 13.7563,
      lng: 100.5018,
      hospitalType: 'โรงเรียนแพทย์',
      caseCount: 0,
      totalRevenue: 0,
      status: 'prospect',
      contactName: '',
      contactRole: 'ฝ่ายจัดซื้อเครื่องมือแพทย์',
      contactPhone: '',
      notes: '',
    });
    setShowHospitalModal(true);
  };

  const openEditHospitalModal = (h: Hospital) => {
    setEditingHospital(h);
    setHospForm({
      name: h.name,
      placeId: h.placeId,
      address: h.address,
      province: h.province,
      region: h.region,
      lat: h.lat,
      lng: h.lng,
      hospitalType: h.hospitalType,
      caseCount: h.caseCount,
      totalRevenue: h.totalRevenue,
      status: h.status,
      contactName: h.contactName,
      contactRole: h.contactRole,
      contactPhone: h.contactPhone,
      notes: h.notes,
    });
    setShowHospitalModal(true);
  };

  const openNewDealModal = (hospital?: Hospital) => {
    setEditingDeal(null);
    const defaultHosp = hospital || hospitals[0];
    setDealForm({
      title: '',
      hospitalId: defaultHosp?.id || '',
      productCategory: PRODUCT_CATEGORIES[0],
      amount: 350000,
      caseVolume: 10,
      stage: 'lead',
      probability: 15,
      expectedCloseDate: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
      notes: '',
    });
    setShowDealModal(true);
  };

  const openEditDealModal = (d: Deal) => {
    setEditingDeal(d);
    setDealForm({
      title: d.title,
      hospitalId: d.hospitalId,
      productCategory: d.productCategory,
      amount: d.amount,
      caseVolume: d.caseVolume,
      stage: d.stage,
      probability: d.probability,
      expectedCloseDate: d.expectedCloseDate,
      notes: d.notes,
    });
    setShowDealModal(true);
  };

  const handlePlaceAutofill = (place: SelectedHospitalPlace) => {
    setHospForm((prev) => ({
      ...prev,
      name: place.name,
      placeId: place.placeId,
      address: place.address,
      province: place.province,
      region: place.region,
      lat: place.lat,
      lng: place.lng,
      contactPhone: place.phone || prev.contactPhone,
    }));
  };

  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = hospForm.name.trim();
    if (trimmedName.length < 2) {
      onNotifyToast('กรุณาระบุชื่อโรงพยาบาลอย่างน้อย 2 ตัวอักษร');
      return;
    }

    const safeLat =
      Number.isFinite(hospForm.lat) && hospForm.lat !== 0 ? hospForm.lat : 13.7563;
    const safeLng =
      Number.isFinite(hospForm.lng) && hospForm.lng !== 0 ? hospForm.lng : 100.5018;

    setSubmitting(true);
    try {
      const payload = {
        ...hospForm,
        name: trimmedName,
        lat: safeLat,
        lng: safeLng,
      };
      if (editingHospital) {
        await updateHospital(
          editingHospital.id,
          {
            ...payload,
            activeDealsCount: editingHospital.activeDealsCount,
          },
          currentUser
        );
        onNotifyToast(`อัปเดตข้อมูล "${trimmedName}" เรียบร้อยแล้ว`);
      } else {
        await createHospital(
          {
            ...payload,
            activeDealsCount: 0,
          },
          currentUser
        );
        onNotifyToast(`เพิ่มโรงพยาบาล "${trimmedName}" เข้าระบบเรียบร้อยแล้ว`);
      }
      setShowHospitalModal(false);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถบันทึกข้อมูลโรงพยาบาลได้'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetHospital = hospitals.find((h) => h.id === dealForm.hospitalId);
    const trimmedTitle = dealForm.title.trim();
    if (!targetHospital) {
      onNotifyToast('กรุณาเลือกโรงพยาบาลลูกค้าก่อนบันทึก');
      return;
    }
    if (trimmedTitle.length < 2) {
      onNotifyToast('กรุณาระบุชื่อรายการขายอย่างน้อย 2 ตัวอักษร');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDeal) {
        await updateDeal(
          editingDeal,
          {
            title: trimmedTitle,
            productCategory: dealForm.productCategory,
            amount: Number(dealForm.amount) || 0,
            caseVolume: Number(dealForm.caseVolume) || 0,
            stage: dealForm.stage,
            probability: Number(dealForm.probability) || 0,
            expectedCloseDate: dealForm.expectedCloseDate,
            notes: dealForm.notes,
          },
          targetHospital,
          currentUser
        );
        onNotifyToast(`อัปเดตดีล "${trimmedTitle}" เรียบร้อยแล้ว`);
      } else {
        await createDeal(
          {
            title: trimmedTitle,
            hospitalId: targetHospital.id,
            hospitalName: targetHospital.name,
            productCategory: dealForm.productCategory,
            amount: Number(dealForm.amount) || 0,
            caseVolume: Number(dealForm.caseVolume) || 0,
            stage: dealForm.stage,
            probability: Number(dealForm.probability) || 0,
            expectedCloseDate: dealForm.expectedCloseDate,
            notes: dealForm.notes,
          },
          targetHospital,
          currentUser
        );
        onNotifyToast(`บันทึกดีล "${trimmedTitle}" เรียบร้อยแล้ว`);
      }
      setShowDealModal(false);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถบันทึกรายการขายได้'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStageChange = async (deal: Deal, nextStage: DealStage) => {
    if (updatingDealId === deal.id) return;
    setUpdatingDealId(deal.id);
    try {
      const hospital = hospitals.find((h) => h.id === deal.hospitalId);
      await updateDeal(
        deal,
        {
          stage: nextStage,
          probability: DEAL_STAGE_META[nextStage].defaultProbability,
        },
        hospital,
        currentUser
      );
      onNotifyToast(
        `เปลี่ยนสถานะ "${deal.title}" เป็น ${DEAL_STAGE_META[nextStage].label}`
      );
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถเปลี่ยนสถานะดีลได้'));
    } finally {
      setUpdatingDealId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      if (pendingDelete.type === 'deal') {
        const hospital = hospitals.find((h) => h.id === pendingDelete.item.hospitalId);
        await deleteDeal(pendingDelete.item, currentUser, hospital);
        onNotifyToast(`ลบดีล "${pendingDelete.item.title}" แล้ว`);
      } else {
        await deleteHospital(pendingDelete.item, currentUser);
        onNotifyToast(`ลบ "${pendingDelete.item.name}" แล้ว`);
      }
      setPendingDelete(null);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถลบรายการนี้ได้'));
    } finally {
      setDeleting(false);
    }
  };

  const effectiveSearch = (search.trim() || globalSearch.trim()).toLowerCase();

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (stageFilter !== 'all' && d.stage !== stageFilter) return false;
      if (!effectiveSearch) return true;
      return (
        d.title.toLowerCase().includes(effectiveSearch) ||
        d.hospitalName.toLowerCase().includes(effectiveSearch) ||
        d.ownerName.toLowerCase().includes(effectiveSearch) ||
        d.productCategory.toLowerCase().includes(effectiveSearch)
      );
    });
  }, [deals, effectiveSearch, stageFilter]);

  const filteredHospitals = useMemo(() => {
    return hospitals
      .filter((h) => {
        if (regionFilter !== 'all' && h.region !== regionFilter) return false;
        if (!effectiveSearch) return true;
        return (
          h.name.toLowerCase().includes(effectiveSearch) ||
          h.province.toLowerCase().includes(effectiveSearch) ||
          h.contactName.toLowerCase().includes(effectiveSearch) ||
          h.ownerName.toLowerCase().includes(effectiveSearch)
        );
      })
      .sort((a, b) => b.caseCount - a.caseCount);
  }, [hospitals, effectiveSearch, regionFilter]);

  const isAdmin = currentUser.role === 'admin';
  const isManagerOrAbove =
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'executive';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            จัดการลูกค้าโรงพยาบาลและติดตามสถานะการขาย
          </h1>
          <p className="text-xs sm:text-sm text-[#e3beb3]/75 mt-1">
            อัปเดตขั้นตอนการขาย ซิงก์ปริมาณเคสผ่าตัดเข้าแผนที่ความหนาแน่น และบันทึกข้อมูลผู้ติดต่อ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewHospitalModal}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#dfe2ef] bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#ffb59d]" />
            เพิ่มโรงพยาบาล
          </button>
          <button
            type="button"
            onClick={() => openNewDealModal()}
            disabled={hospitals.length === 0}
            className="orange-cta min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold disabled:opacity-50 rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มดีล / เคสใหม่
          </button>
        </div>
      </div>

      {/* Sub-navigation & Filters */}
      <div className="apple-glass-subtle rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 bg-[#0a0e17]/80 border border-white/[0.07] rounded-xl self-start">
          <button
            type="button"
            onClick={() => setSubTab('deals')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'deals'
                ? 'bg-[#262a34] text-[#ffb59d] ring-1 ring-[#ffb59d]/30'
                : 'text-[#e3beb3]/70 hover:text-white'
            }`}
          >
            ติดตามสถานะการขาย ({deals.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('hospitals')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'hospitals'
                ? 'bg-[#262a34] text-[#ffb59d] ring-1 ring-[#ffb59d]/30'
                : 'text-[#e3beb3]/70 hover:text-white'
            }`}
          >
            ทะเบียนโรงพยาบาล ({hospitals.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#aa897f] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                subTab === 'deals'
                  ? 'ค้นหาชื่อดีล โรงพยาบาล หรือผู้แทนขาย...'
                  : 'ค้นหาชื่อโรงพยาบาล จังหวัด หรือผู้ติดต่อ...'
              }
              className="glass-input w-full h-9 pl-9 pr-3 text-xs rounded-xl"
            />
          </div>

          {subTab === 'deals' ? (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as 'all' | DealStage)}
              className="glass-input h-9 px-3 text-xs rounded-xl cursor-pointer"
            >
              <option value="all">ทุกสถานะการขาย</option>
              {DEAL_STAGE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {DEAL_STAGE_META[s].label}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as 'all' | RegionName)}
              className="glass-input h-9 px-3 text-xs rounded-xl cursor-pointer"
            >
              <option value="all">ทุกภูมิภาค</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content View: Deals */}
      {subTab === 'deals' && (
        <section className="apple-glass rounded-2xl overflow-hidden">
          {filteredDeals.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="text-sm font-semibold text-white">
                {hospitals.length === 0
                  ? 'กรุณาเพิ่มข้อมูลโรงพยาบาลก่อนสร้างรายการขาย'
                  : 'ยังไม่มีรายการติดตามการขายตามเงื่อนไขที่เลือก'}
              </div>
              <p className="text-xs text-[#e3beb3]/70">
                {hospitals.length === 0
                  ? 'คุณสามารถกดปุ่มเพิ่มโรงพยาบาลด้านบน หรือนำเข้าโรงพยาบาลอ้างอิง CTEC จากแดชบอร์ด/แผนที่'
                  : 'กดปุ่ม "เพิ่มดีล / เคสใหม่" เพื่อเริ่มติดตามโอกาสทางการขายและอัปเดตยอดขายรายวัน'}
              </p>
              <button
                type="button"
                onClick={hospitals.length === 0 ? openNewHospitalModal : () => openNewDealModal()}
                className="orange-cta inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {hospitals.length === 0 ? 'เพิ่มโรงพยาบาลแห่งแรก' : 'สร้างดีลแรก'}
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="divide-y divide-white/[0.06] md:hidden">
                {filteredDeals.map((d) => {
                  const isTerminal = d.stage === 'won' || d.stage === 'lost';
                  const canEdit =
                    isAdmin ||
                    (!isTerminal && (d.ownerId === currentUser.uid || isManagerOrAbove));
                  const stageMeta = DEAL_STAGE_META[d.stage];

                  return (
                    <div key={d.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white leading-snug">
                            {d.title}
                          </div>
                          <div className="text-xs text-[#e3beb3]/70 mt-0.5">
                            {d.hospitalName} · {d.productCategory}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold font-mono tabular-nums text-[#ffcf90]">
                            {formatCurrency(d.amount)}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-[#e3beb3]/70">
                            {d.caseVolume} เคส
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`font-semibold ${stageMeta.textClass}`}>
                            {stageMeta.label}
                          </span>
                          <span className="text-white/25" aria-hidden="true">·</span>
                          <span className="text-[#e3beb3]/75 font-mono tabular-nums">
                            {d.probability}%
                          </span>
                          {isTerminal && !isAdmin && (
                            <span className="inline-flex items-center gap-1 text-[#aa897f]">
                              <Lock className="w-3 h-3" />
                              ล็อกแล้ว
                            </span>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <select
                              value={d.stage}
                              disabled={updatingDealId === d.id}
                              onChange={(e) =>
                                void handleQuickStageChange(d, e.target.value as DealStage)
                              }
                              aria-label="เปลี่ยนสถานะดีล"
                              className="glass-input h-8 px-2 text-xs rounded-lg disabled:opacity-60"
                            >
                              {DEAL_STAGE_ORDER.map((st) => (
                                <option key={st} value={st}>
                                  {DEAL_STAGE_META[st].shortLabel}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => openEditDealModal(d)}
                              aria-label="แก้ไขดีล"
                              className="p-2 text-[#e3beb3]/70 hover:text-[#ffb59d] cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.07] text-[11px] font-semibold uppercase tracking-wider text-[#e3beb3]/70">
                      <th className="py-3.5 px-5">รายการขาย / โรงพยาบาล</th>
                      <th className="py-3.5 px-4">กลุ่มผลิตภัณฑ์ CTEC</th>
                      <th className="py-3.5 px-4 text-right">มูลค่า (บาท)</th>
                      <th className="py-3.5 px-4 text-right">เคส</th>
                      <th className="py-3.5 px-4">สถานะการขาย</th>
                      <th className="py-3.5 px-4">ผู้ดูแล / คาดปิด</th>
                      <th className="py-3.5 px-5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-sm">
                    {filteredDeals.map((d) => {
                      const isTerminal = d.stage === 'won' || d.stage === 'lost';
                      const canEdit =
                        isAdmin ||
                        (!isTerminal && (d.ownerId === currentUser.uid || isManagerOrAbove));
                      const canDelete =
                        isAdmin || (d.ownerId === currentUser.uid && d.stage !== 'won');
                      const stageMeta = DEAL_STAGE_META[d.stage];

                      return (
                        <tr key={d.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-white">{d.title}</div>
                            <button
                              type="button"
                              onClick={() => onJumpToMap(d.hospitalId)}
                              className="text-xs text-[#ffb59d] hover:text-[#ffcf90] mt-0.5 inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <MapPin className="w-3 h-3" />
                              {d.hospitalName}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#e3beb3]/80">
                            {d.productCategory}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#ffcf90]">
                            {formatCurrency(d.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-white">
                            {d.caseVolume}
                          </td>
                          <td className="py-3.5 px-4">
                            {canEdit ? (
                              <select
                                value={d.stage}
                                disabled={updatingDealId === d.id}
                                onChange={(e) =>
                                  void handleQuickStageChange(d, e.target.value as DealStage)
                                }
                                className={`glass-input h-8 px-2.5 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-60 ${stageMeta.textClass}`}
                              >
                                {DEAL_STAGE_ORDER.map((st) => (
                                  <option key={st} value={st}>
                                    {DEAL_STAGE_META[st].label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className={`font-semibold ${stageMeta.textClass}`}>
                                  {stageMeta.label}
                                </span>
                                {isTerminal && <Lock className="w-3 h-3 text-[#aa897f]" />}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#dfe2ef]">
                            <div>{d.ownerName}</div>
                            <div className="text-[#aa897f] font-mono tabular-nums">
                              {d.expectedCloseDate || '-'}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-1">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openEditDealModal(d)}
                                  title="แก้ไขดีล"
                                  className="p-2 rounded-lg text-[#e3beb3]/70 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete({ type: 'deal', item: d })}
                                  title="ลบดีล"
                                  className="p-2 rounded-lg text-[#aa897f] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* Content View: Hospitals */}
      {subTab === 'hospitals' && (
        <section className="apple-glass rounded-2xl overflow-hidden">
          {filteredHospitals.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="text-sm font-semibold text-white">
                ยังไม่มีรายชื่อโรงพยาบาลในระบบ
              </div>
              <p className="text-xs text-[#e3beb3]/70">
                เพิ่มโรงพยาบาลด้วยระบบค้นหาพิกัด Google Maps หรือนำเข้า 5 รพ. อ้างอิง CTEC จากหน้าแผนที่
              </p>
              <button
                type="button"
                onClick={openNewHospitalModal}
                className="orange-cta inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                เพิ่มโรงพยาบาลใหม่
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Hospital Cards */}
              <div className="divide-y divide-white/[0.06] md:hidden">
                {filteredHospitals.map((h) => {
                  const density = getDensityMeta(h.caseCount);
                  const tier = getDensityTierLabel(h.caseCount);
                  const canEdit = isManagerOrAbove || h.ownerId === currentUser.uid;
                  return (
                    <div key={h.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">{h.name}</div>
                          <div className="text-xs text-[#e3beb3]/70 mt-0.5">
                            {h.province || '-'} · {h.region}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className="text-sm font-bold font-mono tabular-nums"
                            style={{ color: density.color }}
                          >
                            {h.caseCount.toLocaleString('th-TH')} เคส
                          </div>
                          <div className={`text-[10px] font-semibold uppercase tracking-wider ${tier.textClass}`}>
                            {tier.label}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                        <span className="font-mono tabular-nums font-semibold text-[#ffcf90]">
                          {formatCurrency(h.totalRevenue)}
                        </span>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onJumpToMap(h.id)}
                            aria-label="ดูบนแผนที่"
                            className="p-2 rounded-lg text-[#e3beb3]/75 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openNewDealModal(h)}
                            aria-label="เพิ่มดีล"
                            className="p-2 rounded-lg text-[#e3beb3]/75 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditHospitalModal(h)}
                              aria-label="แก้ไขโรงพยาบาล"
                              className="p-2 rounded-lg text-[#e3beb3]/75 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.07] text-[11px] font-semibold uppercase tracking-wider text-[#e3beb3]/70">
                      <th className="py-3.5 px-5">ชื่อโรงพยาบาล / ที่ตั้ง</th>
                      <th className="py-3.5 px-4">ประเภท / สถานะ</th>
                      <th className="py-3.5 px-4 text-right">เคสสะสม</th>
                      <th className="py-3.5 px-4 text-right">ยอดขายสะสม</th>
                      <th className="py-3.5 px-4">ผู้ติดต่อ / ผู้แทนขาย</th>
                      <th className="py-3.5 px-5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-sm">
                    {filteredHospitals.map((h) => {
                      const density = getDensityMeta(h.caseCount);
                      const tier = getDensityTierLabel(h.caseCount);
                      const canEdit = isManagerOrAbove || h.ownerId === currentUser.uid;
                      return (
                        <tr key={h.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-white">{h.name}</div>
                            <div className="text-xs text-[#e3beb3]/70 mt-0.5">
                              {h.province || '-'} · {h.region}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="text-[#dfe2ef]">{h.hospitalType}</div>
                            <div className="text-[#aa897f] mt-0.5">
                              {HOSPITAL_STATUS_LABEL[h.status]}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div
                              className="font-bold font-mono tabular-nums"
                              style={{ color: density.color }}
                            >
                              {h.caseCount.toLocaleString('th-TH')} เคส
                            </div>
                            <div className={`text-[10px] font-semibold uppercase tracking-wider ${tier.textClass}`}>
                              {tier.label}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#ffcf90]">
                            {formatCurrency(h.totalRevenue)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#dfe2ef]">
                            <div>{h.contactName || '-'}</div>
                            <div className="text-[#aa897f] font-mono">
                              {h.contactPhone || h.ownerName}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onJumpToMap(h.id)}
                                title="ดูพิกัดบนแผนที่"
                                className="p-2 rounded-lg text-[#e3beb3]/70 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer transition-colors"
                              >
                                <MapPin className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openNewDealModal(h)}
                                title="เพิ่มดีลให้โรงพยาบาลนี้"
                                className="p-2 rounded-lg text-[#e3beb3]/70 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openEditHospitalModal(h)}
                                  title="แก้ไขข้อมูลโรงพยาบาล"
                                  className="p-2 rounded-lg text-[#e3beb3]/70 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete({ type: 'hospital', item: h })}
                                  title="ลบโรงพยาบาล"
                                  className="p-2 rounded-lg text-[#aa897f] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* Modal: Add / Edit Hospital */}
      {showHospitalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="apple-glass rounded-2xl w-full max-w-xl shadow-2xl my-auto overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {editingHospital ? 'แก้ไขข้อมูลโรงพยาบาล' : 'เพิ่มลูกค้าโรงพยาบาลใหม่'}
              </h2>
              <button
                type="button"
                onClick={() => setShowHospitalModal(false)}
                className="p-1.5 rounded-lg text-[#aa897f] hover:text-white hover:bg-white/[0.08] cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHospital} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {hasMapsKey && !editingHospital && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#ffb59d]">
                    ค้นหาโรงพยาบาลจริงจาก Google Maps (ดึงชื่อ ที่อยู่ และพิกัดอัตโนมัติ)
                  </label>
                  <HospitalPlaceAutocomplete onSelect={handlePlaceAutofill} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ชื่อโรงพยาบาล *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={180}
                    value={hospForm.name}
                    onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                    placeholder="ระบุชื่อโรงพยาบาล"
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ประเภทโรงพยาบาล
                  </label>
                  <select
                    value={hospForm.hospitalType}
                    onChange={(e) =>
                      setHospForm({ ...hospForm, hospitalType: e.target.value as HospitalType })
                    }
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  >
                    {HOSPITAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ภูมิภาค
                  </label>
                  <select
                    value={hospForm.region}
                    onChange={(e) =>
                      setHospForm({ ...hospForm, region: e.target.value as RegionName })
                    }
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    จังหวัด
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={hospForm.province}
                    onChange={(e) => setHospForm({ ...hospForm, province: e.target.value })}
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    จำนวนเคสสะสม (แสดงความหนาแน่นบนแผนที่)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={hospForm.caseCount}
                    onChange={(e) =>
                      setHospForm({ ...hospForm, caseCount: Number(e.target.value) })
                    }
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ยอดขายสะสม (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000000000}
                    value={hospForm.totalRevenue}
                    onChange={(e) =>
                      setHospForm({ ...hospForm, totalRevenue: Number(e.target.value) })
                    }
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    สถานะบัญชี
                  </label>
                  <select
                    value={hospForm.status}
                    onChange={(e) =>
                      setHospForm({ ...hospForm, status: e.target.value as HospitalStatus })
                    }
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  >
                    {(Object.keys(HOSPITAL_STATUS_LABEL) as HospitalStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {HOSPITAL_STATUS_LABEL[st]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ละติจูด (Lat)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={hospForm.lat}
                    onChange={(e) => setHospForm({ ...hospForm, lat: Number(e.target.value) })}
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ลองจิจูด (Lng)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={hospForm.lng}
                    onChange={(e) => setHospForm({ ...hospForm, lng: Number(e.target.value) })}
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ผู้ติดต่อ / หัวหน้าแผนก
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={hospForm.contactName}
                    onChange={(e) => setHospForm({ ...hospForm, contactName: e.target.value })}
                    placeholder="เช่น นพ. / พว. / คุณ..."
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={hospForm.contactPhone}
                    onChange={(e) => setHospForm({ ...hospForm, contactPhone: e.target.value })}
                    placeholder="02-xxx-xxxx"
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ที่อยู่
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={hospForm.address}
                    onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })}
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    บันทึกเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={hospForm.notes}
                    onChange={(e) => setHospForm({ ...hospForm, notes: e.target.value })}
                    className="glass-input w-full p-3 text-sm rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHospitalModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#e3beb3] hover:bg-white/[0.08] rounded-xl cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="orange-cta px-5 py-2 text-xs font-semibold disabled:opacity-50 rounded-xl cursor-pointer"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลโรงพยาบาล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Deal */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="apple-glass rounded-2xl w-full max-w-lg shadow-2xl my-auto overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {editingDeal ? 'แก้ไขรายการติดตามการขาย' : 'บันทึกรายการขาย / เคสผ่าตัดใหม่'}
              </h2>
              <button
                type="button"
                onClick={() => setShowDealModal(false)}
                className="p-1.5 rounded-lg text-[#aa897f] hover:text-white hover:bg-white/[0.08] cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="p-5 space-y-4">
              {hospitals.length === 0 && !editingDeal && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3.5 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span>
                    ยังไม่มีรายชื่อโรงพยาบาลในระบบ กรุณาเพิ่มโรงพยาบาลก่อนสร้างรายการขาย
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDealModal(false);
                      openNewHospitalModal();
                    }}
                    className="orange-cta px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
                  >
                    เพิ่มโรงพยาบาลก่อน
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                  โรงพยาบาลลูกค้า *
                </label>
                <select
                  required
                  disabled={Boolean(editingDeal) || hospitals.length === 0}
                  value={dealForm.hospitalId}
                  onChange={(e) => setDealForm({ ...dealForm, hospitalId: e.target.value })}
                  className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-60"
                >
                  <option value="">-- เลือกโรงพยาบาล --</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.province || h.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                  ชื่อรายการขาย / เคสผ่าตัด *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={180}
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  placeholder="เช่น ชุดอุปกรณ์ Neurosurgery Implants ประจำเดือน"
                  className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    กลุ่มผลิตภัณฑ์ CTEC
                  </label>
                  <select
                    value={dealForm.productCategory}
                    onChange={(e) =>
                      setDealForm({
                        ...dealForm,
                        productCategory: e.target.value as ProductCategory,
                      })
                    }
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    มูลค่าการขาย (บาท) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={1000000000}
                    value={dealForm.amount}
                    onChange={(e) =>
                      setDealForm({ ...dealForm, amount: Number(e.target.value) })
                    }
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    จำนวนเคสที่เกี่ยวข้อง *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100000}
                    value={dealForm.caseVolume}
                    onChange={(e) =>
                      setDealForm({ ...dealForm, caseVolume: Number(e.target.value) })
                    }
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    สถานะการขาย
                  </label>
                  <select
                    value={dealForm.stage}
                    onChange={(e) => {
                      const nextStage = e.target.value as DealStage;
                      setDealForm({
                        ...dealForm,
                        stage: nextStage,
                        probability: DEAL_STAGE_META[nextStage].defaultProbability,
                      });
                    }}
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  >
                    {DEAL_STAGE_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {DEAL_STAGE_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    คาดการณ์วันที่ปิดดีล
                  </label>
                  <input
                    type="date"
                    value={dealForm.expectedCloseDate}
                    onChange={(e) =>
                      setDealForm({ ...dealForm, expectedCloseDate: e.target.value })
                    }
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    บันทึกการติดตาม
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={dealForm.notes}
                    onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                    placeholder="รายละเอียดการเข้าพบ ข้อเสนอพิเศษ หรือขั้นตอนถัดไป"
                    className="glass-input w-full p-3 text-sm rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDealModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#e3beb3] hover:bg-white/[0.08] rounded-xl cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting || (hospitals.length === 0 && !editingDeal)}
                  className="orange-cta px-5 py-2 text-xs font-semibold disabled:opacity-50 rounded-xl cursor-pointer"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกรายการขาย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {pendingDelete && (
        <div
          onClick={() => !deleting && setPendingDelete(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="apple-glass rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl border border-rose-500/30"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {pendingDelete.type === 'deal' ? 'ยืนยันการลบรายการขาย' : 'ยืนยันการลบโรงพยาบาล'}
              </h3>
              <p className="text-xs text-[#e3beb3]/80 leading-relaxed">
                คุณต้องการลบ{' '}
                <strong className="text-white">
                  {pendingDelete.type === 'deal'
                    ? pendingDelete.item.title
                    : pendingDelete.item.name}
                </strong>{' '}
                ออกจากระบบใช่หรือไม่?{' '}
                {pendingDelete.type === 'deal'
                  ? 'ยอดเคสและยอดขายของโรงพยาบาลที่เกี่ยวข้องจะถูกปรับลดอัตโนมัติ'
                  : 'การลบนี้ไม่สามารถย้อนกลับได้'}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#e3beb3] hover:bg-white/[0.08] rounded-xl cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50 transition-colors"
              >
                {deleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
