import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
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
  type HospitalCategoryCode,
  type HospitalStatus,
  type HospitalType,
  type OfficeCase,
  type ProductCategory,
  type RegionName,
  type UserProfile,
} from '../types';
import { getFriendlyFirestoreError } from '../firebase';
import {
  createDeal,
  createHospital,
  createHospitalsBatch,
  deleteDeal,
  deleteHospital,
  updateDeal,
  updateHospital,
  type HospitalInput,
} from '../services/crmService';
import {
  matchCatalogHospitalByName,
  normalizeHospitalNameKey,
  THAILAND_HOSPITALS_CATALOG,
} from '../data/thailandHospitalsCatalog';
import {
  HospitalPlaceAutocomplete,
  type SelectedHospitalPlace,
} from './HospitalPlaceAutocomplete';

interface CustomersDealsViewProps {
  currentUser: UserProfile;
  hospitals: Hospital[];
  deals: Deal[];
  officeCases: OfficeCase[];
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

interface UnifiedPartnerHospital {
  /** Stable key: Firestore hospital.id if saved in CRM, or "linked:<catalogId|normKey>" if derived live from officeCases */
  key: string;
  crmHospital?: Hospital;
  savedInCrm: boolean;
  mapTargetId?: string;
  placeId: string;
  name: string;
  address: string;
  province: string;
  region: RegionName;
  lat: number;
  lng: number;
  hospitalType: HospitalType;
  status: HospitalStatus;
  crmCases: number;
  officeCasesCount: number;
  totalCases: number;
  crmRevenue: number;
  officeRevenue: number;
  totalRevenue: number;
  activeDealsCount: number;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  ownerName: string;
  latestDoctor: string;
  latestReceiver: string;
  notes: string;
}

function mapCategoryCodeToHospitalType(code?: HospitalCategoryCode): HospitalType {
  if (code === 2) return 'โรงพยาบาลเอกชน';
  if (code === 3) return 'คลินิกเฉพาะทาง';
  return 'โรงพยาบาลรัฐ';
}

export const CustomersDealsView: React.FC<CustomersDealsViewProps> = ({
  currentUser,
  hospitals,
  deals,
  officeCases,
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
  const [subTab, setSubTab] = useState<'deals' | 'hospitals'>('hospitals');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | DealStage>('all');
  const [regionFilter, setRegionFilter] = useState<'all' | RegionName>('all');
  const [hospitalPage, setHospitalPage] = useState(1);
  const [hospitalPageSize, setHospitalPageSize] = useState<25 | 50 | 100>(50);

  // Modals
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncingPartners, setSyncingPartners] = useState(false);
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

  // Deal form state (hospitalId stores either Firestore hospital.id or UnifiedPartnerHospital.key)
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

  // 1. Aggregate live Office Cases (including Excel imports) grouped by matched catalog ID / normalized name
  const officeHospitalGroups = useMemo(() => {
    interface AggGroup {
      groupKey: string;
      catalogMatch?: (typeof THAILAND_HOSPITALS_CATALOG)[number];
      rawName: string;
      normKey: string;
      count: number;
      revenue: number;
      latestDoctor: string;
      latestDoctorPhone: string;
      latestReceiver: string;
      categoryCode: HospitalCategoryCode;
    }

    const byKey = new Map<string, AggGroup>();

    for (const oc of officeCases) {
      if (oc.workflowStatus === 'cancelled') continue;
      const rawName = (oc.hospitalName || '').trim();
      if (!rawName || rawName === '-' || rawName.length < 2) continue;

      const normKey = normalizeHospitalNameKey(rawName);
      const catalogMatch = matchCatalogHospitalByName(rawName);
      const groupKey = catalogMatch ? `cat:${catalogMatch.id}` : `norm:${normKey || rawName.toLowerCase()}`;
      const rev = Number.isFinite(oc.price) ? Math.max(0, oc.price) : 0;

      const existing = byKey.get(groupKey);
      if (existing) {
        existing.count += 1;
        existing.revenue += rev;
        if (!existing.latestDoctor && oc.doctorName.trim()) {
          existing.latestDoctor = oc.doctorName.trim();
        }
        if (!existing.latestDoctorPhone && oc.doctorPhone.trim()) {
          existing.latestDoctorPhone = oc.doctorPhone.trim();
        }
        if (!existing.latestReceiver && oc.caseReceiver.trim()) {
          existing.latestReceiver = oc.caseReceiver.trim();
        }
      } else {
        byKey.set(groupKey, {
          groupKey,
          catalogMatch,
          rawName,
          normKey,
          count: 1,
          revenue: rev,
          latestDoctor: oc.doctorName.trim(),
          latestDoctorPhone: oc.doctorPhone.trim(),
          latestReceiver: oc.caseReceiver.trim(),
          categoryCode: oc.hospitalCategory || 1,
        });
      }
    }

    return byKey;
  }, [officeCases]);

  // 2. Build unified Partner Hospitals list: Saved CRM Hospitals + Live Linked Office Cases Hospitals (ZERO double-counting)
  const partnerHospitals: UnifiedPartnerHospital[] = useMemo(() => {
    const consumedGroupKeys = new Set<string>();
    const list: UnifiedPartnerHospital[] = [];

    // First: all saved CRM hospitals, enriched with live linked officeCases
    for (const h of hospitals) {
      const catalogMatch =
        THAILAND_HOSPITALS_CATALOG.find((c) => c.id === h.placeId) ||
        matchCatalogHospitalByName(h.name);
      const normKey = normalizeHospitalNameKey(h.name);

      const matchedGroup =
        (catalogMatch && officeHospitalGroups.get(`cat:${catalogMatch.id}`)) ||
        (normKey && officeHospitalGroups.get(`norm:${normKey}`)) ||
        officeHospitalGroups.get(`norm:${h.name.trim().toLowerCase()}`);

      if (matchedGroup) {
        consumedGroupKeys.add(matchedGroup.groupKey);
      }

      const officeCasesCount = matchedGroup?.count || 0;
      const officeRevenue = matchedGroup?.revenue || 0;
      const crmCases = h.caseCount || 0;
      const crmRevenue = h.totalRevenue || 0;
      const totalCases = crmCases + officeCasesCount;
      const totalRevenue = crmRevenue + officeRevenue;
      const computedStatus: HospitalStatus =
        totalCases >= 30
          ? 'high_priority'
          : totalCases > 0 && h.status === 'prospect'
            ? 'active'
            : h.status;

      list.push({
        key: h.id,
        crmHospital: h,
        savedInCrm: true,
        mapTargetId: h.id,
        placeId: h.placeId || catalogMatch?.id || '',
        name: h.name,
        address: h.address || catalogMatch?.address || '',
        province: h.province || catalogMatch?.province || 'ประเทศไทย',
        region: h.region || catalogMatch?.region || 'ภาคกลาง',
        lat: h.lat || catalogMatch?.lat || 13.7563,
        lng: h.lng || catalogMatch?.lng || 100.5018,
        hospitalType: h.hospitalType || catalogMatch?.hospitalType || 'โรงพยาบาลรัฐ',
        status: computedStatus,
        crmCases,
        officeCasesCount,
        totalCases,
        crmRevenue,
        officeRevenue,
        totalRevenue,
        activeDealsCount: h.activeDealsCount || 0,
        contactName: h.contactName || matchedGroup?.latestDoctor || '',
        contactRole: h.contactRole || (matchedGroup?.latestDoctor ? 'แพทย์ผู้ผ่าตัด' : ''),
        contactPhone: h.contactPhone || matchedGroup?.latestDoctorPhone || '',
        ownerName: h.ownerName || matchedGroup?.latestReceiver || 'ทีมขาย CTEC',
        latestDoctor: matchedGroup?.latestDoctor || '',
        latestReceiver: matchedGroup?.latestReceiver || '',
        notes: h.notes || '',
      });
    }

    // Second: partner hospitals present in imported Excel / Office Cases not yet saved in CRM hospitals collection
    for (const group of officeHospitalGroups.values()) {
      if (consumedGroupKeys.has(group.groupKey)) continue;

      const cat = group.catalogMatch;
      const displayName = cat?.name || group.rawName;
      const totalCases = group.count;
      const computedStatus: HospitalStatus =
        totalCases >= 30 ? 'high_priority' : 'active';

      list.push({
        key: `linked:${group.groupKey}`,
        savedInCrm: false,
        mapTargetId: cat?.id,
        placeId: cat?.id || '',
        name: displayName,
        address: cat?.address || '',
        province: cat?.province || 'เชื่อมจากข้อมูลเคส',
        region: cat?.region || 'ภาคกลาง',
        lat: cat?.lat ?? 13.7563,
        lng: cat?.lng ?? 100.5018,
        hospitalType: cat?.hospitalType || mapCategoryCodeToHospitalType(group.categoryCode),
        status: computedStatus,
        crmCases: 0,
        officeCasesCount: group.count,
        totalCases,
        crmRevenue: 0,
        officeRevenue: group.revenue,
        totalRevenue: group.revenue,
        activeDealsCount: 0,
        contactName: group.latestDoctor,
        contactRole: group.latestDoctor ? 'แพทย์ผู้ผ่าตัด (จากเคสออฟฟิศ)' : '',
        contactPhone: group.latestDoctorPhone,
        ownerName: group.latestReceiver || 'ข้อมูลเคสออฟฟิศ',
        latestDoctor: group.latestDoctor,
        latestReceiver: group.latestReceiver,
        notes: `เชื่อมต่ออัตโนมัติจากข้อมูลเคสออฟฟิศ (${group.rawName})`,
      });
    }

    return list.sort((a, b) => {
      if (b.totalCases !== a.totalCases) return b.totalCases - a.totalCases;
      if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
      return a.name.localeCompare(b.name, 'th');
    });
  }, [hospitals, officeHospitalGroups]);

  const unsyncedPartners = useMemo(
    () => partnerHospitals.filter((p) => !p.savedInCrm),
    [partnerHospitals]
  );

  const unsyncedCasesTotal = useMemo(
    () => unsyncedPartners.reduce((sum, p) => sum + p.officeCasesCount, 0),
    [unsyncedPartners]
  );

  const buildHospitalInputFromPartner = (p: UnifiedPartnerHospital): HospitalInput => ({
    name: p.name,
    placeId: p.placeId,
    address: p.address,
    province: p.province === 'เชื่อมจากข้อมูลเคส' ? '' : p.province,
    region: p.region,
    lat: p.lat,
    lng: p.lng,
    hospitalType: p.hospitalType,
    // Keep Firestore caseCount/totalRevenue at 0 so live officeCases aggregation never double-counts
    caseCount: 0,
    totalRevenue: 0,
    activeDealsCount: 0,
    status: p.totalCases >= 30 ? 'high_priority' : 'active',
    contactName: p.contactName,
    contactRole: p.contactRole || 'ฝ่ายจัดซื้อเครื่องมือแพทย์',
    contactPhone: p.contactPhone,
    notes: p.notes,
  });

  // Sync external signals and consume immediately so revisiting the tab does not re-open modals
  useEffect(() => {
    if (openAddHospitalSignal > 0) {
      openNewHospitalModal();
      onConsumedAddHospitalSignal?.();
    }
  }, [openAddHospitalSignal]);

  useEffect(() => {
    if (openAddDealSignal > 0) {
      openNewDealModal(preselectedHospitalForDeal || undefined);
      onConsumedAddDealSignal?.();
    }
  }, [openAddDealSignal]);

  useEffect(() => {
    if (preselectedHospitalForDeal) {
      openNewDealModal(preselectedHospitalForDeal);
      onClearPreselectedHospital();
    }
  }, [preselectedHospitalForDeal]);

  const openNewHospitalModal = (prefillPartner?: UnifiedPartnerHospital) => {
    setEditingHospital(null);
    if (prefillPartner) {
      setHospForm({
        name: prefillPartner.name,
        placeId: prefillPartner.placeId,
        address: prefillPartner.address,
        province:
          prefillPartner.province === 'เชื่อมจากข้อมูลเคส'
            ? ''
            : prefillPartner.province,
        region: prefillPartner.region,
        lat: prefillPartner.lat,
        lng: prefillPartner.lng,
        hospitalType: prefillPartner.hospitalType,
        caseCount: 0,
        totalRevenue: 0,
        status: prefillPartner.totalCases >= 30 ? 'high_priority' : 'active',
        contactName: prefillPartner.contactName,
        contactRole: prefillPartner.contactRole || 'ฝ่ายจัดซื้อเครื่องมือแพทย์',
        contactPhone: prefillPartner.contactPhone,
        notes: prefillPartner.notes,
      });
    } else {
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
    }
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

  const openNewDealModal = (hospitalOrKey?: Hospital | string) => {
    setEditingDeal(null);
    let defaultKey = '';
    if (typeof hospitalOrKey === 'string') {
      defaultKey = hospitalOrKey;
    } else if (hospitalOrKey) {
      defaultKey = hospitalOrKey.id;
    } else {
      defaultKey = partnerHospitals[0]?.key || hospitals[0]?.id || '';
    }

    setDealForm({
      title: '',
      hospitalId: defaultKey,
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
      hospitalType: place.hospitalType || prev.hospitalType,
      contactPhone: place.phone || prev.contactPhone,
    }));
  };

  const handleSyncAllPartnerHospitals = async () => {
    if (syncingPartners || unsyncedPartners.length === 0) return;
    setSyncingPartners(true);
    try {
      const inputs = unsyncedPartners.map(buildHospitalInputFromPartner);
      const count = await createHospitalsBatch(inputs, currentUser);
      onNotifyToast(
        `ซิงก์โรงพยาบาลคู่ค้าเข้าทะเบียน CRM เรียบร้อยแล้ว ${count.toLocaleString('th-TH')} แห่ง`
      );
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถซิงก์โรงพยาบาลคู่ค้าได้'));
    } finally {
      setSyncingPartners(false);
    }
  };

  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = hospForm.name.trim();
    if (trimmedName.length < 2) {
      onNotifyToast('กรุณาระบุชื่อโรงพยาบาลคู่ค้าอย่างน้อย 2 ตัวอักษร');
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
        onNotifyToast(`เพิ่มโรงพยาบาลคู่ค้า "${trimmedName}" เข้าระบบเรียบร้อยแล้ว`);
      }
      setShowHospitalModal(false);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถบันทึกข้อมูลโรงพยาบาลคู่ค้าได้'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = dealForm.title.trim();
    if (!dealForm.hospitalId) {
      onNotifyToast('กรุณาเลือกโรงพยาบาลคู่ค้าก่อนบันทึก');
      return;
    }
    if (trimmedTitle.length < 2) {
      onNotifyToast('กรุณาระบุชื่อรายการขายอย่างน้อย 2 ตัวอักษร');
      return;
    }

    const selectedPartner = partnerHospitals.find((p) => p.key === dealForm.hospitalId);
    let targetHospital = hospitals.find((h) => h.id === dealForm.hospitalId);

    if (!targetHospital && !selectedPartner) {
      onNotifyToast('ไม่พบโรงพยาบาลคู่ค้าที่เลือก กรุณาเลือกใหม่อีกครั้ง');
      return;
    }

    setSubmitting(true);
    try {
      // Auto-register partner hospital from imported Excel/Office Cases into CRM hospitals on demand
      if (!targetHospital && selectedPartner) {
        const input = buildHospitalInputFromPartner(selectedPartner);
        const createdId = await createHospital(input, currentUser);
        targetHospital = {
          id: createdId,
          orgId: 'ctec-medical',
          ...input,
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName,
          createdAt: null,
          updatedAt: null,
        };
      }

      if (!targetHospital) {
        onNotifyToast('ไม่สามารถเชื่อมต่อโรงพยาบาลคู่ค้าได้');
        return;
      }

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

  const filteredPartners = useMemo(() => {
    return partnerHospitals.filter((p) => {
      if (regionFilter !== 'all' && p.region !== regionFilter) return false;
      if (!effectiveSearch) return true;
      return (
        p.name.toLowerCase().includes(effectiveSearch) ||
        p.province.toLowerCase().includes(effectiveSearch) ||
        p.contactName.toLowerCase().includes(effectiveSearch) ||
        p.ownerName.toLowerCase().includes(effectiveSearch) ||
        p.latestDoctor.toLowerCase().includes(effectiveSearch)
      );
    });
  }, [partnerHospitals, effectiveSearch, regionFilter]);

  useEffect(() => {
    setHospitalPage(1);
  }, [effectiveSearch, regionFilter, hospitalPageSize]);

  const totalHospitalPages = Math.max(
    1,
    Math.ceil(filteredPartners.length / hospitalPageSize)
  );
  const safeHospitalPage = Math.min(hospitalPage, totalHospitalPages);
  const paginatedPartners = useMemo(() => {
    const start = (safeHospitalPage - 1) * hospitalPageSize;
    return filteredPartners.slice(start, start + hospitalPageSize);
  }, [filteredPartners, safeHospitalPage, hospitalPageSize]);

  const hospitalRangeStart =
    filteredPartners.length === 0 ? 0 : (safeHospitalPage - 1) * hospitalPageSize + 1;
  const hospitalRangeEnd = Math.min(
    safeHospitalPage * hospitalPageSize,
    filteredPartners.length
  );

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
            จัดการโรงพยาบาลคู่ค้าและติดตามสถานะการขาย
          </h1>
          <p className="text-xs sm:text-sm text-[#e3beb3]/75 mt-1">
            เชื่อมต่อข้อมูลโรงพยาบาลคู่ค้าอัตโนมัติจากเคสออฟฟิศ/Excel พร้อมซิงก์เคสสะสมเข้าแผนที่ 77 จังหวัด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openNewHospitalModal()}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#dfe2ef] bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#ffb59d]" />
            เพิ่มโรงพยาบาลคู่ค้า
          </button>
          <button
            type="button"
            onClick={() => openNewDealModal()}
            disabled={partnerHospitals.length === 0}
            className="orange-cta min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold disabled:opacity-50 rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มดีล / เคสใหม่
          </button>
        </div>
      </div>

      {/* Live Sync Banner when officeCases contain partner hospitals not yet saved in CRM */}
      {unsyncedPartners.length > 0 && (
        <div className="apple-glass-subtle rounded-2xl p-3.5 sm:p-4 border border-[#ff9457]/30 bg-[#ff6b2b]/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff6b2b]/20 border border-[#ff9457]/35 flex items-center justify-center shrink-0 mt-0.5">
              <Link2 className="w-4 h-4 text-[#ffb59d]" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-white">
                เชื่อมต่อโรงพยาบาลคู่ค้าอัตโนมัติจากข้อมูลที่นำเข้าแล้ว{' '}
                <span className="font-mono tabular-nums text-[#ffcf90]">
                  {unsyncedPartners.length.toLocaleString('th-TH')} แห่ง
                </span>{' '}
                (รวม {unsyncedCasesTotal.toLocaleString('th-TH')} เคส)
              </div>
              <p className="text-xs text-[#e3beb3]/80">
                สามารถเปิดดูและสร้างดีลได้ทันที หรือกดซิงก์เพื่อบันทึกรายชื่อโรงพยาบาลคู่ค้าทั้งหมดลงฐานข้อมูล CRM ถาวร
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={syncingPartners}
            onClick={() => void handleSyncAllPartnerHospitals()}
            className="orange-cta px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 self-start sm:self-center"
          >
            {syncingPartners ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                กำลังซิงก์...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                ซิงก์เข้าทะเบียน CRM ({unsyncedPartners.length.toLocaleString('th-TH')} แห่ง)
              </>
            )}
          </button>
        </div>
      )}

