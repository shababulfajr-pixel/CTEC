import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
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

type SanitizedOfficeCaseFields = ReturnType<typeof sanitizePayloadFields>;

function buildCreateOfficeCasePayload(
  fields: SanitizedOfficeCaseFields,
  actorUid: string,
  actorDisplayName: string
) {
  return {
    orgId: ORG_ID,
    ...fields,
    createdBy: actorUid,
    createdByName: actorDisplayName,
    updatedBy: actorUid,
    updatedByName: actorDisplayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function buildUpdateOfficeCasePayload(
  existingCase: OfficeCase,
  fields: SanitizedOfficeCaseFields,
  isAdmin: boolean,
  actorUid: string,
  actorDisplayName: string
) {
  const isLockedDelivered = existingCase.workflowStatus === 'delivered' && !isAdmin;
  // Tier 3 compliance: for non-admin editing an already-delivered case, only mutate allowed post-delivery fields
  return isLockedDelivered
    ? {
        paymentChannels: fields.paymentChannels,
        price: fields.price,
        paymentDetails: fields.paymentDetails,
        paymentConditionNote: fields.paymentConditionNote,
        sterilizeOutDate: fields.sterilizeOutDate,
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
    const docRef = await addDoc(
      collection(db, path),
      buildCreateOfficeCasePayload(fields, actorUid, actorDisplayName)
    );

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
  const label = getCaseDisplayLabel(fields);

  const actorUid = auth.currentUser?.uid || actor.uid;
  const actorDisplayName =
    clampString(actor.displayName || auth.currentUser?.displayName, 120) || 'แอดมินออฟฟิศ';

  const updatePayload = buildUpdateOfficeCasePayload(
    existingCase,
    fields,
    isAdmin,
    actorUid,
    actorDisplayName
  );

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

export type DuplicateImportMode = 'skip' | 'update' | 'import_all';

export interface BatchImportOptions {
  duplicateMode?: DuplicateImportMode;
  onProgress?: (completed: number, total: number, batchLabel?: string) => void;
  sourceLabel?: string;
}

export interface BatchImportResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface ExistingCaseLookup {
  byJobNumber: Map<string, OfficeCase>;
  bySeqWithoutJob: Map<number, OfficeCase>;
}

/**
 * Builds O(1) lookup maps for existing cases so 500–5,000+ rows can be checked instantly.
 * Only indexes salesSeqNo when a case has NO jobNumber, preventing false duplicate matches
 * when monthly/sheet sequences restart at 1 with distinct job numbers.
 */
export function buildExistingCaseLookup(existingCases: OfficeCase[]): ExistingCaseLookup {
  const byJobNumber = new Map<string, OfficeCase>();
  const bySeqWithoutJob = new Map<number, OfficeCase>();

  for (const c of existingCases) {
    const jobKey = c.jobNumber.trim().toLowerCase();
    if (jobKey) {
      if (!byJobNumber.has(jobKey)) byJobNumber.set(jobKey, c);
    } else if (c.salesSeqNo > 0) {
      if (!bySeqWithoutJob.has(c.salesSeqNo)) bySeqWithoutJob.set(c.salesSeqNo, c);
    }
  }

  return { byJobNumber, bySeqWithoutJob };
}

export function matchCaseInLookup(
  item: OfficeCaseSeedInput,
  lookup: ExistingCaseLookup
): OfficeCase | undefined {
  const jobKey = item.jobNumber.trim().toLowerCase();
  if (jobKey) {
    return lookup.byJobNumber.get(jobKey);
  }
  if (item.salesSeqNo > 0) {
    return lookup.bySeqWithoutJob.get(item.salesSeqNo);
  }
  return undefined;
}

export function findMatchingExistingCase(
  item: OfficeCaseSeedInput,
  existingCases: OfficeCase[]
): OfficeCase | undefined {
  const lookup = buildExistingCaseLookup(existingCases);
  return matchCaseInLookup(item, lookup);
}

function mergeImportedIntoExisting(
  existing: OfficeCase,
  incoming: OfficeCaseSeedInput
): OfficeCaseSeedInput {
  const base = officeCaseToInput(existing);
  const pickStr = (inc: string, cur: string) => (inc.trim() ? inc.trim() : cur);
  const pickNum = (inc: number, cur: number) => (inc > 0 ? inc : cur);

  const mergedDeliveryDate = pickStr(incoming.deliveryDate, base.deliveryDate);
  const mergedDeliveryChannel = pickStr(incoming.deliveryChannel, base.deliveryChannel);
  const mergedDeliveredBy = pickStr(incoming.deliveredBy, base.deliveredBy);
  const mergedEmsTrackingNo = pickStr(incoming.emsTrackingNo, base.emsTrackingNo);
  const mergedSterilizeOutDate = pickStr(incoming.sterilizeOutDate, base.sterilizeOutDate);
  const mergedSterilizeReturnDate = pickStr(incoming.sterilizeReturnDate, base.sterilizeReturnDate);
  const mergedQcReceiveDate = pickStr(incoming.qcReceiveDate, base.qcReceiveDate);
  const mergedCertificateNo = pickStr(incoming.certificateNo, base.certificateNo);

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
  if (
    mergedDeliveryDate ||
    mergedEmsTrackingNo ||
    (mergedDeliveryChannel && mergedDeliveredBy)
  ) {
    nextStatus = 'delivered';
  } else if (
    (mergedSterilizeOutDate ||
      mergedSterilizeReturnDate ||
      mergedQcReceiveDate ||
      mergedCertificateNo) &&
    nextStatus === 'in_progress'
  ) {
    nextStatus = 'sterilizing';
  }

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
    sterilizeReturnDate: mergedSterilizeReturnDate,
    radiationMinKgy: pickStr(incoming.radiationMinKgy, base.radiationMinKgy),
    radiationMaxKgy: pickStr(incoming.radiationMaxKgy, base.radiationMaxKgy),
    doseUniformity: pickStr(incoming.doseUniformity, base.doseUniformity),
    qcReceiveDate: mergedQcReceiveDate,
    certificateNo: mergedCertificateNo,
    deliveryDate: mergedDeliveryDate,
    deliveryChannel: mergedDeliveryChannel,
    deliveredBy: mergedDeliveredBy,
    emsTrackingNo: mergedEmsTrackingNo,
    shippingInfo: pickStr(incoming.shippingInfo, base.shippingInfo),
    receiptAddress: pickStr(incoming.receiptAddress, base.receiptAddress),
    packageInfo: pickStr(incoming.packageInfo, base.packageInfo),
    remarks: pickStr(incoming.remarks, base.remarks),
  };
}

// Firestore Security Rules cap get()/exists() calls at 20 per multi-document writeBatch.
// Each non-bootstrap team write uses 2 lookups (exists + get on /users/{uid}), so 5 docs/batch
// uses at most 10 lookups (50% safety margin) while 5 concurrent batches keep 500+ rows fast.
const IMPORT_BATCH_CHUNK_SIZE = 5;
const IMPORT_BATCH_CONCURRENCY = 5;
const MAX_DETAILED_IMPORT_ERRORS = 25;

type PendingBatchOp =
  | {
      kind: 'create';
      rowLabel: string;
      payload: ReturnType<typeof buildCreateOfficeCasePayload>;
    }
  | {
      kind: 'update';
      docId: string;
      rowLabel: string;
      payload: ReturnType<typeof buildUpdateOfficeCasePayload>;
    };

async function commitOpsBatch(ops: PendingBatchOp[]): Promise<void> {
  const batch = writeBatch(db);
  const colRef = collection(db, 'officeCases');
  for (const op of ops) {
    if (op.kind === 'create') {
      batch.set(doc(colRef), op.payload);
    } else {
      batch.update(doc(db, 'officeCases', op.docId), op.payload);
    }
  }
  await batch.commit();
}

async function commitOpsWithResilientFallback(
  ops: PendingBatchOp[],
  counters: {
    imported: number;
    updated: number;
    failed: number;
    errors: string[];
  }
): Promise<void> {
  if (ops.length === 0) return;

  try {
    await commitOpsBatch(ops);
    for (const op of ops) {
      if (op.kind === 'create') counters.imported += 1;
      else counters.updated += 1;
    }
  } catch (err) {
    if (ops.length === 1) {
      console.error(`Import row failed (${ops[0].kind} ${ops[0].rowLabel}):`, err);
      counters.failed += 1;
      if (counters.errors.length < MAX_DETAILED_IMPORT_ERRORS) {
        counters.errors.push(
          `${ops[0].rowLabel}: ${getFriendlyFirestoreError(err, 'บันทึกไม่สำเร็จ')}`
        );
      }
      return;
    }

    // Split failed batch in half so valid rows still commit and only faulty rows fail
    const mid = Math.ceil(ops.length / 2);
    await commitOpsWithResilientFallback(ops.slice(0, mid), counters);
    await commitOpsWithResilientFallback(ops.slice(mid), counters);
  }
}

export async function importOfficeCasesBatch(
  items: OfficeCaseSeedInput[],
  existingCases: OfficeCase[],
  actor: UserProfile,
  options?: BatchImportOptions
): Promise<BatchImportResult> {
  const duplicateMode: DuplicateImportMode = options?.duplicateMode ?? 'skip';
  const total = items.length;
  const isAdmin = actor.role === 'admin';
  const actorUid = auth.currentUser?.uid || actor.uid;
  const actorDisplayName =
    clampString(actor.displayName || auth.currentUser?.displayName, 120) || 'แอดมินออฟฟิศ';

  // O(1) lookup maps for existing records + rows already queued inside this import batch
  const lookup = buildExistingCaseLookup(existingCases);
  const seenBatchJobs = new Set<string>();
  const seenBatchSeqNoJob = new Set<number>();

  const pendingOps: PendingBatchOp[] = [];
  let skipped = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const rowLabel =
      item.jobNumber.trim() ||
      item.patientFirstName.trim() ||
      item.hospitalName.trim() ||
      `แถวที่ ${idx + 1}`;

    if (duplicateMode === 'import_all') {
      const fields = sanitizePayloadFields(item);
      pendingOps.push({
        kind: 'create',
        rowLabel,
        payload: buildCreateOfficeCasePayload(fields, actorUid, actorDisplayName),
      });
      continue;
    }

    const jobKey = item.jobNumber.trim().toLowerCase();
    const existingMatch = matchCaseInLookup(item, lookup);
    const seenInSameBatch = jobKey
      ? seenBatchJobs.has(jobKey)
      : item.salesSeqNo > 0 && seenBatchSeqNoJob.has(item.salesSeqNo);

    if (existingMatch) {
      if (duplicateMode === 'update' && !seenInSameBatch) {
        const merged = mergeImportedIntoExisting(existingMatch, item);
        const fields = sanitizePayloadFields(merged);
        pendingOps.push({
          kind: 'update',
          docId: existingMatch.id,
          rowLabel,
          payload: buildUpdateOfficeCasePayload(
            existingMatch,
            fields,
            isAdmin,
            actorUid,
            actorDisplayName
          ),
        });
        if (jobKey) seenBatchJobs.add(jobKey);
        else if (item.salesSeqNo > 0) seenBatchSeqNoJob.add(item.salesSeqNo);
      } else {
        skipped += 1;
      }
      continue;
    }

    if (seenInSameBatch) {
      skipped += 1;
      continue;
    }

    const fields = sanitizePayloadFields(item);
    pendingOps.push({
      kind: 'create',
      rowLabel,
      payload: buildCreateOfficeCasePayload(fields, actorUid, actorDisplayName),
    });
    if (jobKey) seenBatchJobs.add(jobKey);
    else if (item.salesSeqNo > 0) seenBatchSeqNoJob.add(item.salesSeqNo);
  }

  const counters = {
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Report initial skipped progress immediately
  let completedCount = skipped;
  const chunks: PendingBatchOp[][] = [];
  for (let offset = 0; offset < pendingOps.length; offset += IMPORT_BATCH_CHUNK_SIZE) {
    chunks.push(pendingOps.slice(offset, offset + IMPORT_BATCH_CHUNK_SIZE));
  }
  const totalChunks = Math.max(1, chunks.length);
  options?.onProgress?.(
    completedCount,
    total,
    pendingOps.length > 0
      ? `เตรียมบันทึก ${pendingOps.length.toLocaleString('th-TH')} รายการ (แบ่ง ${totalChunks} ชุด)`
      : 'ตรวจสอบข้อมูลเสร็จสิ้น'
  );

  for (let waveStart = 0; waveStart < chunks.length; waveStart += IMPORT_BATCH_CONCURRENCY) {
    const wave = chunks.slice(waveStart, waveStart + IMPORT_BATCH_CONCURRENCY);
    const waveEndChunk = Math.min(chunks.length, waveStart + wave.length);
    const waveRowCount = wave.reduce((sum, ch) => sum + ch.length, 0);

    options?.onProgress?.(
      completedCount,
      total,
      `กำลังบันทึกชุดที่ ${waveStart + 1}–${waveEndChunk} / ${totalChunks} (${waveRowCount} รายการ)...`
    );

    await Promise.all(wave.map((chunk) => commitOpsWithResilientFallback(chunk, counters)));
    completedCount += waveRowCount;

    options?.onProgress?.(
      Math.min(completedCount, total),
      total,
      `บันทึกแล้ว ${Math.min(completedCount, total).toLocaleString('th-TH')} / ${total.toLocaleString('th-TH')} รายการ`
    );

    // Yield to browser paint loop between waves so UI stays responsive on 500–5,000+ rows
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (counters.failed > counters.errors.length) {
    counters.errors.push(
      `และมีอีก ${(counters.failed - counters.errors.length).toLocaleString('th-TH')} รายการที่ไม่สำเร็จ`
    );
  }

  const changedCount = counters.imported + counters.updated;
  if (changedCount > 0) {
    try {
      await logAuditEvent({
        action: 'นำเข้าข้อมูลเคสออฟฟิศแบบชุด',
        targetType: 'office_case',
        targetId: `batch-${Date.now()}`,
        targetLabel: `นำเข้าใหม่ ${counters.imported} · อัปเดต ${counters.updated} (ข้าม ${skipped})`.slice(0, 175),
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
        title: `นำเข้าทะเบียนเคสออฟฟิศสำเร็จ ${changedCount.toLocaleString('th-TH')} รายการ`,
        message: `${actor.displayName} นำเข้าใหม่ ${counters.imported.toLocaleString('th-TH')} รายการ${counters.updated > 0 ? ` และอัปเดต ${counters.updated.toLocaleString('th-TH')} รายการ` : ''}${options?.sourceLabel ? ` (${options.sourceLabel})` : ''}`.slice(0, 580),
        amount: items.reduce((sum, i) => sum + (i.price || 0), 0),
        caseCount: changedCount,
        createdBy: actor.uid,
        createdByName: actor.displayName,
      });
    } catch (notifErr) {
      console.warn('Batch import notification skipped:', notifErr);
    }
  }

  return {
    imported: counters.imported,
    updated: counters.updated,
    skipped,
    failed: counters.failed,
    errors: counters.errors,
  };
}
