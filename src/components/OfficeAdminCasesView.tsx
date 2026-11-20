import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  Eye,
  FileSpreadsheet,
  FlaskConical,
  Loader2,
  Lock,
  Package,
  Plus,
  Search,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { getFriendlyFirestoreError } from '../firebase';
import {
  exportOfficeCasesToExcel,
  inferWorkflowStatus,
  type OfficeCaseSeedInput,
} from '../data/officeCaseReferenceData';
import { ImportOfficeCasesModal } from './ImportOfficeCasesModal';
import {
  createOfficeCase,
  deleteOfficeCase,
  officeCaseToInput,
  quickUpdateOfficeCaseStatus,
  updateOfficeCase,
  updateOfficeCaseStage,
} from '../services/officeCaseService';
import {
  formatCurrency,
  HOSPITAL_CATEGORY_LABELS,
  OFFICE_PAYMENT_CHANNELS,
  OFFICE_WORKFLOW_META,
  type Hospital,
  type HospitalCategoryCode,
  type OfficeCase,
  type OfficeCaseWorkflowStatus,
  type OfficePaymentChannel,
  type UserProfile,
} from '../types';

interface OfficeAdminCasesViewProps {
  currentUser: UserProfile;
  officeCases: OfficeCase[];
  hospitals: Hospital[];
  globalSearch?: string;
  openAddCaseSignal?: number;
  onConsumedAddCaseSignal?: () => void;
  onNotifyToast: (msg: string) => void;
}

type FormSectionId = 'intake' | 'implant' | 'payment' | 'sterilize' | 'delivery';
type QuickUpdateMode = 'sterilizing' | 'delivered';

interface QuickStageFormState {
  sterilizeOutDate: string;
  sterilizeReturnDate: string;
  radiationMinKgy: string;
  radiationMaxKgy: string;
  doseUniformity: string;
  qcReceiveDate: string;
  certificateNo: string;
  deliveryDate: string;
  deliveryChannel: string;
  deliveredBy: string;
  emsTrackingNo: string;
  shippingInfo: string;
  price: number;
  paymentDetails: string;
  remarks: string;
}

const FORM_SECTIONS: { id: FormSectionId; label: string; shortLabel: string }[] = [
  { id: 'intake', label: '1. รับเคส / ข้อมูลหลัก', shortLabel: '1. รับเคส' },
  { id: 'implant', label: '2. ชิ้นงาน & การผลิต', shortLabel: '2. ชิ้นงาน' },
  { id: 'payment', label: '3. การเงิน & ชำระเงิน', shortLabel: '3. การเงิน' },
  { id: 'sterilize', label: '4. ฆ่าเชื้อ & ค่ารังสี', shortLabel: '4. ฆ่าเชื้อ' },
  { id: 'delivery', label: '5. จัดส่ง / EMS / ที่อยู่', shortLabel: '5. จัดส่ง' },
];

const PATIENT_PREFIXES = ['', 'นาย', 'นาง', 'นางสาว', 'น.ส', 'ด.ช.', 'ด.ญ.', 'Mr.', 'Mrs.', 'Ms.'];
const SIDE_POSITIONS = ['', 'LEFT', 'RIGHT', 'BILATERAL', 'MIDLINE', 'OTHER'];
const DELIVERY_CHANNELS = [
  'รพ.',
  'เคอรี่',
  'EMS',
  'Flash',
  'แมสเซ็นเจอร์',
  'ผู้แทนขายนำส่ง',
  'รับที่ออฟฟิศ',
];

function getTodayThaiDate(): string {
  const now = new Date();
  return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
}

function buildEmptyForm(existingCases: OfficeCase[], defaultReceiver: string): OfficeCaseSeedInput {
  const maxSalesSeq = existingCases.reduce((m, c) => Math.max(m, c.salesSeqNo || 0), 0);
  const maxMonthlySeq = existingCases.reduce((m, c) => Math.max(m, c.monthlySeq || 0), 0);
  const thaiYear = new Date().getFullYear() + 543;
  const nextJobCounter = String(existingCases.length + 1).padStart(3, '0');

  return {
    salesSeqNo: maxSalesSeq + 1,
    jobNumber: `${thaiYear}-${nextJobCounter}`,
    monthlySeq: maxMonthlySeq + 1,
    icrNumber: `ICR0002/${thaiYear}`,
    hospitalCategory: 1,
    productionPlanNo: '',
    barcode: '',
    workflowStatus: 'in_progress',
    paymentChannels: [],
    price: 0,
    paymentDetails: '',
    paymentConditionNote: '',
    patientPrefix: '',
    patientFirstName: '',
    patientLastName: '',
    patientHN: '',
    patientAge: '',
    patientPhone: '',
    hospitalName: '',
    doctorName: '',
    doctorPhone: '',
    productCode: '',
    sidePosition: '',
    anatomicalArea: '',
    surgeryType: '',
    materialType: '',
    rpModelQty: 1,
    implantQty: 1,
    temporalSpec: '',
    productionSpec: '',
    receivedDate: getTodayThaiDate(),
    surgeryDate: '',
    caseReceiver: defaultReceiver.slice(0, 30),
    sterilizeOutDate: '',
    sterilizeReturnDate: '',
    radiationMinKgy: '',
    radiationMaxKgy: '',
    doseUniformity: '',
    qcReceiveDate: '',
    certificateNo: '',
    deliveryDate: '',
    deliveryChannel: '',
    deliveredBy: '',
    emsTrackingNo: '',
    shippingInfo: '',
    receiptAddress: '',
    packageInfo: '',
    remarks: '',
  };
}

function hasAnyUserInput(data: OfficeCaseSeedInput): boolean {
  const textFields = [
    data.jobNumber,
    data.hospitalName,
    data.patientFirstName,
    data.patientLastName,
    data.patientHN,
    data.doctorName,
    data.barcode,
    data.productCode,
    data.productionPlanNo,
    data.productionSpec,
    data.sterilizeOutDate,
    data.certificateNo,
    data.deliveryDate,
    data.emsTrackingNo,
    data.paymentDetails,
    data.remarks,
  ];
  return (
    textFields.some((val) => val.trim().length > 0) ||
    data.salesSeqNo > 0 ||
    data.price > 0 ||
    data.paymentChannels.length > 0
  );
}

function getDisplayJobTitle(item: OfficeCase): string {
  if (item.jobNumber.trim()) return item.jobNumber.trim();
  if (item.salesSeqNo > 0) return `ร่าง #${item.salesSeqNo}`;
  return 'ยังไม่ระบุเลขที่รับงาน';
}