      {/* Sub-navigation & Filters */}
      <div className="apple-glass-subtle rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 bg-[#0a0e17]/80 border border-white/[0.07] rounded-xl self-start">
          <button
            type="button"
            onClick={() => setSubTab('hospitals')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'hospitals'
                ? 'bg-[#262a34] text-[#ffb59d] ring-1 ring-[#ffb59d]/30'
                : 'text-[#e3beb3]/70 hover:text-white'
            }`}
          >
            โรงพยาบาลคู่ค้า ({partnerHospitals.length.toLocaleString('th-TH')})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('deals')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'deals'
                ? 'bg-[#262a34] text-[#ffb59d] ring-1 ring-[#ffb59d]/30'
                : 'text-[#e3beb3]/70 hover:text-white'
            }`}
          >
            ติดตามสถานะการขาย ({deals.length.toLocaleString('th-TH')})
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
                  ? 'ค้นหาชื่อดีล โรงพยาบาลคู่ค้า หรือผู้แทนขาย...'
                  : 'ค้นหาโรงพยาบาลคู่ค้า จังหวัด แพทย์ หรือผู้ติดต่อ...'
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
                {partnerHospitals.length === 0
                  ? 'กรุณาเพิ่มข้อมูลโรงพยาบาลคู่ค้าหรือนำเข้าเคสก่อนสร้างรายการขาย'
                  : 'ยังไม่มีรายการติดตามการขายตามเงื่อนไขที่เลือก'}
              </div>
              <p className="text-xs text-[#e3beb3]/70">
                {partnerHospitals.length === 0
                  ? 'คุณสามารถกดปุ่มเพิ่มโรงพยาบาลคู่ค้าด้านบน หรือนำเข้าข้อมูลจาก Excel ในเมนูเคสออฟฟิศ'
                  : `พร้อมเชื่อมกับโรงพยาบาลคู่ค้าในระบบ ${partnerHospitals.length.toLocaleString('th-TH')} แห่ง — กดปุ่ม "เพิ่มดีล / เคสใหม่" เพื่อเริ่มติดตามการขายได้ทันที`}
              </p>
              <button
                type="button"
                onClick={
                  partnerHospitals.length === 0
                    ? () => openNewHospitalModal()
                    : () => openNewDealModal()
                }
                className="orange-cta inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {partnerHospitals.length === 0 ? 'เพิ่มโรงพยาบาลคู่ค้าแห่งแรก' : 'สร้างดีลแรก'}
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
                      <th className="py-3.5 px-5">รายการขาย / โรงพยาบาลคู่ค้า</th>
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

      {/* Content View: Partner Hospitals (Unified CRM + Live Linked Office Cases) */}
      {subTab === 'hospitals' && (
        <section className="apple-glass rounded-2xl overflow-hidden">
          {filteredPartners.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="text-sm font-semibold text-white">
                {partnerHospitals.length === 0
                  ? 'ยังไม่มีรายชื่อโรงพยาบาลคู่ค้าในระบบ'
                  : 'ไม่พบโรงพยาบาลคู่ค้าตามคำค้นหาหรือภูมิภาคที่เลือก'}
              </div>
              <p className="text-xs text-[#e3beb3]/70">
                {partnerHospitals.length === 0
                  ? 'เพิ่มโรงพยาบาลคู่ค้าใหม่ หรือนำเข้าไฟล์ Excel ในเมนูเคสออฟฟิศ ระบบจะเชื่อมรายชื่อมาแสดงที่นี่อัตโนมัติ'
                  : 'ลองล้างคำค้นหาหรือเลือกทุกภูมิภาค'}
              </p>
              {partnerHospitals.length === 0 && (
                <button
                  type="button"
                  onClick={() => openNewHospitalModal()}
                  className="orange-cta inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มโรงพยาบาลคู่ค้าใหม่
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Partner Hospital Cards */}
              <div className="divide-y divide-white/[0.06] md:hidden">
                {paginatedPartners.map((p) => {
                  const density = getDensityMeta(p.totalCases);
                  const tier = getDensityTierLabel(p.totalCases);
                  const canEditCrm =
                    p.crmHospital && (isManagerOrAbove || p.crmHospital.ownerId === currentUser.uid);

                  return (
                    <div key={p.key} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white">{p.name}</div>
                          <div className="text-xs text-[#e3beb3]/70 mt-0.5">
                            {p.province || '-'} · {p.region}
                          </div>
                          <div className="text-[11px] mt-0.5 flex flex-wrap items-center gap-1.5">
                            {p.officeCasesCount > 0 && (
                              <span className="text-[#ffb59d]">
                                เชื่อมเคสออฟฟิศ {p.officeCasesCount.toLocaleString('th-TH')} เคส
                              </span>
                            )}
                            {!p.savedInCrm && (
                              <span className="text-sky-300">· ยังไม่บันทึกใน CRM</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className="text-sm font-bold font-mono tabular-nums"
                            style={{ color: density.color }}
                          >
                            {p.totalCases.toLocaleString('th-TH')} เคส
                          </div>
                          <div
                            className={`text-[10px] font-semibold uppercase tracking-wider ${tier.textClass}`}
                          >
                            {tier.label}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                        <span className="font-mono tabular-nums font-semibold text-[#ffcf90]">
                          {formatCurrency(p.totalRevenue)}
                        </span>
                        <div className="inline-flex items-center gap-1">
                          {p.mapTargetId && (
                            <button
                              type="button"
                              onClick={() => onJumpToMap(p.mapTargetId!)}
                              aria-label="ดูบนแผนที่"
                              className="p-2 rounded-lg text-[#e3beb3]/75 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer"
                            >
                              <MapPin className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openNewDealModal(p.key)}
                            aria-label="เพิ่มดีล"
                            className="p-2 rounded-lg text-[#e3beb3]/75 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {p.crmHospital ? (
                            canEditCrm && (
                              <button
                                type="button"
                                onClick={() => openEditHospitalModal(p.crmHospital!)}
                                aria-label="แก้ไขโรงพยาบาลคู่ค้า"
                                className="p-2 rounded-lg text-[#e3beb3]/75 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => openNewHospitalModal(p)}
                              aria-label="บันทึกลงทะเบียน CRM"
                              className="p-2 rounded-lg text-sky-300 hover:text-sky-200 hover:bg-white/[0.06] cursor-pointer"
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
                <table className="w-full text-left border-collapse min-w-[860px]">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.07] text-[11px] font-semibold uppercase tracking-wider text-[#e3beb3]/70">
                      <th className="py-3.5 px-5">โรงพยาบาลคู่ค้า / ที่ตั้ง</th>
                      <th className="py-3.5 px-4">ประเภท / สถานะ</th>
                      <th className="py-3.5 px-4 text-right">เคสสะสม</th>
                      <th className="py-3.5 px-4 text-right">ยอดขายสะสม</th>
                      <th className="py-3.5 px-4">ผู้ติดต่อ / แพทย์ / ผู้ดูแล</th>
                      <th className="py-3.5 px-5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-sm">
                    {paginatedPartners.map((p) => {
                      const density = getDensityMeta(p.totalCases);
                      const tier = getDensityTierLabel(p.totalCases);
                      const canEditCrm =
                        p.crmHospital &&
                        (isManagerOrAbove || p.crmHospital.ownerId === currentUser.uid);

                      return (
                        <tr key={p.key} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{p.name}</span>
                              {!p.savedInCrm && (
                                <span className="text-[10px] font-medium text-sky-300 whitespace-nowrap">
                                  · เชื่อมจากเคส
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#e3beb3]/70 mt-0.5">
                              {p.province || '-'} · {p.region}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="text-[#dfe2ef]">{p.hospitalType}</div>
                            <div className="text-[#aa897f] mt-0.5">
                              {HOSPITAL_STATUS_LABEL[p.status]}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div
                              className="font-bold font-mono tabular-nums"
                              style={{ color: density.color }}
                            >
                              {p.totalCases.toLocaleString('th-TH')} เคส
                            </div>
                            <div
                              className={`text-[10px] font-semibold uppercase tracking-wider ${tier.textClass}`}
                            >
                              {p.officeCasesCount > 0 && p.crmCases > 0
                                ? `ออฟฟิศ ${p.officeCasesCount} · CRM ${p.crmCases}`
                                : tier.label}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#ffcf90]">
                            {formatCurrency(p.totalRevenue)}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#dfe2ef]">
                            <div className="truncate max-w-[200px]">
                              {p.contactName || '-'}
                            </div>
                            <div className="text-[#aa897f] font-mono truncate max-w-[200px]">
                              {p.contactPhone || p.ownerName}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-1">
                              {p.mapTargetId && (
                                <button
                                  type="button"
                                  onClick={() => onJumpToMap(p.mapTargetId!)}
                                  title="ดูพิกัดบนแผนที่"
                                  className="p-2 rounded-lg text-[#e3beb3]/70 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer transition-colors"
                                >
                                  <MapPin className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openNewDealModal(p.key)}
                                title="เพิ่มดีลให้โรงพยาบาลคู่ค้านี้"
                                className="p-2 rounded-lg text-[#e3beb3]/70 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              {p.crmHospital ? (
                                <>
                                  {canEditCrm && (
                                    <button
                                      type="button"
                                      onClick={() => openEditHospitalModal(p.crmHospital!)}
                                      title="แก้ไขข้อมูลโรงพยาบาลคู่ค้า"
                                      className="p-2 rounded-lg text-[#e3beb3]/70 hover:text-[#ffb59d] hover:bg-white/[0.06] cursor-pointer transition-colors"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPendingDelete({
                                          type: 'hospital',
                                          item: p.crmHospital!,
                                        })
                                      }
                                      title="ลบออกจากทะเบียน CRM"
                                      className="p-2 rounded-lg text-[#aa897f] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openNewHospitalModal(p)}
                                  title="แก้ไขและบันทึกเข้าทะเบียน CRM"
                                  className="p-2 rounded-lg text-sky-300 hover:text-sky-200 hover:bg-sky-500/10 cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
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

              {/* Pagination Footer Bar for Partner Hospitals */}
              {filteredPartners.length > 25 && (
                <div className="px-4 py-3 border-t border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#e3beb3]/80">
                  <div className="font-mono tabular-nums">
                    แสดง{' '}
                    <strong className="text-white">
                      {hospitalRangeStart.toLocaleString('th-TH')}–
                      {hospitalRangeEnd.toLocaleString('th-TH')}
                    </strong>{' '}
                    จาก{' '}
                    <strong className="text-white">
                      {filteredPartners.length.toLocaleString('th-TH')}
                    </strong>{' '}
                    โรงพยาบาลคู่ค้า
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={hospitalPageSize}
                      onChange={(e) =>
                        setHospitalPageSize(Number(e.target.value) as 25 | 50 | 100)
                      }
                      aria-label="จำนวนโรงพยาบาลคู่ค้าต่อหน้า"
                      className="glass-input h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                    >
                      <option value={25}>25 แห่ง/หน้า</option>
                      <option value={50}>50 แห่ง/หน้า</option>
                      <option value={100}>100 แห่ง/หน้า</option>
                    </select>

                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safeHospitalPage <= 1}
                        onClick={() => setHospitalPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-35"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        ก่อนหน้า
                      </button>
                      <span className="px-2.5 font-mono tabular-nums text-white text-xs">
                        หน้า {safeHospitalPage} / {totalHospitalPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeHospitalPage >= totalHospitalPages}
                        onClick={() =>
                          setHospitalPage((p) => Math.min(totalHospitalPages, p + 1))
                        }
                        className="px-2.5 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-35"
                      >
                        ถัดไป
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Modal: Add / Edit Partner Hospital */}
      {showHospitalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="apple-glass rounded-2xl w-full max-w-xl shadow-2xl my-auto overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {editingHospital ? 'แก้ไขข้อมูลโรงพยาบาลคู่ค้า' : 'เพิ่มโรงพยาบาลคู่ค้าใหม่'}
              </h2>
              <button
                type="button"
                onClick={() => setShowHospitalModal(false)}
                className="p-1.5 rounded-lg text-[#aa897f] hover:text-white hover:bg-white/[0.08] cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveHospital}
              className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {!editingHospital && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#ffb59d]">
                    ค้นหาโรงพยาบาลทั่วประเทศ 77 จังหวัด (ดึงชื่อ ที่อยู่ และพิกัดอัตโนมัติ)
                  </label>
                  <HospitalPlaceAutocomplete onSelect={handlePlaceAutofill} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    โรงพยาบาลคู่ค้า *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={180}
                    value={hospForm.name}
                    onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                    placeholder="ระบุชื่อโรงพยาบาลคู่ค้า"
                    className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                  />
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
                    ประเภทโรงพยาบาล
                  </label>
                  <select
                    value={hospForm.hospitalType}
                    onChange={(e) =>
                      setHospForm({
                        ...hospForm,
                        hospitalType: e.target.value as HospitalType,
                      })
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
                    สถานะบัญชี
                  </label>
                  <select
                    value={hospForm.status}
                    onChange={(e) =>
                      setHospForm({
                        ...hospForm,
                        status: e.target.value as HospitalStatus,
                      })
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
                    เคสเพิ่มเติม (นอกเหนือจากเคสออฟฟิศ)
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
                    ยอดขายเพิ่มเติม (บาท)
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
                    ละติจูด (Latitude)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={hospForm.lat}
                    onChange={(e) =>
                      setHospForm({ ...hospForm, lat: Number(e.target.value) })
                    }
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ลองจิจูด (Longitude)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={hospForm.lng}
                    onChange={(e) =>
                      setHospForm({ ...hospForm, lng: Number(e.target.value) })
                    }
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ชื่อผู้ติดต่อหลัก / แพทย์
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={hospForm.contactName}
                    onChange={(e) =>
                      setHospForm({ ...hospForm, contactName: e.target.value })
                    }
                    placeholder="เช่น นพ.สมชาย / หัวหน้าฝ่ายจัดซื้อ"
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
                    onChange={(e) =>
                      setHospForm({ ...hospForm, contactPhone: e.target.value })
                    }
                    placeholder="02-xxx-xxxx"
                    className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                    ที่อยู่โรงพยาบาล
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
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกโรงพยาบาลคู่ค้า'}
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
              {partnerHospitals.length === 0 && !editingDeal && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3.5 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span>
                    ยังไม่มีรายชื่อโรงพยาบาลคู่ค้าในระบบ กรุณาเพิ่มโรงพยาบาลคู่ค้าก่อนสร้างรายการขาย
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDealModal(false);
                      openNewHospitalModal();
                    }}
                    className="orange-cta px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer shrink-0"
                  >
                    เพิ่มโรงพยาบาลคู่ค้าก่อน
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#e3beb3] mb-1">
                  โรงพยาบาลคู่ค้า *
                </label>
                <select
                  required
                  disabled={Boolean(editingDeal) || partnerHospitals.length === 0}
                  value={dealForm.hospitalId}
                  onChange={(e) => setDealForm({ ...dealForm, hospitalId: e.target.value })}
                  className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-60"
                >
                  <option value="">-- เลือกโรงพยาบาลคู่ค้า --</option>
                  {partnerHospitals.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} ({p.province || p.region}
                      {p.totalCases > 0 ? ` · ${p.totalCases} เคส` : ''})
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
                  disabled={submitting || (partnerHospitals.length === 0 && !editingDeal)}
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
                {pendingDelete.type === 'deal'
                  ? 'ยืนยันการลบรายการขาย'
                  : 'ยืนยันการลบโรงพยาบาลคู่ค้า'}
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
                  ? 'ยอดเคสและยอดขายของโรงพยาบาลคู่ค้าที่เกี่ยวข้องจะถูกปรับลดอัตโนมัติ'
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
