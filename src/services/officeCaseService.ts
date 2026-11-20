import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  getFriendlyFirestoreError,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  OFFICE_PAYMENT_CHANNELS,
  OFFICE_WORKFLOW_META,
  ORG_ID,
  type HospitalCategoryCode,
  type OfficeCase,
  type OfficeCaseWorkflowStatus,
  type OfficePaymentChannel,
  type UserProfile,
} from '../types';
import type { OfficeCaseSeedInput } from '../data/officeCaseReferenceData';
import { logAuditEvent, publishNotification } from './crmService';

const ALLOWED_PAYMENT_SET = new Set<string>(OFFICE_PAYMENT_CHANNELS.map((c) => c.id));

function clampString(val: unknown, maxLen: number): string {
  if (val === undefined || val === null) return '';
  return String(val).trim().slice(0, maxLen);
}

function clampNumber(val: unknown, min: number, max: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function sanitizePaymentChannels(channels: OfficePaymentChannel[]): OfficePaymentChannel[] {
  const unique: OfficePaymentChannel[] = [];
  for (const ch of channels) {
    if (ALLOWED_PAYMENT_SET.has(ch) && !unique.includes(ch) && unique.length < 9) {
      unique.push(ch);
    }
  }
  return unique;
}

function sanitizeHospitalCategory(code: number): HospitalCategoryCode {
  if (code === 2) return 2;
  if (code === 3) return 3;
  return 1;
}

function sanitizePayloadFields(input: OfficeCaseSeedInput) {
  return {
    salesSeqNo: clampNumber(Number(input.salesSeqNo) || 0, 0, 999999),
    jobNumber: clampString(input.jobNumber, 40),
    monthlySeq: clampNumber(Number(input.monthlySeq) || 0, 0, 9999),
    icrNumber: clampString(input.icrNumber, 40),
    hospitalCategory: sanitizeHospitalCategory(Number(input.hospitalCategory)),
    productionPlanNo: clampString(input.productionPlanNo, 60),
    barcode: clampString(input.barcode, 64),
    workflowStatus: (['in_progress', 'sterilizing', 'delivered'].includes(input.workflowStatus)
      ? input.workflowStatus
      : 'in_progress') as OfficeCaseWorkflowStatus,
    paymentChannels: sanitizePaymentChannels(input.paymentChannels || []),
    price: clampNumber(Number(input.price) || 0, 0, 100_000_000),
    paymentDetails: clampString(input.paymentDetails, 200),
    paymentConditionNote: clampString(input.paymentConditionNote, 200),
    patientPrefix: clampString(input.patientPrefix, 30),
    patientFirstName: clampString(input.patientFirstName, 120),
    patientLastName: clampString(input.patientLastName, 120),
    patientHN: clampString(input.patientHN, 40),
    patientAge: clampString(input.patientAge, 20),
    patientPhone: clampString(input.patientPhone, 40),
    hospitalName: clampString(input.hospitalName, 180),
    doctorName: clampString(input.doctorName, 150),
    doctorPhone: clampString(input.doctorPhone, 40),
    productCode: clampString(input.productCode, 60),
    sidePosition: clampString(input.sidePosition, 30),
    anatomicalArea: clampString(input.anatomicalArea, 80),
    surgeryType: clampString(input.surgeryType, 80),
    materialType: clampString(input.materialType, 60),
    rpModelQty: clampNumber(Number(input.rpModelQty) || 0, 0, 100),
    implantQty: clampNumber(Number(input.implantQty) || 0, 0, 100),
    temporalSpec: clampString(input.temporalSpec, 160),
    productionSpec: clampString(input.productionSpec, 400),
    receivedDate: clampString(input.receivedDate, 32),
    surgeryDate: clampString(input.surgeryDate, 32),
    caseReceiver: clampString(input.caseReceiver, 80),
    sterilizeOutDate: clampString(input.sterilizeOutDate, 32),
    sterilizeReturnDate: clampString(input.sterilizeReturnDate, 32),
    radiationMinKgy: clampString(input.radiationMinKgy, 20),
    radiationMaxKgy: clampString(input.radiationMaxKgy, 20),
    doseUniformity: clampString(input.doseUniformity, 20),
    qcReceiveDate: clampString(input.qcReceiveDate, 32),
    certificateNo: clampString(input.certificateNo, 60),
    deliveryDate: clampString(input.deliveryDate, 32),
    deliveryChannel: clampString(input.deliveryChannel, 60),
    deliveredBy: clampString(input.deliveredBy, 80),
    emsTrackingNo: clampString(input.emsTrackingNo, 80),
    shippingInfo: clampString(input.shippingInfo, 600),
    receiptAddress: clampString(input.receiptAddress, 600),
    packageInfo: clampString(input.packageInfo, 160),
    remarks: clampString(input.remarks, 600),
  };
}

function getCaseDisplayLabel(fields: {
  jobNumber: string;
  hospitalName: string;
  patientFirstName: string;
  salesSeqNo: number;
}): string {
  const code = fields.jobNumber || (fields.salesSeqNo > 0 ? `#${fields.salesSeqNo}` : 'เคสใหม่');
  const place = fields.hospitalName || fields.patientFirstName || 'รอยืนยันรายละเอียด';
  return `${code} · ${place}`.slice(0, 175);
}

export async function createOfficeCase(
  input: OfficeCaseSeedInput,
  actor: UserProfile,
  options?: { silent?: boolean }
): Promise<string> {
  const path = 'officeCases';
  const fields = sanitizePayloadFields(input);
  const label = getCaseDisplayLabel(fields);
  const actorUid = auth.currentUser?.uid || actor.uid;
  const actorDisplayName =
    clampString(actor.displayName || auth.currentUser?.displayName, 120) || 'แอดมินออฟฟิศ';

  try {
    const docRef = await addDoc(collection(db, path), {
      orgId: ORG_ID,
      ...fields,
      createdBy: actorUid,
      createdByName: actorDisplayName,
      updatedBy: actorUid,
      updatedByName: actorDisplayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (!options?.silent) {
      await logAuditEvent({
        action: 'บันทึกข้อมูลเคสออฟฟิศใหม่',
        targetType: 'office_case',
        targetId: docRef.id,
        targetLabel: label,
        actorId: actor.uid,
        actorName: actor.displayName,
        details: `คนไข้ ${`${fields.patientPrefix} ${fields.patientFirstName}`.trim() || '-'} · ${fields.productCode || 'Implant'} · สถานะ ${OFFICE_WORKFLOW_META[fields.workflowStatus].colorName}`,
      });

      try {
        await publishNotification({
          type: fields.workflowStatus === 'delivered' ? 'deal_won' : 'stage_update',
          title: `รับเคสออฟฟิศใหม่: ${label}`.slice(0, 178),
          message: `${actor.displayName} บันทึกเคส (${OFFICE_WORKFLOW_META[fields.workflowStatus].shortLabel}) รพ.: ${fields.hospitalName || 'ยังไม่ระบุ'} · แพทย์: ${fields.doctorName || '-'}`,
          amount: fields.price,
          caseCount: Math.max(1, fields.implantQty),
          createdBy: actor.uid,
          createdByName: actor.displayName,
        });
      } catch (notifErr) {
        console.warn('Office case notification skipped:', notifErr);
      }
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOfficeCase(
  existingCase: OfficeCase,
  input: OfficeCaseSeedInput,
  actor: UserProfile,
  options?: { silent?: boolean }
) {
  const path = `officeCases/${existingCase.id}`;
  const fields = sanitizePayloadFields(input);
  const isAdmin = actor.role === 'admin';
  const isLockedDelivered = existingCase.workflowStatus === 'delivered' && !isAdmin;
  const label = getCaseDisplayLabel(fields);

  const actorUid = auth.currentUser?.uid || actor.uid;
  const actorDisplayName =
    clampString(actor.displayName || auth.currentUser?.displayName, 120) || 'แอดมินออฟฟิศ';

  // Tier 3 compliance: for non-admin editing an already-delivered case, only mutate allowed post-delivery fields
  const updatePayload = isLockedDelivered
    ? {
        paymentChannels: fields.paymentChannels,
        price: fields.price,
        paymentDetails: fields.paymentDetails,
        paymentConditionNote: fields.paymentConditionNote,
        sterilizeReturnDate: fields.sterilizeReturnDate,
        radiationMinKgy: fields.radiationMinKgy,
        radiationMaxKgy: fields.radiationMaxKgy,
        doseUniformity: fields.doseUniformity,
        qcReceiveDate: fields.qcReceiveDate,
        certificateNo: fields.certificateNo,
        deliveryDate: fields.deliveryDate,
        deliveryChannel: fields.deliveryChannel,
        deliveredBy: fields.deliveredBy,
        emsTrackingNo: fields.emsTrackingNo,
        shippingInfo: fields.shippingInfo,
        receiptAddress: fields.receiptAddress,
        packageInfo: fields.packageInfo,
        remarks: fields.remarks,
        updatedBy: actorUid,
        updatedByName: actorDisplayName,
        updatedAt: serverTimestamp(),
      }
    : {
        ...fields,
        updatedBy: actorUid,
        updatedByName: actorDisplayName,
        updatedAt: serverTimestamp(),
      };

  try {
    await updateDoc(doc(db, 'officeCases', existingCase.id), updatePayload);

    if (!options?.silent) {
      await logAuditEvent({
        action: 'อัปเดตข้อมูลเคสออฟฟิศ',
        targetType: 'office_case',
        targetId: existingCase.id,
        targetLabel: label,
        actorId: actor.uid,
        actorName: actor.displayName,
        details: `สถานะ ${OFFICE_WORKFLOW_META[existingCase.workflowStatus].colorName} → ${OFFICE_WORKFLOW_META[fields.workflowStatus].colorName} · EMS: ${fields.emsTrackingNo || '-'}`,
      });

      try {
        if (existingCase.workflowStatus !== 'delivered' && fields.workflowStatus === 'delivered') {
          await publishNotification({
            type: 'deal_won',
            title: `จัดส่งชิ้นงานแล้ว (สีเขียว): ${label}`.slice(0, 178),
            message: `${fields.hospitalName || 'ยังไม่ระบุ รพ.'} · ${fields.productCode || 'CTEC Implant'} จัดส่งผ่าน ${fields.deliveryChannel || 'ขนส่ง'} โดย ${fields.deliveredBy || actor.displayName}${fields.emsTrackingNo ? ` (EMS: ${fields.emsTrackingNo})` : ''}`,
            amount: fields.price,
            caseCount: Math.max(1, fields.implantQty),
            createdBy: actor.uid,
            createdByName: actor.displayName,
          });
        } else if (
          existingCase.workflowStatus !== 'sterilizing' &&
          fields.workflowStatus === 'sterilizing'
        ) {
          await publishNotification({
            type: 'stage_update',
            title: `ส่งชิ้นงานฆ่าเชื้อ (สีน้ำเงิน): ${label}`.slice(0, 178),
            message: `${actor.displayName} อัปเดตสถานะส่งฆ่าเชื้อ${fields.sterilizeOutDate ? ` วันที่ ${fields.sterilizeOutDate}` : ''}${fields.certificateNo ? ` · Cert: ${fields.certificateNo}` : ''}`,
            amount: fields.price,
            caseCount: Math.max(1, fields.implantQty),
            createdBy: actor.uid,
            createdByName: actor.displayName,
          });
        }
      } catch (notifErr) {
        console.warn('Office case stage notification skipped:', notifErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function officeCaseToInput(existingCase: OfficeCase): OfficeCaseSeedInput {
  return {
    salesSeqNo: existingCase.salesSeqNo,
    jobNumber: existingCase.jobNumber,
    monthlySeq: existingCase.monthlySeq,
    icrNumber: existingCase.icrNumber,
    hospitalCategory: existingCase.hospitalCategory,
    productionPlanNo: existingCase.productionPlanNo,
    barcode: existingCase.barcode,
    workflowStatus: existingCase.workflowStatus,
    paymentChannels: existingCase.paymentChannels || [],
    price: existingCase.price,
    paymentDetails: existingCase.paymentDetails,
    paymentConditionNote: existingCase.paymentConditionNote,
    patientPrefix: existingCase.patientPrefix,
    patientFirstName: existingCase.patientFirstName,
    patientLastName: existingCase.patientLastName,
    patientHN: existingCase.patientHN,
    patientAge: existingCase.patientAge,
    patientPhone: existingCase.patientPhone,
    hospitalName: existingCase.hospitalName,
    doctorName: existingCase.doctorName,
    doctorPhone: existingCase.doctorPhone,
    productCode: existingCase.productCode,
    sidePosition: existingCase.sidePosition,
    anatomicalArea: existingCase.anatomicalArea,
    surgeryType: existingCase.surgeryType,
    materialType: existingCase.materialType,
    rpModelQty: existingCase.rpModelQty,
    implantQty: existingCase.implantQty,
    temporalSpec: existingCase.temporalSpec,
    productionSpec: existingCase.productionSpec,
    receivedDate: existingCase.receivedDate,
    surgeryDate: existingCase.surgeryDate,
    caseReceiver: existingCase.caseReceiver,
    sterilizeOutDate: existingCase.sterilizeOutDate,
    sterilizeReturnDate: existingCase.sterilizeReturnDate,
    radiationMinKgy: existingCase.radiationMinKgy,
    radiationMaxKgy: existingCase.radiationMaxKgy,
    doseUniformity: existingCase.doseUniformity,
    qcReceiveDate: existingCase.qcReceiveDate,
    certificateNo: existingCase.certificateNo,
    deliveryDate: existingCase.deliveryDate,
    deliveryChannel: existingCase.deliveryChannel,
    deliveredBy: existingCase.deliveredBy,
    emsTrackingNo: existingCase.emsTrackingNo,
    shippingInfo: existingCase.shippingInfo,
    receiptAddress: existingCase.receiptAddress,
    packageInfo: existingCase.packageInfo,
    remarks: existingCase.remarks,
  };
}

export async function updateOfficeCaseStage(
  existingCase: OfficeCase,
  patch: Partial<OfficeCaseSeedInput>,
  actor: UserProfile
) {
  const merged: OfficeCaseSeedInput = {
    ...officeCaseToInput(existingCase),
    ...patch,
  };
  await updateOfficeCase(existingCase, merged, actor);
}

export async function quickUpdateOfficeCaseStatus(
  existingCase: OfficeCase,
  nextStatus: OfficeCaseWorkflowStatus,
  actor: UserProfile
) {
  const todayThai = (() => {
    const now = new Date();
    return `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
  })();

  await updateOfficeCaseStage(
    existingCase,
    {
      workflowStatus: nextStatus,
      sterilizeOutDate:
        nextStatus === 'sterilizing' && !existingCase.sterilizeOutDate
          ? todayThai
          : existingCase.sterilizeOutDate,
      deliveryDate:
        nextStatus === 'delivered' && !existingCase.deliveryDate
          ? todayThai
          : existingCase.deliveryDate,
    },
    actor
  );
}

export async function deleteOfficeCase(caseItem: OfficeCase, actor: UserProfile) {
  const path = `officeCases/${caseItem.id}`;
  try {
    await deleteDoc(doc(db, 'officeCases', caseItem.id));
    await logAuditEvent({
      action: 'ลบข้อมูลเคสออฟฟิศ',
      targetType: 'office_case',
      targetId: caseItem.id,
      targetLabel: getCaseDisplayLabel(caseItem),
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `ลบรายการเคสลำดับขาย ${caseItem.salesSeqNo} โดยผู้ดูแลระบบ`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface BatchImportOptions {
  duplicateMode?: 'skip' | 'update';
  onProgress?: (completed: number, total: number) => void;
  sourceLabel?: string;
}

export interface BatchImportResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export function findMatchingExistingCase(
  item: OfficeCaseSeedInput,
  existingCases: OfficeCase[]
): OfficeCase | undefined {
  const jobKey = item.jobNumber.trim().toLowerCase();
  if (jobKey) {
    const byJob = existingCases.find(
      (c) => c.jobNumber.trim().toLowerCase() === jobKey
    );
    if (byJob) return byJob;
  }

  if (item.salesSeqNo > 0) {
    const bySeq = existingCases.find((c) => {
      if (c.salesSeqNo !== item.salesSeqNo) return false;
      if (!jobKey && !c.jobNumber.trim()) return true;
      return c.jobNumber.trim().toLowerCase() === jobKey;
    });
    if (bySeq) return bySeq;
  }

  return undefined;
}

function mergeImportedIntoExisting(
  existing: OfficeCase,
  incoming: OfficeCaseSeedInput
): OfficeCaseSeedInput {
  const base = officeCaseToInput(existing);
  const pickStr = (inc: string, cur: string) => (inc.trim() ? inc.trim() : cur);
  const pickNum = (inc: number, cur: number) => (inc > 0 ? inc : cur);

  const mergedDeliveryDate = pickStr(incoming.deliveryDate, base.deliveryDate);
  const mergedSterilizeOutDate = pickStr(incoming.sterilizeOutDate, base.sterilizeOutDate);

  // Preserve status progression (delivered > sterilizing > in_progress) unless incoming explicitly upgrades
  const rank: Record<OfficeCaseWorkflowStatus, number> = {
    in_progress: 0,
    sterilizing: 1,
    delivered: 2,
  };
  let nextStatus: OfficeCaseWorkflowStatus =
    rank[incoming.workflowStatus] >= rank[base.workflowStatus]
      ? incoming.workflowStatus
      : base.workflowStatus;
  if (mergedDeliveryDate) nextStatus = 'delivered';
  else if (mergedSterilizeOutDate && nextStatus === 'in_progress') nextStatus = 'sterilizing';

  return {
    salesSeqNo: pickNum(incoming.salesSeqNo, base.salesSeqNo),
    jobNumber: pickStr(incoming.jobNumber, base.jobNumber),
    monthlySeq: pickNum(incoming.monthlySeq, base.monthlySeq),
    icrNumber: pickStr(incoming.icrNumber, base.icrNumber),
    hospitalCategory: incoming.hospitalCategory || base.hospitalCategory,
    productionPlanNo: pickStr(incoming.productionPlanNo, base.productionPlanNo),
    barcode: pickStr(incoming.barcode, base.barcode),
    workflowStatus: nextStatus,
    paymentChannels:
      incoming.paymentChannels && incoming.paymentChannels.length > 0
        ? incoming.paymentChannels
        : base.paymentChannels,
    price: pickNum(incoming.price, base.price),
    paymentDetails: pickStr(incoming.paymentDetails, base.paymentDetails),
    paymentConditionNote: pickStr(incoming.paymentConditionNote, base.paymentConditionNote),
    patientPrefix: pickStr(incoming.patientPrefix, base.patientPrefix),
    patientFirstName: pickStr(incoming.patientFirstName, base.patientFirstName),
    patientLastName: pickStr(incoming.patientLastName, base.patientLastName),
    patientHN: pickStr(incoming.patientHN, base.patientHN),
    patientAge: pickStr(incoming.patientAge, base.patientAge),
    patientPhone: pickStr(incoming.patientPhone, base.patientPhone),
    hospitalName: pickStr(incoming.hospitalName, base.hospitalName),
    doctorName: pickStr(incoming.doctorName, base.doctorName),
    doctorPhone: pickStr(incoming.doctorPhone, base.doctorPhone),
    productCode: pickStr(incoming.productCode, base.productCode),
    sidePosition: pickStr(incoming.sidePosition, base.sidePosition),
    anatomicalArea: pickStr(incoming.anatomicalArea, base.anatomicalArea),
    surgeryType: pickStr(incoming.surgeryType, base.surgeryType),
    materialType: pickStr(incoming.materialType, base.materialType),
    rpModelQty: pickNum(incoming.rpModelQty, base.rpModelQty),
    implantQty: pickNum(incoming.implantQty, base.implantQty),
    temporalSpec: pickStr(incoming.temporalSpec, base.temporalSpec),
    productionSpec: pickStr(incoming.productionSpec, base.productionSpec),
    receivedDate: pickStr(incoming.receivedDate, base.receivedDate),
    surgeryDate: pickStr(incoming.surgeryDate, base.surgeryDate),
    caseReceiver: pickStr(incoming.caseReceiver, base.caseReceiver),
    sterilizeOutDate: mergedSterilizeOutDate,
    sterilizeReturnDate: pickStr(incoming.sterilizeReturnDate, base.sterilizeReturnDate),
    radiationMinKgy: pickStr(incoming.radiationMinKgy, base.radiationMinKgy),
    radiationMaxKgy: pickStr(incoming.radiationMaxKgy, base.radiationMaxKgy),
    doseUniformity: pickStr(incoming.doseUniformity, base.doseUniformity),
    qcReceiveDate: pickStr(incoming.qcReceiveDate, base.qcReceiveDate),
    certificateNo: pickStr(incoming.certificateNo, base.certificateNo),
    deliveryDate: mergedDeliveryDate,
    deliveryChannel: pickStr(incoming.deliveryChannel, base.deliveryChannel),
    deliveredBy: pickStr(incoming.deliveredBy, base.deliveredBy),
    emsTrackingNo: pickStr(incoming.emsTrackingNo, base.emsTrackingNo),
    shippingInfo: pickStr(incoming.shippingInfo, base.shippingInfo),
    receiptAddress: pickStr(incoming.receiptAddress, base.receiptAddress),
    packageInfo: pickStr(incoming.packageInfo, base.packageInfo),
    remarks: pickStr(incoming.remarks, base.remarks),
  };
}

export async function importOfficeCasesBatch(
  items: OfficeCaseSeedInput[],
  existingCases: OfficeCase[],
  actor: UserProfile,
  options?: BatchImportOptions
): Promise<BatchImportResult> {
  const duplicateMode = options?.duplicateMode ?? 'skip';
  const total = items.length;

  // Build mutable lookup maps for existing + newly imported rows in this batch
  const byJobNumber = new Map<string, OfficeCase | 'imported'>();
  const bySalesSeq = new Map<number, OfficeCase | 'imported'>();

  existingCases.forEach((c) => {
    const jobKey = c.jobNumber.trim().toLowerCase();
    if (jobKey) byJobNumber.set(jobKey, c);
    if (c.salesSeqNo > 0) bySalesSeq.set(c.salesSeqNo, c);
  });

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const jobKey = item.jobNumber.trim().toLowerCase();
    const matchedByJob = jobKey ? byJobNumber.get(jobKey) : undefined;
    const matchedBySeq =
      !matchedByJob && item.salesSeqNo > 0 ? bySalesSeq.get(item.salesSeqNo) : undefined;
    const existingMatch = matchedByJob ?? matchedBySeq;

    try {
      if (existingMatch) {
        if (duplicateMode === 'update' && existingMatch !== 'imported') {
          const merged = mergeImportedIntoExisting(existingMatch, item);
          await updateOfficeCase(existingMatch, merged, actor, { silent: true });
          updated += 1;
        } else {
          skipped += 1;
        }
      } else {
        await createOfficeCase(item, actor, { silent: true });
        if (jobKey) byJobNumber.set(jobKey, 'imported');
        if (item.salesSeqNo > 0) bySalesSeq.set(item.salesSeqNo, 'imported');
        imported += 1;
      }
    } catch (err) {
      failed += 1;
      const rowLabel =
        item.jobNumber ||
        item.patientFirstName ||
        item.hospitalName ||
        `แถวที่ ${idx + 1}`;
      errors.push(`${rowLabel}: ${getFriendlyFirestoreError(err, 'บันทึกไม่สำเร็จ')}`);
    } finally {
      options?.onProgress?.(idx + 1, total);
    }
  }

  const changedCount = imported + updated;
  if (changedCount > 0) {
    try {
      await logAuditEvent({
        action: 'นำเข้าข้อมูลเคสออฟฟิศแบบชุด',
        targetType: 'office_case',
        targetId: `batch-${Date.now()}`,
        targetLabel: `นำเข้าใหม่ ${imported} · อัปเดต ${updated} (ข้าม ${skipped})`.slice(0, 175),
        actorId: actor.uid,
        actorName: actor.displayName,
        details: `นำเข้าข้อมูลทะเบียน CTEC Personalized Implant${options?.sourceLabel ? ` จาก ${options.sourceLabel}` : ''}`.slice(0, 390),
      });
    } catch (auditErr) {
      console.warn('Batch import audit log skipped:', auditErr);
    }

    try {
      await publishNotification({
        type: 'daily_summary',
        title: `นำเข้าทะเบียนเคสออฟฟิศสำเร็จ ${changedCount} รายการ`,
        message: `${actor.displayName} นำเข้าใหม่ ${imported} รายการ${updated > 0 ? ` และอัปเดต ${updated} รายการ` : ''}${options?.sourceLabel ? ` (${options.sourceLabel})` : ''}`.slice(0, 580),
        amount: items.reduce((sum, i) => sum + (i.price || 0), 0),
        caseCount: changedCount,
        createdBy: actor.uid,
        createdByName: actor.displayName,
      });
    } catch (notifErr) {
      console.warn('Batch import notification skipped:', notifErr);
    }
  }

  return { imported, updated, skipped, failed, errors };
}