export const OfficeAdminCasesView: React.FC<OfficeAdminCasesViewProps> = ({
  currentUser,
  officeCases,
  hospitals,
  globalSearch = '',
  openAddCaseSignal = 0,
  onConsumedAddCaseSignal,
  onNotifyToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OfficeCaseWorkflowStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | HospitalCategoryCode>('all');
  const [receiverFilter, setReceiverFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(50);

  // Full Create/Edit Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [formSection, setFormSection] = useState<FormSectionId>('intake');
  const [editingCase, setEditingCase] = useState<OfficeCase | null>(null);
  const [formData, setFormData] = useState<OfficeCaseSeedInput>(() =>
    buildEmptyForm(officeCases, currentUser.displayName)
  );
  const [submitting, setSubmitting] = useState(false);

  // Quick Stage Update Modal (Sterilizing / Delivered)
  const [quickModal, setQuickModal] = useState<{
    caseItem: OfficeCase;
    mode: QuickUpdateMode;
  } | null>(null);
  const [quickData, setQuickData] = useState<QuickStageFormState>({
    sterilizeOutDate: '',
    sterilizeReturnDate: '',
    radiationMinKgy: '',
    radiationMaxKgy: '',
    doseUniformity: '',
    qcReceiveDate: '',
    certificateNo: '',
    deliveryDate: '',
    deliveryChannel: '',
    deliveredBy: '',
    emsTrackingNo: '',
    shippingInfo: '',
    price: 0,
    paymentDetails: '',
    remarks: '',
  });
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [viewingCase, setViewingCase] = useState<OfficeCase | null>(null);
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);
  const [pendingDeleteCase, setPendingDeleteCase] = useState<OfficeCase | null>(null);
  const [deletingCase, setDeletingCase] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const canWrite =
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    currentUser.role === 'office_admin';

  useEffect(() => {
    if (openAddCaseSignal > 0 && canWrite) {
      setEditingCase(null);
      setFormData(buildEmptyForm(officeCases, currentUser.displayName));
      setFormSection('intake');
      setShowFormModal(true);
      onConsumedAddCaseSignal?.();
    }
  }, [openAddCaseSignal, canWrite]);

  const isEditingDeliveredLocked =
    Boolean(editingCase && editingCase.workflowStatus === 'delivered' && !isAdmin);

  // Compute summary stats
  const stats = useMemo(() => {
    let inProgress = 0;
    let sterilizing = 0;
    let delivered = 0;
    let totalValue = 0;

    officeCases.forEach((c) => {
      if (c.workflowStatus === 'in_progress') inProgress += 1;
      else if (c.workflowStatus === 'sterilizing') sterilizing += 1;
      else delivered += 1;
      totalValue += c.price || 0;
    });

    return {
      total: officeCases.length,
      inProgress,
      sterilizing,
      delivered,
      totalValue,
    };
  }, [officeCases]);

  const receiversList = useMemo(() => {
    const set = new Set<string>();
    officeCases.forEach((c) => {
      if (c.caseReceiver.trim()) set.add(c.caseReceiver.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [officeCases]);

  const hospitalSuggestions = useMemo(() => {
    const set = new Set<string>();
    hospitals.forEach((h) => set.add(h.name));
    officeCases.forEach((c) => {
      if (c.hospitalName.trim()) set.add(c.hospitalName.trim());
    });
    set.add('พหลพลพยุหเสนา กาญจนบุรี');
    set.add('ปทุมธานี');
    return Array.from(set);
  }, [hospitals, officeCases]);

  const effectiveSearch = (search.trim() || globalSearch.trim()).toLowerCase();

  const filteredCases = useMemo(() => {
    return officeCases.filter((c) => {
      if (statusFilter !== 'all' && c.workflowStatus !== statusFilter) return false;
      if (categoryFilter !== 'all' && c.hospitalCategory !== categoryFilter) return false;
      if (receiverFilter !== 'all' && c.caseReceiver.trim() !== receiverFilter) return false;
      if (!effectiveSearch) return true;
      const haystack = [
        String(c.salesSeqNo),
        c.jobNumber,
        c.barcode,
        c.patientPrefix,
        c.patientFirstName,
        c.patientLastName,
        c.patientHN,
        c.hospitalName,
        c.doctorName,
        c.productCode,
        c.certificateNo,
        c.emsTrackingNo,
        c.caseReceiver,
        c.remarks,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(effectiveSearch);
    });
  }, [officeCases, statusFilter, categoryFilter, receiverFilter, effectiveSearch]);

  useEffect(() => {
    setPage(1);
  }, [effectiveSearch, statusFilter, categoryFilter, receiverFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedCases = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, safePage, pageSize]);

  const pageRangeStart = filteredCases.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageRangeEnd = Math.min(safePage * pageSize, filteredCases.length);

  const openCreateModal = () => {
    setEditingCase(null);
    setFormData(buildEmptyForm(officeCases, currentUser.displayName));
    setFormSection('intake');
    setShowFormModal(true);
  };

  const openEditModal = (item: OfficeCase, initialSection: FormSectionId = 'intake') => {
    setEditingCase(item);
    setFormData(officeCaseToInput(item));
    setFormSection(
      item.workflowStatus === 'delivered' && !isAdmin ? 'delivery' : initialSection
    );
    setShowFormModal(true);
  };

  const openQuickStageModal = (item: OfficeCase, mode: QuickUpdateMode) => {
    const today = getTodayThaiDate();
    setQuickData({
      sterilizeOutDate:
        mode === 'sterilizing' ? item.sterilizeOutDate || today : item.sterilizeOutDate,
      sterilizeReturnDate: item.sterilizeReturnDate,
      radiationMinKgy: item.radiationMinKgy,
      radiationMaxKgy: item.radiationMaxKgy,
      doseUniformity: item.doseUniformity,
      qcReceiveDate: item.qcReceiveDate,
      certificateNo: item.certificateNo,
      deliveryDate: mode === 'delivered' ? item.deliveryDate || today : item.deliveryDate,
      deliveryChannel: item.deliveryChannel,
      deliveredBy:
        mode === 'delivered'
          ? item.deliveredBy || currentUser.displayName.slice(0, 30)
          : item.deliveredBy,
      emsTrackingNo: item.emsTrackingNo,
      shippingInfo: item.shippingInfo,
      price: item.price,
      paymentDetails: item.paymentDetails,
      remarks: item.remarks,
    });
    setQuickModal({ caseItem: item, mode });
  };

  const togglePaymentChannel = (id: OfficePaymentChannel) => {
    setFormData((prev) => {
      const exists = prev.paymentChannels.includes(id);
      const next = exists
        ? prev.paymentChannels.filter((c) => c !== id)
        : [...prev.paymentChannels, id];
      return { ...prev, paymentChannels: next };
    });
  };

  const handleRadiationChange = (field: 'radiationMinKgy' | 'radiationMaxKgy', value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      const minVal = parseFloat(next.radiationMinKgy);
      const maxVal = parseFloat(next.radiationMaxKgy);
      if (Number.isFinite(minVal) && minVal > 0 && Number.isFinite(maxVal) && maxVal > 0) {
        next.doseUniformity = (maxVal / minVal).toFixed(2);
      }
      return next;
    });
  };

  const handleQuickRadiationChange = (
    field: 'radiationMinKgy' | 'radiationMaxKgy',
    value: string
  ) => {
    setQuickData((prev) => {
      const next = { ...prev, [field]: value };
      const minVal = parseFloat(next.radiationMinKgy);
      const maxVal = parseFloat(next.radiationMaxKgy);
      if (Number.isFinite(minVal) && minVal > 0 && Number.isFinite(maxVal) && maxVal > 0) {
        next.doseUniformity = (maxVal / minVal).toFixed(2);
      }
      return next;
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!hasAnyUserInput(formData)) {
      onNotifyToast('กรุณากรอกข้อมูลอย่างน้อย 1 ช่องก่อนบันทึก');
      return;
    }
    setSubmitting(true);
    try {
      const displayCode =
        formData.jobNumber.trim() ||
        formData.hospitalName.trim() ||
        formData.patientFirstName.trim() ||
        `#${formData.salesSeqNo}`;

      if (editingCase) {
        await updateOfficeCase(editingCase, formData, currentUser);
        onNotifyToast(`อัปเดตเคส ${displayCode} เรียบร้อยแล้ว`);
      } else {
        await createOfficeCase(formData, currentUser);
        onNotifyToast(`บันทึกเคสใหม่ (${displayCode}) เรียบร้อยแล้ว — อัปเดตเพิ่มภายหลังได้`);
      }
      setShowFormModal(false);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถบันทึกข้อมูลเคสได้ กรุณาลองใหม่'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveQuickStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !quickModal) return;
    setQuickSubmitting(true);
    try {
      const { caseItem, mode } = quickModal;
      if (mode === 'sterilizing') {
        const nextStatus: OfficeCaseWorkflowStatus =
          caseItem.workflowStatus === 'delivered' && !isAdmin ? 'delivered' : 'sterilizing';
        await updateOfficeCaseStage(
          caseItem,
          {
            workflowStatus: nextStatus,
            sterilizeOutDate: quickData.sterilizeOutDate,
            sterilizeReturnDate: quickData.sterilizeReturnDate,
            radiationMinKgy: quickData.radiationMinKgy,
            radiationMaxKgy: quickData.radiationMaxKgy,
            doseUniformity: quickData.doseUniformity,
            qcReceiveDate: quickData.qcReceiveDate,
            certificateNo: quickData.certificateNo,
            remarks: quickData.remarks,
          },
          currentUser
        );
        onNotifyToast(
          `อัปเดตข้อมูลฆ่าเชื้อเคส ${getDisplayJobTitle(caseItem)} (${OFFICE_WORKFLOW_META[nextStatus].colorName}) แล้ว`
        );
      } else {
        await updateOfficeCaseStage(
          caseItem,
          {
            workflowStatus: 'delivered',
            deliveryDate: quickData.deliveryDate,
            deliveryChannel: quickData.deliveryChannel,
            deliveredBy: quickData.deliveredBy,
            emsTrackingNo: quickData.emsTrackingNo,
            shippingInfo: quickData.shippingInfo,
            price: quickData.price,
            paymentDetails: quickData.paymentDetails,
            remarks: quickData.remarks,
          },
          currentUser
        );
        onNotifyToast(
          `อัปเดตจัดส่งแล้ว (สีเขียว) สำหรับเคส ${getDisplayJobTitle(caseItem)} เรียบร้อยแล้ว`
        );
      }
      setQuickModal(null);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถอัปเดตสถานะเคสได้ กรุณาลองใหม่'));
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleInlineStatusChange = async (
    item: OfficeCase,
    nextStatus: OfficeCaseWorkflowStatus
  ) => {
    if (updatingCaseId === item.id) return;
    setUpdatingCaseId(item.id);
    try {
      await quickUpdateOfficeCaseStatus(item, nextStatus, currentUser);
      onNotifyToast(
        `อัปเดตสถานะ ${getDisplayJobTitle(item)} → ${OFFICE_WORKFLOW_META[nextStatus].colorName}`
      );
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถเปลี่ยนสถานะเคสได้'));
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handleConfirmDeleteCase = async () => {
    if (!pendingDeleteCase || deletingCase) return;
    setDeletingCase(true);
    try {
      const target = pendingDeleteCase;
      await deleteOfficeCase(target, currentUser);
      setPendingDeleteCase(null);
      if (viewingCase?.id === target.id) setViewingCase(null);
      onNotifyToast(`ลบเคส ${getDisplayJobTitle(target)} เรียบร้อยแล้ว`);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, 'ไม่สามารถลบเคสนี้ได้'));
    } finally {
      setDeletingCase(false);
    }
  };

  const handleExportExcel = () => {
    exportOfficeCasesToExcel(filteredCases, currentUser.displayName);
    onNotifyToast(`ส่งออกตารางเคสออฟฟิศ ${filteredCases.length} รายการเป็น Excel แล้ว`);
  };

  // Live QA indicator for radiation 15 - 35 kGy
  const radiationQaState = useMemo(() => {
    const minVal = parseFloat(formData.radiationMinKgy);
    const maxVal = parseFloat(formData.radiationMaxKgy);
    if (!Number.isFinite(minVal) && !Number.isFinite(maxVal)) return null;
    const minOk = !Number.isFinite(minVal) || minVal >= 15;
    const maxOk = !Number.isFinite(maxVal) || maxVal <= 35;
    return minOk && maxOk ? 'pass' : 'warn';
  }, [formData.radiationMinKgy, formData.radiationMaxKgy]);

  const quickRadiationQaState = useMemo(() => {
    const minVal = parseFloat(quickData.radiationMinKgy);
    const maxVal = parseFloat(quickData.radiationMaxKgy);
    if (!Number.isFinite(minVal) && !Number.isFinite(maxVal)) return null;
    const minOk = !Number.isFinite(minVal) || minVal >= 15;
    const maxOk = !Number.isFinite(maxVal) || maxVal <= 35;
    return minOk && maxOk ? 'pass' : 'warn';
  }, [quickData.radiationMinKgy, quickData.radiationMaxKgy]);

  // Count filled items per form tab for quick visual progress
  const sectionCounts = useMemo<Record<FormSectionId, number>>(() => {
    const countNonEmpty = (vals: (string | number | unknown[])[]) =>
      vals.filter((v) => {
        if (typeof v === 'string') return v.trim().length > 0;
        if (typeof v === 'number') return v > 0;
        if (Array.isArray(v)) return v.length > 0;
        return false;
      }).length;

    return {
      intake: countNonEmpty([
        formData.jobNumber,
        formData.hospitalName,
        formData.patientFirstName,
        formData.patientLastName,
        formData.patientHN,
        formData.doctorName,
        formData.receivedDate,
        formData.surgeryDate,
        formData.caseReceiver,
      ]),
      implant: countNonEmpty([
        formData.productCode,
        formData.barcode,
        formData.productionPlanNo,
        formData.sidePosition,
        formData.anatomicalArea,
        formData.surgeryType,
        formData.materialType,
        formData.temporalSpec,
        formData.productionSpec,
        formData.patientAge,
        formData.patientPhone,
        formData.doctorPhone,
      ]),
      payment: countNonEmpty([
        formData.paymentChannels,
        formData.price,
        formData.paymentDetails,
        formData.paymentConditionNote,
        formData.icrNumber,
      ]),
      sterilize: countNonEmpty([
        formData.sterilizeOutDate,
        formData.sterilizeReturnDate,
        formData.radiationMinKgy,
        formData.radiationMaxKgy,
        formData.qcReceiveDate,
        formData.certificateNo,
      ]),
      delivery: countNonEmpty([
        formData.deliveryDate,
        formData.deliveryChannel,
        formData.deliveredBy,
        formData.emsTrackingNo,
        formData.shippingInfo,
        formData.receiptAddress,
        formData.packageInfo,
        formData.remarks,
      ]),
    };
  }, [formData]);

  return (
    <div className="space-y-5">
      {/* Header & Action Bar */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#C8B6AE]">
            <span className="font-semibold text-[#FFB59D]">
              CTEC Customized Personalized Implant
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">ICR0002/2569</span>
            <span aria-hidden="true">·</span>
            <span>ระบบแอดมินออฟฟิศ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            ทะเบียนรับงาน กรอกข้อมูลเคส ฆ่าเชื้อ และจัดส่ง (ออฟฟิศ)
          </h1>
          <p className="text-xs sm:text-sm text-[#B5BDCB]">
            รับเคสแบบยืดหยุ่น — กรอกเฉพาะข้อมูลที่มีแล้วบันทึกทันที จากนั้นค่อยกดอัปเดตส่งฆ่าเชื้อหรืออัปเดตจัดส่งทีหลังได้ทุกเคส
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="btn-glass min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#FFB59D]" />
              นำเข้าเคส (Excel / CSV)
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredCases.length === 0}
            className="btn-glass min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
            ส่งออก Excel
          </button>

          {canWrite && (
            <button
              type="button"
              onClick={openCreateModal}
              className="btn-luxury-orange min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              รับเคสใหม่
            </button>
          )}
        </div>
      </div>

      {/* Read-only notice for Executive role */}
      {!canWrite && (
        <div className="glass-panel rounded-2xl px-4 py-3 text-xs text-[#FFCF90] flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            โหมดอ่านและส่งออกรายงานสำหรับผู้บริหาร — เฉพาะแอดมินออฟฟิศ ผู้จัดการ และผู้ดูแลระบบเท่านั้นที่สามารถเพิ่มหรือแก้ไขเคสได้
          </span>
        </div>
      )}

      {/* KPI Summary Cards (4 Glass Cards matching Color Legend) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#C8B6AE]">
            <span>เคสทั้งหมดในทะเบียน</span>
            <ClipboardList className="w-4 h-4 text-[#FFB59D]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-2xl sm:text-3xl font-bold text-white">
              {stats.total.toLocaleString('th-TH')}
            </span>
            <span className="text-xs text-[#8E97AB]">เคส</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] font-mono tabular-nums text-[#FFCF90]">
            มูลค่ารวม {formatCurrency(stats.totalValue)}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')
          }
          className={`text-left glass-panel rounded-2xl p-4 border-l-4 border-l-white/90 transition-all cursor-pointer ${
            statusFilter === 'in_progress' ? 'ring-1 ring-white/50' : ''
          }`}
        >
          <div className="flex items-center justify-between text-xs text-white/90">
            <span className="font-semibold">สีขาว · ระหว่างทำ/รอรับเคส</span>
            <Package className="w-4 h-4 text-white/80" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-2xl sm:text-3xl font-bold text-white">
              {stats.inProgress}
            </span>
            <span className="text-xs text-[#B5BDCB]">เคส</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] text-[#B5BDCB]">
            รอออกแบบ ผลิต หรือรอส่งฆ่าเชื้อ
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'sterilizing' ? 'all' : 'sterilizing')
          }
          className={`text-left glass-panel rounded-2xl p-4 border-l-4 border-l-sky-400 transition-all cursor-pointer ${
            statusFilter === 'sterilizing' ? 'ring-1 ring-sky-400/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-xs text-sky-300">
            <span className="font-semibold">สีน้ำเงิน · ส่งชิ้นงานฆ่าเชื้อ</span>
            <FlaskConical className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-2xl sm:text-3xl font-bold text-sky-300">
              {stats.sterilizing}
            </span>
            <span className="text-xs text-[#B5BDCB]">เคส</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] text-[#B5BDCB]">
            อยู่ระหว่างฉายรังสี / รอผล Cert No.
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')
          }
          className={`text-left glass-panel rounded-2xl p-4 border-l-4 border-l-emerald-400 transition-all cursor-pointer ${
            statusFilter === 'delivered' ? 'ring-1 ring-emerald-400/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span className="font-semibold">สีเขียว · งานจัดส่งแล้ว</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="apple-stat text-2xl sm:text-3xl font-bold text-emerald-300">
              {stats.delivered}
            </span>
            <span className="text-xs text-[#B5BDCB]">เคส</span>
          </div>
          <div className="mt-2 pt-2 border-t border-white/[0.06] text-[11px] text-[#B5BDCB]">
            จัดส่ง รพ./เคอรี่/EMS เรียบร้อยแล้ว
          </div>
        </button>
      </section>

      {/* Filter Bar & Status Color Legend */}
      <div className="apple-glass-subtle rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `ทั้งหมด (${stats.total})`, dot: null },
              { id: 'in_progress', label: `สีขาว: ระหว่างทำ (${stats.inProgress})`, dot: '#F8FAFC' },
              { id: 'sterilizing', label: `สีน้ำเงิน: ฆ่าเชื้อ (${stats.sterilizing})`, dot: '#38BDF8' },
              { id: 'delivered', label: `สีเขียว: จัดส่งแล้ว (${stats.delivered})`, dot: '#34D399' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#262A34] text-[#FFB59D] ring-1 ring-[#FFB59D]/35'
                  : 'text-[#B5BDCB] hover:text-white bg-white/[0.03]'
              }`}
            >
              {tab.dot && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tab.dot }}
                />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 lg:max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8E97AB] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่รับงาน, HN, ชื่อคนไข้, บาร์โค้ด, รพ., หมอ, Cert No..."
              className="glass-input w-full h-9 pl-9 pr-3 text-xs rounded-xl"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(
                e.target.value === 'all' ? 'all' : (Number(e.target.value) as HospitalCategoryCode)
              )
            }
            aria-label="กรองประเภทโรงพยาบาล"
            className="glass-input h-9 px-2.5 text-xs rounded-xl cursor-pointer"
          >
            <option value="all">ทุกประเภท รพ.</option>
            <option value={1}>รัฐบาล (1)</option>
            <option value={2}>เอกชน (2)</option>
            <option value={3}>คลินิก (3)</option>
          </select>

          <select
            value={receiverFilter}
            onChange={(e) => setReceiverFilter(e.target.value)}
            aria-label="กรองผู้รับเคส"
            className="glass-input h-9 px-2.5 text-xs rounded-xl cursor-pointer"
          >
            <option value="all">ผู้รับเคสทุกคน</option>
            {receiversList.map((r) => (
              <option key={r} value={r}>
                รับเคส: {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Office Cases Ledger Table + Mobile Cards */}
      <section className="glass-panel rounded-2xl overflow-hidden">
        {filteredCases.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <ClipboardList className="w-9 h-9 text-[#8E97AB] mx-auto" />
            <div className="text-sm font-semibold text-white">
              {officeCases.length === 0
                ? 'ยังไม่มีรายการเคสออฟฟิศในฐานข้อมูล'
                : 'ไม่พบเคสตามคำค้นหาหรือเงื่อนไขสีสถานะที่เลือก'}
            </div>
            <p className="text-xs text-[#B5BDCB] max-w-md mx-auto">
              {officeCases.length === 0
                ? 'กดปุ่ม "นำเข้าจาก Excel / CSV" หรือกด "รับเคสใหม่" เพื่อเริ่มบันทึกข้อมูลเคสจริงและอัปเดตสถานะจัดส่งได้ทันที'
                : 'ลองล้างคำค้นหาหรือเปลี่ยนตัวกรองสถานะด้านบน'}
            </p>
            {officeCases.length === 0 && canWrite && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="btn-glass px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#FFB59D]" />
                  นำเข้าจาก Excel / CSV
                </button>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="btn-luxury-orange px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  รับเคสใหม่
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="divide-y divide-white/[0.06] lg:hidden">
              {paginatedCases.map((item) => {
                const statusMeta = OFFICE_WORKFLOW_META[item.workflowStatus];
                const fullName = `${item.patientPrefix} ${item.patientFirstName} ${item.patientLastName}`.trim();

                return (
                  <div
                    key={item.id}
                    className={`p-4 space-y-2.5 border-l-4 ${statusMeta.borderClass} ${statusMeta.rowTintClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs">
                          {item.salesSeqNo > 0 && (
                            <span className="font-mono font-bold text-[#FFCF90]">
                              #{item.salesSeqNo}
                            </span>
                          )}
                          <span className="font-mono font-semibold text-white">
                            {getDisplayJobTitle(item)}
                          </span>
                          <span className={`font-semibold ${statusMeta.textClass}`}>
                            · {statusMeta.colorName}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-white mt-1 truncate">
                          {fullName || (
                            <span className="text-[#8E97AB] font-normal">ยังไม่ระบุชื่อคนไข้</span>
                          )}{' '}
                          {item.patientHN ? `(HN ${item.patientHN})` : ''}
                        </div>
                        <div className="text-xs text-[#B5BDCB] mt-0.5 truncate">
                          {item.hospitalName || 'ยังไม่ระบุโรงพยาบาล'} · {item.doctorName || 'ยังไม่ระบุแพทย์'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-mono font-bold tabular-nums text-[#FFCF90]">
                          {item.price > 0 ? formatCurrency(item.price) : 'รอราคา'}
                        </div>
                        <div className="text-[11px] font-mono text-[#8E97AB]">
                          {item.productCode || 'รอระบุรหัสสินค้า'}
                          {item.sidePosition ? ` · ${item.sidePosition}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-[#C8B6AE] flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>รับงาน: {item.receivedDate || '-'}</span>
                      <span>ผ่าตัด: {item.surgeryDate || '-'}</span>
                      <span>รับเคส: {item.caseReceiver || '-'}</span>
                      {item.certificateNo && (
                        <span className="font-mono text-sky-300">Cert: {item.certificateNo}</span>
                      )}
                      {item.deliveryDate && (
                        <span className="text-emerald-300">
                          ส่ง {item.deliveryDate} ({item.deliveryChannel || '-'})
                        </span>
                      )}
                    </div>

                    {/* Quick Stage Update Controls on Mobile */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {canWrite && item.workflowStatus !== 'delivered' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openQuickStageModal(item, 'sterilizing')}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FlaskConical className="w-3.5 h-3.5" />
                              {item.workflowStatus === 'sterilizing' ? 'อัปเดตฆ่าเชื้อ' : 'ส่งฆ่าเชื้อ'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openQuickStageModal(item, 'delivered')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              อัปเดตจัดส่ง
                            </button>
                          </>
                        )}
                        {canWrite && item.workflowStatus === 'delivered' && (
                          <button
                            type="button"
                            onClick={() => openQuickStageModal(item, 'delivered')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            อัปเดต EMS/การเงิน
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingCase(item)}
                          className="p-2 rounded-lg text-[#FFB59D] hover:text-white hover:bg-white/[0.08] cursor-pointer"
                          aria-label="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg text-[#e3beb3]/80 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                            aria-label="แก้ไขข้อมูลทั้งหมด"
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

            {/* Desktop Production Ledger Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1160px]">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-wider text-[#C8B6AE]">
                    <th className="py-3.5 px-4">ลำดับ / เลขที่รับงาน</th>
                    <th className="py-3.5 px-4">คนไข้ / HN / บาร์โค้ด</th>
                    <th className="py-3.5 px-4">โรงพยาบาล / แพทย์</th>
                    <th className="py-3.5 px-4">ชิ้นงาน & การผลิต</th>
                    <th className="py-3.5 px-4">ฆ่าเชื้อ / รังสี (kGy)</th>
                    <th className="py-3.5 px-4">จัดส่ง / ราคาชิ้นงาน</th>
                    <th className="py-3.5 px-4">อัปเดตขั้นตอนด่วน</th>
                    <th className="py-3.5 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-xs">
                  {paginatedCases.map((item) => {
                    const statusMeta = OFFICE_WORKFLOW_META[item.workflowStatus];
                    const fullName = `${item.patientPrefix} ${item.patientFirstName} ${item.patientLastName}`.trim();
                    const paymentLabels = item.paymentChannels
                      .map(
                        (ch) =>
                          OFFICE_PAYMENT_CHANNELS.find((p) => p.id === ch)?.shortLabel || ch
                      )
                      .join(', ');

                    return (
                      <tr
                        key={item.id}
                        className={`border-l-4 ${statusMeta.borderClass} ${statusMeta.rowTintClass} hover:bg-white/[0.05] transition-colors`}
                      >
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono font-bold text-white text-sm">
                            {getDisplayJobTitle(item)}
                          </div>
                          <div className="text-[11px] font-mono text-[#FFCF90] mt-0.5">
                            {item.salesSeqNo > 0 ? `ลำดับ #${item.salesSeqNo}` : 'รอเลขลำดับ'}
                            {item.monthlySeq > 0 ? ` · เดือนที่ ${item.monthlySeq}` : ''}
                          </div>
                          <div className="text-[11px] text-[#8E97AB] mt-0.5">
                            รับงาน {item.receivedDate || '-'} · {item.caseReceiver || '-'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-white text-sm">
                            {fullName || (
                              <span className="text-[#8E97AB] font-normal">รอระบุชื่อคนไข้</span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-[#B5BDCB] mt-0.5">
                            HN: {item.patientHN || '-'}
                            {item.patientAge ? ` · อายุ ${item.patientAge}` : ''}
                          </div>
                          {item.barcode && (
                            <div className="font-mono text-[10px] text-[#8E97AB] mt-0.5">
                              {item.barcode}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-[220px]">
                          <div className="font-semibold text-white truncate">
                            {item.hospitalName || (
                              <span className="text-[#8E97AB] font-normal">รอระบุโรงพยาบาล</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#FFB59D] mt-0.5 truncate">
                            {item.doctorName || 'รอระบุแพทย์'}
                          </div>
                          <div className="text-[11px] text-[#8E97AB] mt-0.5">
                            {HOSPITAL_CATEGORY_LABELS[item.hospitalCategory]} · ผ่าตัด{' '}
                            {item.surgeryDate || 'ยังไม่ระบุ'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top max-w-[210px]">
                          <div className="font-mono font-semibold text-[#DFE2EF]">
                            {item.productCode || 'รอระบุรหัสสินค้า'}
                            {item.sidePosition ? ` · ${item.sidePosition}` : ''}
                          </div>
                          <div className="text-[11px] text-[#B5BDCB] mt-0.5">
                            {item.anatomicalArea || '-'} · {item.materialType || '-'} (RP:{item.rpModelQty}/Imp:{item.implantQty})
                          </div>
                          <div className="text-[11px] text-[#8E97AB] mt-0.5 line-clamp-1">
                            {item.productionSpec || item.temporalSpec || 'รอรายละเอียดการผลิต'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono text-[#DFE2EF]">
                            ส่ง: {item.sterilizeOutDate || '-'}
                          </div>
                          {item.certificateNo && (
                            <div className="font-mono text-[11px] text-sky-300 mt-0.5">
                              {item.certificateNo}
                            </div>
                          )}
                          {(item.radiationMinKgy || item.radiationMaxKgy) && (
                            <div className="font-mono text-[11px] text-[#B5BDCB] mt-0.5">
                              {item.radiationMinKgy || '-'}–{item.radiationMaxKgy || '-'} kGy
                              {item.doseUniformity ? ` (DU ${item.doseUniformity})` : ''}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono font-bold text-[#FFCF90] text-sm">
                            {item.price > 0 ? formatCurrency(item.price) : 'รอระบุราคา'}
                          </div>
                          <div className="text-[11px] text-[#B5BDCB] mt-0.5">
                            {item.deliveryDate
                              ? `ส่ง ${item.deliveryDate} · ${item.deliveryChannel || '-'} (${item.deliveredBy || '-'})`
                              : 'ยังไม่จัดส่ง'}
                          </div>
                          <div className="text-[11px] text-[#8E97AB] mt-0.5 truncate max-w-[175px]">
                            {item.emsTrackingNo
                              ? `EMS: ${item.emsTrackingNo}`
                              : paymentLabels || item.paymentDetails || '-'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top">
                          {canWrite ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                {item.workflowStatus !== 'delivered' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openQuickStageModal(item, 'sterilizing')}
                                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                                    >
                                      <FlaskConical className="w-3 h-3" />
                                      {item.workflowStatus === 'sterilizing' ? 'ฆ่าเชื้อ/Cert' : 'ส่งฆ่าเชื้อ'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openQuickStageModal(item, 'delivered')}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                                    >
                                      <Truck className="w-3 h-3" />
                                      จัดส่งแล้ว
                                    </button>
                                  </>
                                )}
                                {item.workflowStatus === 'delivered' && (
                                  <button
                                    type="button"
                                    onClick={() => openQuickStageModal(item, 'delivered')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
                                  >
                                    <Truck className="w-3 h-3" />
                                    อัปเดตจัดส่ง/EMS
                                  </button>
                                )}
                              </div>
                              <select
                                value={item.workflowStatus}
                                disabled={
                                  (item.workflowStatus === 'delivered' && !isAdmin) ||
                                  updatingCaseId === item.id
                                }
                                onChange={(e) =>
                                  void handleInlineStatusChange(
                                    item,
                                    e.target.value as OfficeCaseWorkflowStatus
                                  )
                                }
                                aria-label="เปลี่ยนสีสถานะเคส"
                                className={`glass-input h-7 px-2 text-[11px] font-semibold rounded-lg cursor-pointer disabled:opacity-70 w-full ${statusMeta.textClass}`}
                              >
                                <option value="in_progress">สีขาว · ระหว่างทำ</option>
                                <option value="sterilizing">สีน้ำเงิน · ฆ่าเชื้อ</option>
                                <option value="delivered">สีเขียว · จัดส่งแล้ว</option>
                              </select>
                            </div>
                          ) : (
                            <span className={`font-semibold ${statusMeta.textClass}`}>
                              {statusMeta.colorName} · {statusMeta.shortLabel}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingCase(item)}
                              title="ดูรายละเอียดครบทุกช่อง"
                              className="p-2 rounded-lg text-[#B5BDCB] hover:text-white hover:bg-white/[0.08] cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                title="แก้ไขหรือเติมข้อมูลเคส"
                                className="p-2 rounded-lg text-[#B5BDCB] hover:text-[#FFB59D] hover:bg-white/[0.08] cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteCase(item)}
                                title="ลบเคส (เฉพาะผู้ดูแลระบบ)"
                                className="p-2 rounded-lg text-[#8E97AB] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
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

            {/* Pagination Footer Bar */}
            <div className="px-4 py-3 border-t border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#C8B6AE]">
              <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                <span>
                  แสดง{' '}
                  <strong className="text-white">
                    {pageRangeStart.toLocaleString('th-TH')}–{pageRangeEnd.toLocaleString('th-TH')}
                  </strong>{' '}
                  จาก{' '}
                  <strong className="text-white">
                    {filteredCases.length.toLocaleString('th-TH')}
                  </strong>{' '}
                  เคส
                </span>
                {filteredCases.length !== officeCases.length && (
                  <span className="text-[#8E97AB]">
                    (ทั้งหมด {officeCases.length.toLocaleString('th-TH')} เคสในระบบ)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
                  aria-label="จำนวนรายการต่อหน้า"
                  className="glass-input h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                >
                  <option value={25}>25 รายการ/หน้า</option>
                  <option value={50}>50 รายการ/หน้า</option>
                  <option value={100}>100 รายการ/หน้า</option>
                </select>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="btn-glass h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-35"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    ก่อนหน้า
                  </button>
                  <span className="px-2.5 font-mono tabular-nums text-white text-xs">
                    หน้า {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="btn-glass h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-35"
                  >
                    ถัดไป
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Modal 1: Quick Stage Update (Sterilizing / Delivery) */}
      {quickModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="glass-panel rounded-3xl w-full max-w-xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        quickModal.mode === 'delivered' ? '#34D399' : '#38BDF8',
                    }}
                  />
                  <span
                    className={
                      quickModal.mode === 'delivered'
                        ? 'text-emerald-300 font-semibold'
                        : 'text-sky-300 font-semibold'
                    }
                  >
                    {quickModal.mode === 'delivered'
                      ? 'อัปเดตสถานะจัดส่ง (สีเขียว · งานจัดส่งแล้ว)'
                      : 'อัปเดตส่งฆ่าเชื้อ / ค่ารังสี (สีน้ำเงิน · ส่งชิ้นงานฆ่าเชื้อ)'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  เคส {getDisplayJobTitle(quickModal.caseItem)}
                  {quickModal.caseItem.hospitalName
                    ? ` · ${quickModal.caseItem.hospitalName}`
                    : ''}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                aria-label="ปิดหน้าต่างอัปเดตสถานะ"
                className="p-2 rounded-xl text-[#8E97AB] hover:text-white hover:bg-white/[0.08] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              noValidate
              onSubmit={handleSaveQuickStage}
              className="flex-1 overflow-y-auto p-5 space-y-4"
            >
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-xs text-[#C8B6AE]">
                กรอกเฉพาะช่องที่มีข้อมูลตอนนี้แล้วกดบันทึกได้เลย (ไม่บังคับกรอกทุกช่อง สามารถกลับมาเติมเพิ่มภายหลังได้)
              </div>

              {quickModal.mode === 'sterilizing' ? (
                <div className="space-y-3.5">
                  {quickRadiationQaState && (
                    <div
                      className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${
                        quickRadiationQaState === 'pass'
                          ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-400/25'
                          : 'bg-amber-500/12 text-amber-300 border border-amber-400/25'
                      }`}
                    >
                      {quickRadiationQaState === 'pass'
                        ? 'ค่ารังสีผ่านเกณฑ์มาตรฐาน 15–35 kGy'
                        : 'กรุณาตรวจสอบค่า kGy (อยู่นอกช่วงมาตรฐาน 15–35 kGy)'}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        วันส่งออกฆ่าเชื้อ (พ.ศ.)
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        disabled={
                          quickModal.caseItem.workflowStatus === 'delivered' && !isAdmin
                        }
                        value={quickData.sterilizeOutDate}
                        onChange={(e) =>
                          setQuickData({ ...quickData, sterilizeOutDate: e.target.value })
                        }
                        placeholder="เช่น 19/11/2569"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        วันรับเข้า (หลังฆ่าเชื้อ)
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        value={quickData.sterilizeReturnDate}
                        onChange={(e) =>
                          setQuickData({ ...quickData, sterilizeReturnDate: e.target.value })
                        }
                        placeholder="กรอกภายหลังได้"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ปริมาณรังสีต่ำสุด (kGy)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={quickData.radiationMinKgy}
                        onChange={(e) =>
                          handleQuickRadiationChange('radiationMinKgy', e.target.value)
                        }
                        placeholder="เช่น 23.27"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ปริมาณรังสีสูงสุด (kGy)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={quickData.radiationMaxKgy}
                        onChange={(e) =>
                          handleQuickRadiationChange('radiationMaxKgy', e.target.value)
                        }
                        placeholder="เช่น 25.38"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        Dose Uniformity (คำนวณอัตโนมัติ)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={quickData.doseUniformity}
                        onChange={(e) =>
                          setQuickData({ ...quickData, doseUniformity: e.target.value })
                        }
                        placeholder="เช่น 1.09"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        วันรับเข้า QA
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        value={quickData.qcReceiveDate}
                        onChange={(e) =>
                          setQuickData({ ...quickData, qcReceiveDate: e.target.value })
                        }
                        placeholder="กรอกภายหลังได้"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        Certificate No.
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={quickData.certificateNo}
                        onChange={(e) =>
                          setQuickData({ ...quickData, certificateNo: e.target.value })
                        }
                        placeholder="เช่น NCR0046/2570"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        หมายเหตุเพิ่มเติม
                      </label>
                      <input
                        type="text"
                        maxLength={600}
                        value={quickData.remarks}
                        onChange={(e) =>
                          setQuickData({ ...quickData, remarks: e.target.value })
                        }
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      วันที่ส่งงาน (พ.ศ.)
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={quickData.deliveryDate}
                      onChange={(e) =>
                        setQuickData({ ...quickData, deliveryDate: e.target.value })
                      }
                      placeholder="เช่น 19/11/2569"
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ส่งที่ / ช่องทางจัดส่ง
                    </label>
                    <input
                      type="text"
                      list="ctec-delivery-channels-quick"
                      maxLength={60}
                      value={quickData.deliveryChannel}
                      onChange={(e) =>
                        setQuickData({ ...quickData, deliveryChannel: e.target.value })
                      }
                      placeholder="เช่น รพ., เคอรี่, EMS"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                    />
                    <datalist id="ctec-delivery-channels-quick">
                      {DELIVERY_CHANNELS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ผู้นำส่ง
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={quickData.deliveredBy}
                      onChange={(e) =>
                        setQuickData({ ...quickData, deliveredBy: e.target.value })
                      }
                      placeholder="เช่น ต่าย, ยุ้ย"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      เลขที่ EMS / Tracking
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={quickData.emsTrackingNo}
                      onChange={(e) =>
                        setQuickData({ ...quickData, emsTrackingNo: e.target.value })
                      }
                      placeholder="กรอกเมื่อมีเลขพัสดุ"
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ราคาชิ้นงาน (บาท)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={quickData.price || ''}
                      onChange={(e) =>
                        setQuickData({ ...quickData, price: Number(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      รายละเอียดการจ่ายเงิน
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={quickData.paymentDetails}
                      onChange={(e) =>
                        setQuickData({ ...quickData, paymentDetails: e.target.value })
                      }
                      placeholder="เช่น จ่ายผ่าน รพ. / โอนครบแล้ว"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ข้อมูลการส่งของ / ที่อยู่โรงพยาบาล
                    </label>
                    <textarea
                      rows={2}
                      maxLength={600}
                      value={quickData.shippingInfo}
                      onChange={(e) =>
                        setQuickData({ ...quickData, shippingInfo: e.target.value })
                      }
                      placeholder="ชื่อผู้รับ / ห้องผ่าตัด / ที่อยู่จัดส่ง"
                      className="glass-input w-full p-3 text-sm rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      หมายเหตุ
                    </label>
                    <input
                      type="text"
                      maxLength={600}
                      value={quickData.remarks}
                      onChange={(e) =>
                        setQuickData({ ...quickData, remarks: e.target.value })
                      }
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="btn-glass px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  className={`px-5 py-2 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 text-white transition-all ${
                    quickModal.mode === 'delivered'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_6px_18px_rgba(16,185,129,0.35)]'
                      : 'bg-sky-600 hover:bg-sky-500 shadow-[0_6px_18px_rgba(14,165,233,0.35)]'
                  }`}
                >
                  {quickSubmitting
                    ? 'กำลังอัปเดต...'
                    : quickModal.mode === 'delivered'
                      ? 'ยืนยันจัดส่งแล้ว (สีเขียว)'
                      : 'บันทึกส่งฆ่าเชื้อ (สีน้ำเงิน)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Full Multi-Section Office Case Entry / Edit Form */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="glass-panel rounded-3xl w-full max-w-4xl shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {editingCase
                    ? `แก้ไข / อัปเดตเคส · ${getDisplayJobTitle(editingCase)}`
                    : 'รับเคสใหม่ — กรอกเฉพาะข้อมูลที่มีแล้วบันทึกได้เลย'}
                </h2>
                <p className="text-xs text-[#B5BDCB] mt-0.5">
                  ไม่บังคับกรอกครบทุกช่อง — กรอกบางส่วนเพื่อเก็บเข้าระบบก่อน แล้วกลับมาอัปเดตส่งฆ่าเชื้อหรือจัดส่งภายหลังได้ทุกเมื่อ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                aria-label="ปิดหน้าต่างกรอกข้อมูล"
                className="p-2 rounded-xl text-[#8E97AB] hover:text-white hover:bg-white/[0.08] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section Navigation Tabs inside Modal */}
            <div className="px-5 py-2.5 bg-[#0A0E17]/75 border-b border-white/[0.08] flex items-center gap-1.5 overflow-x-auto">
              {FORM_SECTIONS.map((sec) => {
                const locked =
                  isEditingDeliveredLocked &&
                  sec.id !== 'delivery' &&
                  sec.id !== 'payment' &&
                  sec.id !== 'sterilize';
                const filledCount = sectionCounts[sec.id];
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setFormSection(sec.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      formSection === sec.id
                        ? 'bg-[#FF5E1E] text-white shadow-[0_4px_14px_rgba(255,94,30,0.4)]'
                        : 'text-[#B5BDCB] hover:text-white bg-white/[0.04]'
                    }`}
                  >
                    {locked && <Lock className="w-3 h-3 opacity-70" />}
                    <span className="hidden sm:inline">{sec.label}</span>
                    <span className="sm:hidden">{sec.shortLabel}</span>
                    {filledCount > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          formSection === sec.id
                            ? 'bg-black/25 text-white'
                            : 'bg-white/[0.08] text-[#FFCF90]'
                        }`}
                      >
                        {filledCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isEditingDeliveredLocked && (
              <div className="mx-5 mt-3 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/25 text-xs text-emerald-200 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  เคสนี้จัดส่งแล้ว (สีเขียว) — แอดมินออฟฟิศสามารถอัปเดตเพิ่มเติมในหมวด การเงิน ฆ่าเชื้อ/Cert และจัดส่ง/EMS ได้ (ข้อมูลคนไข้/ชิ้นงานล็อกเพื่อความปลอดภัย)
                </span>
              </div>
            )}

            <form
              noValidate
              onSubmit={handleSaveForm}
              className="flex-1 overflow-y-auto p-5 space-y-5"
            >
              {/* SECTION 1: QUICK INTAKE / CORE INFO (All Optional!) */}
              {formSection === 'intake' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        เลขที่รับงาน (ไม่บังคับ · เช่น 2569-493)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        disabled={isEditingDeliveredLocked}
                        value={formData.jobNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, jobNumber: e.target.value })
                        }
                        placeholder="ปล่อยว่างหรือแก้ทีหลังได้"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ลำดับขายทั้งหมด
                      </label>
                      <input
                        type="number"
                        min={0}
                        disabled={isEditingDeliveredLocked}
                        value={formData.salesSeqNo || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salesSeqNo: Number(e.target.value) || 0,
                          })
                        }
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ลำดับแต่ละเดือน
                      </label>
                      <input
                        type="number"
                        min={0}
                        disabled={isEditingDeliveredLocked}
                        value={formData.monthlySeq || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            monthlySeq: Number(e.target.value) || 0,
                          })
                        }
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        โรงพยาบาล
                      </label>
                      <input
                        type="text"
                        list="ctec-hospital-datalist"
                        maxLength={180}
                        disabled={isEditingDeliveredLocked}
                        value={formData.hospitalName}
                        onChange={(e) =>
                          setFormData({ ...formData, hospitalName: e.target.value })
                        }
                        placeholder="พิมพ์หรือเลือกชื่อโรงพยาบาล (ไม่บังคับ)"
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                      />
                      <datalist id="ctec-hospital-datalist">
                        {hospitalSuggestions.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ประเภทโรงพยาบาล
                      </label>
                      <select
                        disabled={isEditingDeliveredLocked}
                        value={formData.hospitalCategory}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hospitalCategory: Number(e.target.value) as HospitalCategoryCode,
                          })
                        }
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                      >
                        <option value={1}>รัฐบาล (1)</option>
                        <option value={2}>เอกชน (2)</option>
                        <option value={3}>คลินิก (3)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        คำนำหน้า
                      </label>
                      <select
                        disabled={isEditingDeliveredLocked}
                        value={formData.patientPrefix}
                        onChange={(e) =>
                          setFormData({ ...formData, patientPrefix: e.target.value })
                        }
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                      >
                        {PATIENT_PREFIXES.map((p) => (
                          <option key={p || 'empty'} value={p}>
                            {p || '— ไม่ระบุ —'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ชื่อคนไข้
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        disabled={isEditingDeliveredLocked}
                        value={formData.patientFirstName}
                        onChange={(e) =>
                          setFormData({ ...formData, patientFirstName: e.target.value })
                        }
                        placeholder="กรอกภายหลังได้"
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        นามสกุล
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        disabled={isEditingDeliveredLocked}
                        value={formData.patientLastName}
                        onChange={(e) =>
                          setFormData({ ...formData, patientLastName: e.target.value })
                        }
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        รหัสผู้ป่วย (HN)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        disabled={isEditingDeliveredLocked}
                        value={formData.patientHN}
                        onChange={(e) =>
                          setFormData({ ...formData, patientHN: e.target.value })
                        }
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        แพทย์ผู้ผ่าตัด (หมอ)
                      </label>
                      <input
                        type="text"
                        maxLength={150}
                        disabled={isEditingDeliveredLocked}
                        value={formData.doctorName}
                        onChange={(e) =>
                          setFormData({ ...formData, doctorName: e.target.value })
                        }
                        placeholder="เช่น แพทย์หญิงนภาภรณ์ พุ่มมรินทร์"
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        วันรับงาน (พ.ศ.)
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        disabled={isEditingDeliveredLocked}
                        value={formData.receivedDate}
                        onChange={(e) =>
                          setFormData({ ...formData, receivedDate: e.target.value })
                        }
                        placeholder="เช่น 6/11/2569"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        วันผ่าตัด (พ.ศ.)
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        disabled={isEditingDeliveredLocked}
                        value={formData.surgeryDate}
                        onChange={(e) =>
                          setFormData({ ...formData, surgeryDate: e.target.value })
                        }
                        placeholder="กรอกเมื่อทราบนัดผ่าตัด"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ผู้รับเคส (ออฟฟิศ)
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        disabled={isEditingDeliveredLocked}
                        value={formData.caseReceiver}
                        onChange={(e) =>
                          setFormData({ ...formData, caseReceiver: e.target.value })
                        }
                        placeholder="เช่น ยุ้ย, คิว"
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                      />
                    </div>
                  </div>

                  {/* Color Status Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white">
                        สถานะสีของเคส (เปลี่ยนอัปเดตภายหลังได้ตลอด)
                      </label>
                      {!isEditingDeliveredLocked && (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              workflowStatus: inferWorkflowStatus(
                                prev.deliveryDate,
                                prev.sterilizeOutDate
                              ),
                            }))
                          }
                          className="text-[11px] text-[#FFB59D] hover:underline cursor-pointer"
                        >
                          กำหนดสีอัตโนมัติตามวันที่กรอก
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {(['in_progress', 'sterilizing', 'delivered'] as const).map((st) => {
                        const meta = OFFICE_WORKFLOW_META[st];
                        const active = formData.workflowStatus === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            disabled={isEditingDeliveredLocked}
                            onClick={() => setFormData({ ...formData, workflowStatus: st })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-60 ${
                              active
                                ? 'bg-white/[0.1] border-[#FFB59D]/60 ring-1 ring-[#FFB59D]/40'
                                : 'bg-[#0A0E17]/60 border-white/[0.08] hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: meta.dotColor }}
                              />
                              <span className={`text-xs font-bold ${meta.textClass}`}>
                                {meta.colorName}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#B5BDCB] mt-1">
                              {meta.shortLabel}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: IMPLANT, PRODUCTION & CONTACT DETAILS */}
              {formSection === 'implant' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      รหัสสินค้า
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      disabled={isEditingDeliveredLocked}
                      value={formData.productCode}
                      onChange={(e) =>
                        setFormData({ ...formData, productCode: e.target.value })
                      }
                      placeholder="เช่น CTPMMA-003"
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ใบวางแผนผลิต
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      disabled={isEditingDeliveredLocked}
                      value={formData.productionPlanNo}
                      onChange={(e) =>
                        setFormData({ ...formData, productionPlanNo: e.target.value })
                      }
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      รหัสบาร์โค้ด
                    </label>
                    <input
                      type="text"
                      maxLength={64}
                      disabled={isEditingDeliveredLocked}
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value })
                      }
                      placeholder="*885959949xxxx*"
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ตำแหน่ง (LEFT / RIGHT)
                    </label>
                    <select
                      disabled={isEditingDeliveredLocked}
                      value={formData.sidePosition}
                      onChange={(e) =>
                        setFormData({ ...formData, sidePosition: e.target.value })
                      }
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                    >
                      {SIDE_POSITIONS.map((pos) => (
                        <option key={pos || 'empty'} value={pos}>
                          {pos || '— ยังไม่ระบุ —'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      บริเวณที่สร้าง
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      disabled={isEditingDeliveredLocked}
                      value={formData.anatomicalArea}
                      onChange={(e) =>
                        setFormData({ ...formData, anatomicalArea: e.target.value })
                      }
                      placeholder="เช่น กะโหลกศีรษะ"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ประเภทการผ่าตัด
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      disabled={isEditingDeliveredLocked}
                      value={formData.surgeryType}
                      onChange={(e) =>
                        setFormData({ ...formData, surgeryType: e.target.value })
                      }
                      placeholder="เช่น Reconstruction"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ลักษณะชิ้นงาน (วัสดุ)
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      disabled={isEditingDeliveredLocked}
                      value={formData.materialType}
                      onChange={(e) =>
                        setFormData({ ...formData, materialType: e.target.value })
                      }
                      placeholder="เช่น PMMA / PEEK / Titanium"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        RP model
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={isEditingDeliveredLocked}
                        value={formData.rpModelQty}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            rpModelQty: Number(e.target.value) || 0,
                          })
                        }
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        Implant
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={isEditingDeliveredLocked}
                        value={formData.implantQty}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            implantQty: Number(e.target.value) || 0,
                          })
                        }
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      อายุคนไข้
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      disabled={isEditingDeliveredLocked}
                      value={formData.patientAge}
                      onChange={(e) =>
                        setFormData({ ...formData, patientAge: e.target.value })
                      }
                      placeholder="เช่น 45 ปี"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      เบอร์คนไข้
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      disabled={isEditingDeliveredLocked}
                      value={formData.patientPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, patientPhone: e.target.value })
                      }
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      เบอร์แพทย์
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      disabled={isEditingDeliveredLocked}
                      value={formData.doctorPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, doctorPhone: e.target.value })
                      }
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      Temporal
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      disabled={isEditingDeliveredLocked}
                      value={formData.temporalSpec}
                      onChange={(e) =>
                        setFormData({ ...formData, temporalSpec: e.target.value })
                      }
                      placeholder="เช่น ตัด Temporal / ไม่ตัด"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl disabled:opacity-55"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      สถานะการผลิต / รายละเอียดจุดยึด Fix Plate
                    </label>
                    <textarea
                      rows={3}
                      maxLength={400}
                      disabled={isEditingDeliveredLocked}
                      value={formData.productionSpec}
                      onChange={(e) =>
                        setFormData({ ...formData, productionSpec: e.target.value })
                      }
                      placeholder="เช่น แบบเฉลี่ยเพิ่ม Soft Tissue ตัด Temporal ยึดสกรูและ fix Plate ตามจุดที่มาร์ค 4 จุด"
                      className="glass-input w-full p-3 text-sm rounded-xl disabled:opacity-55"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: PAYMENT & BILLING */}
              {formSection === 'payment' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-white">
                      เงื่อนไขการชำระเงิน (เลือกได้มากกว่า 1 ช่อง ตามตาราง *)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {OFFICE_PAYMENT_CHANNELS.map((ch) => {
                        const checked = formData.paymentChannels.includes(ch.id);
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => togglePaymentChannel(ch.id)}
                            className={`px-3 py-2 rounded-xl border text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[#FF5E1E]/18 border-[#FF5E1E]/60 text-white font-semibold'
                                : 'bg-[#0A0E17]/60 border-white/[0.08] text-[#B5BDCB] hover:text-white'
                            }`}
                          >
                            <span className="truncate">{ch.label}</span>
                            {checked && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#FFCF90] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ราคาชิ้นงาน (บาท)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={formData.price || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, price: Number(e.target.value) || 0 })
                        }
                        placeholder="0"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        รหัสเอกสาร (ICR No.)
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        disabled={isEditingDeliveredLocked}
                        value={formData.icrNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, icrNumber: e.target.value })
                        }
                        placeholder="ICR0002/2569"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        รายละเอียดการจ่ายเงิน
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={formData.paymentDetails}
                        onChange={(e) =>
                          setFormData({ ...formData, paymentDetails: e.target.value })
                        }
                        placeholder="เช่น จ่ายผ่าน รพ. / โอนมัดจำแล้ว"
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        เงื่อนไขการชำระเพิ่มเติม
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={formData.paymentConditionNote}
                        onChange={(e) =>
                          setFormData({ ...formData, paymentConditionNote: e.target.value })
                        }
                        className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: STERILIZATION & GAMMA IRRADIATION QA */}
              {formSection === 'sterilize' && (
                <div className="space-y-4">
                  <div className="glass-tile rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-sky-300 font-semibold">
                      <FlaskConical className="w-4 h-4" />
                      <span>มาตรฐานการฆ่าเชื้อฉายรังสี: ช่วง 15 – 35 kGy (คำนวณ Dose Uniformity อัตโนมัติ)</span>
                    </div>
                    {radiationQaState === 'pass' && (
                      <span className="text-emerald-300 font-semibold">
                        ผ่านเกณฑ์มาตรฐาน 15–35 kGy
                      </span>
                    )}
                    {radiationQaState === 'warn' && (
                      <span className="text-amber-300 font-semibold">
                        กรุณาตรวจสอบค่า kGy (อยู่นอกช่วง 15–35)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        วันส่งออกฆ่าเชื้อ
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        disabled={isEditingDeliveredLocked}
                        value={formData.sterilizeOutDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sterilizeOutDate: e.target.value,
                            workflowStatus:
                              e.target.value.trim() && formData.workflowStatus === 'in_progress'
                                ? 'sterilizing'
                                : formData.workflowStatus,
                          })
                        }
                        placeholder="เช่น 26/10/2569"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl disabled:opacity-55"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        วันรับเข้า (ฆ่าเชื้อ)
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        value={formData.sterilizeReturnDate}
                        onChange={(e) =>
                          setFormData({ ...formData, sterilizeReturnDate: e.target.value })
                        }
                        placeholder="เช่น 26/10/2569"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        วันรับเข้าตรวจ QA
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        value={formData.qcReceiveDate}
                        onChange={(e) =>
                          setFormData({ ...formData, qcReceiveDate: e.target.value })
                        }
                        placeholder="เช่น 2/11/2569"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ปริมาณรังสีต่ำสุด (kGy) [Min 15]
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={formData.radiationMinKgy}
                        onChange={(e) =>
                          handleRadiationChange('radiationMinKgy', e.target.value)
                        }
                        placeholder="เช่น 23.27"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        ปริมาณรังสีสูงสุด (kGy) [Max 35]
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={formData.radiationMaxKgy}
                        onChange={(e) =>
                          handleRadiationChange('radiationMaxKgy', e.target.value)
                        }
                        placeholder="เช่น 25.38"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        Dose uniformity (Max ÷ Min)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={formData.doseUniformity}
                        onChange={(e) =>
                          setFormData({ ...formData, doseUniformity: e.target.value })
                        }
                        placeholder="คำนวณอัตโนมัติ เช่น 1.09"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                        Certificate No.
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={formData.certificateNo}
                        onChange={(e) =>
                          setFormData({ ...formData, certificateNo: e.target.value })
                        }
                        placeholder="เช่น NCR0046/2570"
                        className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5: DELIVERY, EMS & ADDRESSES */}
              {formSection === 'delivery' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      วันที่ส่งงาน (กรอกแล้วเปลี่ยนเป็นสีเขียวอัตโนมัติ)
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={formData.deliveryDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deliveryDate: e.target.value,
                          workflowStatus:
                            e.target.value.trim() && !isEditingDeliveredLocked
                              ? 'delivered'
                              : formData.workflowStatus,
                        })
                      }
                      placeholder="เช่น 3/11/2569"
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ส่งที่ / ช่องทางจัดส่ง
                    </label>
                    <input
                      type="text"
                      list="ctec-delivery-channels"
                      maxLength={60}
                      value={formData.deliveryChannel}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryChannel: e.target.value })
                      }
                      placeholder="เช่น เคอรี่, รพ., EMS"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                    />
                    <datalist id="ctec-delivery-channels">
                      {DELIVERY_CHANNELS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ผู้นำส่ง
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={formData.deliveredBy}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveredBy: e.target.value })
                      }
                      placeholder="เช่น ต่าย, ยุ้ย"
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      เลขที่ EMS / Tracking
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={formData.emsTrackingNo}
                      onChange={(e) =>
                        setFormData({ ...formData, emsTrackingNo: e.target.value })
                      }
                      placeholder="เช่น EF123456789TH"
                      className="glass-input w-full h-10 px-3 text-sm font-mono rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      Package
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={formData.packageInfo}
                      onChange={(e) =>
                        setFormData({ ...formData, packageInfo: e.target.value })
                      }
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      หมายเหตุ
                    </label>
                    <input
                      type="text"
                      maxLength={600}
                      value={formData.remarks}
                      onChange={(e) =>
                        setFormData({ ...formData, remarks: e.target.value })
                      }
                      className="glass-input w-full h-10 px-3 text-sm rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ข้อมูลการส่งของ / ชิ้นงาน (ชื่อหัวหน้าห้องผ่าตัดและที่อยู่โรงพยาบาล)
                    </label>
                    <textarea
                      rows={3}
                      maxLength={600}
                      value={formData.shippingInfo}
                      onChange={(e) =>
                        setFormData({ ...formData, shippingInfo: e.target.value })
                      }
                      placeholder="ระบุชื่อผู้รับ ตำแหน่ง โรงพยาบาล ที่อยู่ และเบอร์โทร"
                      className="glass-input w-full p-3 text-sm rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#E3BEB3] mb-1">
                      ข้อมูลการส่งใบเสร็จที่บ้านของคนไข้
                    </label>
                    <textarea
                      rows={2}
                      maxLength={600}
                      value={formData.receiptAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, receiptAddress: e.target.value })
                      }
                      placeholder="ที่อยู่จัดส่งใบเสร็จรับเงิน (กรณีคนไข้จ่ายเอง)"
                      className="glass-input w-full p-3 text-sm rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#8E97AB]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: OFFICE_WORKFLOW_META[formData.workflowStatus].dotColor,
                    }}
                  />
                  <span>{OFFICE_WORKFLOW_META[formData.workflowStatus].label}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="btn-glass px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-luxury-orange px-5 py-2 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {submitting
                      ? 'กำลังบันทึก...'
                      : editingCase
                        ? 'บันทึกการอัปเดต'
                        : 'บันทึกเคสนี้เลย'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Full Case Detail Viewer */}
      {viewingCase && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel rounded-3xl w-full max-w-2xl shadow-2xl my-auto overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: OFFICE_WORKFLOW_META[viewingCase.workflowStatus].dotColor,
                    }}
                  />
                  <span className={OFFICE_WORKFLOW_META[viewingCase.workflowStatus].textClass}>
                    {OFFICE_WORKFLOW_META[viewingCase.workflowStatus].label}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  เคส {getDisplayJobTitle(viewingCase)}
                  {viewingCase.salesSeqNo > 0 ? ` · ลำดับขาย #${viewingCase.salesSeqNo}` : ''}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingCase(null)}
                className="p-2 rounded-xl text-[#8E97AB] hover:text-white hover:bg-white/[0.08] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="glass-tile rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#FFB59D]">ข้อมูลคนไข้และโรงพยาบาล</div>
                  <div className="text-sm font-bold text-white">
                    {`${viewingCase.patientPrefix} ${viewingCase.patientFirstName} ${viewingCase.patientLastName}`.trim() ||
                      'ยังไม่ระบุชื่อคนไข้'}
                  </div>
                  <div className="text-[#B5BDCB] font-mono">
                    HN: {viewingCase.patientHN || '-'} · บาร์โค้ด: {viewingCase.barcode || '-'}
                  </div>
                  <div className="text-[#DFE2EF]">
                    {viewingCase.hospitalName || 'ยังไม่ระบุโรงพยาบาล'} (
                    {HOSPITAL_CATEGORY_LABELS[viewingCase.hospitalCategory]})
                  </div>
                  <div className="text-[#B5BDCB]">แพทย์: {viewingCase.doctorName || '-'}</div>
                </div>

                <div className="glass-tile rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#FFCF90]">ชิ้นงานและการผลิต</div>
                  <div className="text-sm font-bold text-white font-mono">
                    {viewingCase.productCode || 'ยังไม่ระบุรหัสสินค้า'}
                    {viewingCase.sidePosition ? ` · ${viewingCase.sidePosition}` : ''}
                  </div>
                  <div className="text-[#DFE2EF]">
                    {viewingCase.anatomicalArea || '-'} · {viewingCase.surgeryType || '-'} ·{' '}
                    {viewingCase.materialType || '-'}
                  </div>
                  <div className="text-[#B5BDCB]">
                    RP Model: {viewingCase.rpModelQty} · Implant: {viewingCase.implantQty} · รับเคส:{' '}
                    {viewingCase.caseReceiver || '-'}
                  </div>
                  <div className="text-[#B5BDCB]">
                    รับงาน {viewingCase.receivedDate || '-'} · ผ่าตัด {viewingCase.surgeryDate || '-'}
                  </div>
                </div>
              </div>

              <div className="glass-tile rounded-xl p-3.5 space-y-1">
                <div className="text-[11px] font-semibold text-[#FFB59D]">รายละเอียดการผลิต & Temporal</div>
                <div className="text-[#F4F6FB] leading-relaxed">
                  {viewingCase.productionSpec || viewingCase.temporalSpec || '-'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="glass-tile rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-sky-300">ฆ่าเชื้อ & ค่าฉายรังสี (kGy)</div>
                  <div className="text-[#DFE2EF] font-mono">
                    ส่งออก: {viewingCase.sterilizeOutDate || '-'} · รับเข้า: {viewingCase.sterilizeReturnDate || '-'}
                  </div>
                  <div className="text-[#DFE2EF] font-mono">
                    Min: {viewingCase.radiationMinKgy || '-'} · Max: {viewingCase.radiationMaxKgy || '-'} · DU: {viewingCase.doseUniformity || '-'}
                  </div>
                  <div className="text-sky-300 font-mono">
                    Cert No.: {viewingCase.certificateNo || '-'} (QA: {viewingCase.qcReceiveDate || '-'})
                  </div>
                </div>

                <div className="glass-tile rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-emerald-300">การจัดส่งและการชำระเงิน</div>
                  <div className="text-sm font-mono font-bold text-[#FFCF90]">
                    {viewingCase.price > 0 ? formatCurrency(viewingCase.price) : 'รอระบุราคา'}
                  </div>
                  <div className="text-[#DFE2EF]">
                    ส่งวันที่ {viewingCase.deliveryDate || '-'} · ช่องทาง {viewingCase.deliveryChannel || '-'} ({viewingCase.deliveredBy || '-'})
                  </div>
                  <div className="text-[#B5BDCB] font-mono">
                    EMS: {viewingCase.emsTrackingNo || '-'}
                  </div>
                  <div className="text-[#B5BDCB]">
                    ชำระ: {viewingCase.paymentDetails || '-'}
                  </div>
                </div>
              </div>

              {viewingCase.shippingInfo && (
                <div className="glass-tile rounded-xl p-3.5 space-y-1">
                  <div className="text-[11px] font-semibold text-[#FFCF90]">ที่อยู่จัดส่งชิ้นงาน</div>
                  <pre className="whitespace-pre-wrap font-sans text-[#DFE2EF] leading-relaxed">
                    {viewingCase.shippingInfo}
                  </pre>
                </div>
              )}

              {viewingCase.receiptAddress && (
                <div className="glass-tile rounded-xl p-3.5 space-y-1">
                  <div className="text-[11px] font-semibold text-[#B5BDCB]">ที่อยู่จัดส่งใบเสร็จคนไข้</div>
                  <pre className="whitespace-pre-wrap font-sans text-[#DFE2EF] leading-relaxed">
                    {viewingCase.receiptAddress}
                  </pre>
                </div>
              )}

              {viewingCase.remarks && (
                <div className="glass-tile rounded-xl p-3.5 space-y-1">
                  <div className="text-[11px] font-semibold text-[#B5BDCB]">หมายเหตุ</div>
                  <div className="text-[#DFE2EF]">{viewingCase.remarks}</div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-[#8E97AB]">
                อัปเดตล่าสุดโดย {viewingCase.updatedByName}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {canWrite && viewingCase.workflowStatus !== 'delivered' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingCase;
                      setViewingCase(null);
                      openQuickStageModal(target, 'delivered');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    อัปเดตจัดส่งแล้ว
                  </button>
                )}
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingCase;
                      setViewingCase(null);
                      openEditModal(target);
                    }}
                    className="btn-luxury-orange px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    แก้ไข / เติมข้อมูล
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingCase(null)}
                  className="btn-glass px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: In-App Delete Confirmation */}
      {pendingDeleteCase && (
        <div
          onClick={() => !deletingCase && setPendingDeleteCase(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl border border-rose-500/30"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">ยืนยันการลบข้อมูลเคส</h3>
              <p className="text-xs text-[#C8B6AE] leading-relaxed">
                คุณต้องการลบเคส{' '}
                <strong className="text-white">{getDisplayJobTitle(pendingDeleteCase)}</strong>
                {pendingDeleteCase.hospitalName ? ` (${pendingDeleteCase.hospitalName})` : ''}{' '}
                ออกจากระบบอย่างถาวรใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                disabled={deletingCase}
                onClick={() => setPendingDeleteCase(null)}
                className="btn-glass px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deletingCase}
                onClick={() => void handleConfirmDeleteCase()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer disabled:opacity-50 transition-colors"
              >
                {deletingCase ? 'กำลังลบ...' : 'ยืนยันลบเคส'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Import Studio Modal (Excel / CSV / Paste / Reference) */}
      <ImportOfficeCasesModal
        open={showImportModal}
        officeCases={officeCases}
        currentUser={currentUser}
        onClose={() => setShowImportModal(false)}
        onNotifyToast={onNotifyToast}
      />
    </div>
  );
};
