import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  DEAL_STAGE_META,
  getTodayDateKey,
  ORG_ID,
  type AuditTargetType,
  type Deal,
  type DealStage,
  type Hospital,
  type HospitalStatus,
  type HospitalType,
  type NotificationType,
  type ProductCategory,
  type RegionName,
  type UserProfile,
  type UserRole,
} from '../types';

function clampString(val: string | undefined | null, maxLen: number): string {
  return (val ?? '').trim().slice(0, maxLen);
}

function clampNumber(val: number, min: number, max: number): number {
  const n = Number.isFinite(val) ? val : 0;
  return Math.max(min, Math.min(max, n));
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');

  try {
    const snap = await getDoc(userRef);
    const isBootstrap =
      user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() && user.emailVerified;

    if (!snap.exists()) {
      const displayName = clampString(user.displayName || user.email?.split('@')[0] || 'ผู้ใช้งาน', 120);
      const profilePayload = {
        uid: user.uid,
        orgId: ORG_ID,
        displayName,
        role: (isBootstrap ? 'admin' : 'sales') as UserRole,
        department: isBootstrap ? 'ฝ่ายบริหารและระบบกลาง' : 'ฝ่ายขายเครื่องมือแพทย์',
        territory: 'กรุงเทพและปริมณฑล',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, profilePayload);

      const privatePayload = {
        uid: user.uid,
        email: clampString(user.email, 200),
        phone: '',
        photoURL: clampString(user.photoURL, 500),
        updatedAt: serverTimestamp(),
      };
      await setDoc(privateRef, privatePayload);

      const createdSnap = await getDoc(userRef);
      return { id: createdSnap.id, ...(createdSnap.data() as Omit<UserProfile, 'id'>) };
    }

    // Keep private info synced
    try {
      const privSnap = await getDoc(privateRef);
      const privatePayload = {
        uid: user.uid,
        email: clampString(user.email, 200),
        phone: privSnap.exists() ? clampString((privSnap.data() as { phone?: string }).phone, 40) : '',
        photoURL: clampString(user.photoURL, 500),
        updatedAt: serverTimestamp(),
      };
      if (privSnap.exists()) {
        await updateDoc(privateRef, {
          email: privatePayload.email,
          phone: privatePayload.phone,
          photoURL: privatePayload.photoURL,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(privateRef, privatePayload);
      }
    } catch {
      // Non-blocking private info sync
    }

    return { id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function logAuditEvent(params: {
  action: string;
  targetType: AuditTargetType;
  targetId: string;
  targetLabel: string;
  actorId: string;
  actorName: string;
  details: string;
}) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      orgId: ORG_ID,
      action: clampString(params.action, 80) || 'action',
      targetType: params.targetType,
      targetId: clampString(params.targetId, 128),
      targetLabel: clampString(params.targetLabel, 180),
      actorId: params.actorId,
      actorName: clampString(params.actorName, 120) || 'ผู้ใช้งาน',
      details: clampString(params.details, 400),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Audit log skipped:', error);
  }
}

export async function publishNotification(params: {
  type: NotificationType;
  title: string;
  message: string;
  amount: number;
  caseCount: number;
  createdBy: string;
  createdByName: string;
}) {
  const path = 'notifications';
  try {
    await addDoc(collection(db, path), {
      orgId: ORG_ID,
      type: params.type,
      title: clampString(params.title, 180) || 'แจ้งเตือนระบบ',
      message: clampString(params.message, 600) || 'มีการอัปเดตข้อมูลการขาย',
      amount: clampNumber(params.amount, 0, 10_000_000_000),
      caseCount: clampNumber(params.caseCount, 0, 1_000_000),
      dateKey: getTodayDateKey(),
      createdBy: params.createdBy,
      createdByName: clampString(params.createdByName, 120) || 'ผู้ใช้งาน',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

async function safePublishNotification(params: {
  type: NotificationType;
  title: string;
  message: string;
  amount: number;
  caseCount: number;
  createdBy: string;
  createdByName: string;
}) {
  try {
    await publishNotification(params);
  } catch (error) {
    console.warn('Secondary notification skipped:', error);
  }
}

export interface HospitalInput {
  name: string;
  placeId: string;
  address: string;
  province: string;
  region: RegionName;
  lat: number;
  lng: number;
  hospitalType: HospitalType;
  caseCount: number;
  totalRevenue: number;
  activeDealsCount: number;
  status: HospitalStatus;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  notes: string;
}

export async function createHospital(
  input: HospitalInput,
  actor: UserProfile
): Promise<string> {
  const path = 'hospitals';
  const caseCount = clampNumber(input.caseCount, 0, 100_000);
  const computedStatus: HospitalStatus =
    caseCount >= 30 ? 'high_priority' : input.status;

  try {
    const docRef = await addDoc(collection(db, path), {
      orgId: ORG_ID,
      name: clampString(input.name, 180),
      placeId: clampString(input.placeId, 200),
      address: clampString(input.address, 300),
      province: clampString(input.province, 80),
      region: input.region,
      lat: clampNumber(input.lat, -90, 90),
      lng: clampNumber(input.lng, -180, 180),
      hospitalType: input.hospitalType,
      caseCount,
      totalRevenue: clampNumber(input.totalRevenue, 0, 10_000_000_000),
      activeDealsCount: clampNumber(input.activeDealsCount, 0, 10_000),
      status: computedStatus,
      contactName: clampString(input.contactName, 120),
      contactRole: clampString(input.contactRole, 100),
      contactPhone: clampString(input.contactPhone, 40),
      ownerId: actor.uid,
      ownerName: clampString(actor.displayName, 120),
      notes: clampString(input.notes, 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent({
      action: 'เพิ่มลูกค้าโรงพยาบาล',
      targetType: 'hospital',
      targetId: docRef.id,
      targetLabel: clampString(input.name, 180),
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `จังหวัด ${input.province || '-'} · จำนวนเคสเริ่มต้น ${caseCount} เคส`,
    });

    if (caseCount >= 30) {
      await safePublishNotification({
        type: 'high_density_alert',
        title: `พบโรงพยาบาลเคสหนาแน่นสูง: ${clampString(input.name, 100)}`,
        message: `${input.name} (${input.province || input.region}) มีจำนวนเคสสะสม ${caseCount} เคส ควรจัดลำดับความสำคัญดูแลพิเศษ`,
        amount: clampNumber(input.totalRevenue, 0, 10_000_000_000),
        caseCount,
        createdBy: actor.uid,
        createdByName: actor.displayName,
      });
    }

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateHospital(
  hospitalId: string,
  input: Partial<HospitalInput>,
  actor: UserProfile
) {
  const path = `hospitals/${hospitalId}`;
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.name !== undefined) updatePayload.name = clampString(input.name, 180);
  if (input.address !== undefined) updatePayload.address = clampString(input.address, 300);
  if (input.province !== undefined) updatePayload.province = clampString(input.province, 80);
  if (input.region !== undefined) updatePayload.region = input.region;
  if (input.lat !== undefined) updatePayload.lat = clampNumber(input.lat, -90, 90);
  if (input.lng !== undefined) updatePayload.lng = clampNumber(input.lng, -180, 180);
  if (input.hospitalType !== undefined) updatePayload.hospitalType = input.hospitalType;
  if (input.caseCount !== undefined) updatePayload.caseCount = clampNumber(input.caseCount, 0, 100_000);
  if (input.totalRevenue !== undefined) updatePayload.totalRevenue = clampNumber(input.totalRevenue, 0, 10_000_000_000);
  if (input.activeDealsCount !== undefined) updatePayload.activeDealsCount = clampNumber(input.activeDealsCount, 0, 10_000);
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.contactName !== undefined) updatePayload.contactName = clampString(input.contactName, 120);
  if (input.contactRole !== undefined) updatePayload.contactRole = clampString(input.contactRole, 100);
  if (input.contactPhone !== undefined) updatePayload.contactPhone = clampString(input.contactPhone, 40);
  if (input.notes !== undefined) updatePayload.notes = clampString(input.notes, 1000);

  try {
    await updateDoc(doc(db, 'hospitals', hospitalId), updatePayload);
    await logAuditEvent({
      action: 'อัปเดตข้อมูลโรงพยาบาล',
      targetType: 'hospital',
      targetId: hospitalId,
      targetLabel: clampString(input.name || hospitalId, 180),
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `ปรับปรุงข้อมูลลูกค้าโรงพยาบาล`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHospital(hospital: Hospital, actor: UserProfile) {
  const path = `hospitals/${hospital.id}`;
  try {
    await deleteDoc(doc(db, 'hospitals', hospital.id));
    await logAuditEvent({
      action: 'ลบข้อมูลโรงพยาบาล',
      targetType: 'hospital',
      targetId: hospital.id,
      targetLabel: hospital.name,
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `ลบโรงพยาบาลออกจากระบบโดยผู้ดูแลระบบ`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface DealInput {
  title: string;
  hospitalId: string;
  hospitalName: string;
  productCategory: ProductCategory;
  amount: number;
  caseVolume: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string;
  notes: string;
}

export async function createDeal(
  input: DealInput,
  hospital: Hospital,
  actor: UserProfile
): Promise<string> {
  const path = 'deals';
  const amount = clampNumber(input.amount, 0, 1_000_000_000);
  const caseVolume = clampNumber(input.caseVolume, 0, 100_000);
  const probability = clampNumber(
    input.probability ?? DEAL_STAGE_META[input.stage].defaultProbability,
    0,
    100
  );

  try {
    const docRef = await addDoc(collection(db, path), {
      orgId: ORG_ID,
      title: clampString(input.title, 180),
      hospitalId: input.hospitalId,
      hospitalName: clampString(input.hospitalName, 180),
      productCategory: input.productCategory,
      amount,
      caseVolume,
      stage: input.stage,
      probability,
      expectedCloseDate: clampString(input.expectedCloseDate, 32),
      dateKey: getTodayDateKey(),
      notes: clampString(input.notes, 1000),
      ownerId: actor.uid,
      ownerName: clampString(actor.displayName, 120),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Sync parent hospital metrics
    const nextCases = hospital.caseCount + caseVolume;
    const nextRevenue =
      input.stage === 'won' ? hospital.totalRevenue + amount : hospital.totalRevenue;
    const nextActiveDeals =
      input.stage !== 'won' && input.stage !== 'lost'
        ? hospital.activeDealsCount + 1
        : hospital.activeDealsCount;
    const nextStatus: HospitalStatus =
      nextCases >= 30 ? 'high_priority' : input.stage === 'won' ? 'active' : hospital.status;

    await updateDoc(doc(db, 'hospitals', hospital.id), {
      caseCount: clampNumber(nextCases, 0, 100_000),
      totalRevenue: clampNumber(nextRevenue, 0, 10_000_000_000),
      activeDealsCount: clampNumber(nextActiveDeals, 0, 10_000),
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });

    if (input.stage === 'won') {
      await safePublishNotification({
        type: 'deal_won',
        title: `ปิดการขายสำเร็จ: ${clampString(input.hospitalName, 100)}`,
        message: `${actor.displayName} ปิดดีล "${clampString(input.title, 100)}" มูลค่า ฿${amount.toLocaleString('th-TH')} (+${caseVolume} เคส)`,
        amount,
        caseCount: caseVolume,
        createdBy: actor.uid,
        createdByName: actor.displayName,
      });
    } else if (nextCases >= 30 && hospital.caseCount < 30) {
      await safePublishNotification({
        type: 'high_density_alert',
        title: `ความหนาแน่นเคสสูง: ${clampString(hospital.name, 100)}`,
        message: `จำนวนเคสสะสมเพิ่มเป็น ${nextCases} เคส จากดีล "${clampString(input.title, 80)}"`,
        amount,
        caseCount: nextCases,
        createdBy: actor.uid,
        createdByName: actor.displayName,
      });
    }

    await logAuditEvent({
      action: 'สร้างรายการติดตามการขาย',
      targetType: 'deal',
      targetId: docRef.id,
      targetLabel: clampString(input.title, 180),
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `${input.hospitalName} · ฿${amount.toLocaleString('th-TH')} · สถานะ ${DEAL_STAGE_META[input.stage].label}`,
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDeal(
  deal: Deal,
  updates: Partial<{
    title: string;
    productCategory: ProductCategory;
    amount: number;
    caseVolume: number;
    stage: DealStage;
    probability: number;
    expectedCloseDate: string;
    notes: string;
  }>,
  hospital: Hospital | undefined,
  actor: UserProfile
) {
  const path = `deals/${deal.id}`;
  const nextStage = updates.stage ?? deal.stage;
  const nextAmount = updates.amount !== undefined ? clampNumber(updates.amount, 0, 1_000_000_000) : deal.amount;
  const nextCases = updates.caseVolume !== undefined ? clampNumber(updates.caseVolume, 0, 100_000) : deal.caseVolume;
  const nextProb =
    updates.probability !== undefined
      ? clampNumber(updates.probability, 0, 100)
      : updates.stage !== undefined
        ? DEAL_STAGE_META[nextStage].defaultProbability
        : deal.probability;

  try {
    await updateDoc(doc(db, 'deals', deal.id), {
      title: clampString(updates.title ?? deal.title, 180),
      productCategory: updates.productCategory ?? deal.productCategory,
      amount: nextAmount,
      caseVolume: nextCases,
      stage: nextStage,
      probability: nextProb,
      expectedCloseDate: clampString(updates.expectedCloseDate ?? deal.expectedCloseDate, 32),
      notes: clampString(updates.notes ?? deal.notes, 1000),
      updatedAt: serverTimestamp(),
    });

    // Update parent hospital metrics if stage or volume changed
    if (hospital) {
      const wasWon = deal.stage === 'won';
      const isNowWon = nextStage === 'won';
      const wasActive = deal.stage !== 'won' && deal.stage !== 'lost';
      const isNowActive = nextStage !== 'won' && nextStage !== 'lost';

      let revenueDelta = 0;
      if (!wasWon && isNowWon) revenueDelta = nextAmount;
      else if (wasWon && !isNowWon) revenueDelta = -deal.amount;
      else if (wasWon && isNowWon) revenueDelta = nextAmount - deal.amount;

      const activeDelta = (isNowActive ? 1 : 0) - (wasActive ? 1 : 0);
      const caseDelta = nextCases - deal.caseVolume;

      if (revenueDelta !== 0 || activeDelta !== 0 || caseDelta !== 0) {
        const updatedCaseCount = clampNumber(hospital.caseCount + caseDelta, 0, 100_000);
        await updateDoc(doc(db, 'hospitals', hospital.id), {
          caseCount: updatedCaseCount,
          totalRevenue: clampNumber(hospital.totalRevenue + revenueDelta, 0, 10_000_000_000),
          activeDealsCount: clampNumber(hospital.activeDealsCount + activeDelta, 0, 10_000),
          status:
            updatedCaseCount >= 30
              ? 'high_priority'
              : isNowWon
                ? 'active'
                : hospital.status,
          updatedAt: serverTimestamp(),
        });
      }
    }

    if (deal.stage !== 'won' && nextStage === 'won') {
      await safePublishNotification({
        type: 'deal_won',
        title: `ปิดการขายสำเร็จ: ${deal.hospitalName}`,
        message: `${actor.displayName} ปิดดีล "${updates.title ?? deal.title}" สำเร็จ มูลค่า ฿${nextAmount.toLocaleString('th-TH')} (${nextCases} เคส)`,
        amount: nextAmount,
        caseCount: nextCases,
        createdBy: actor.uid,
        createdByName: actor.displayName,
      });
    }

    await logAuditEvent({
      action: 'อัปเดตสถานะการขาย',
      targetType: 'deal',
      targetId: deal.id,
      targetLabel: updates.title ?? deal.title,
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `${deal.hospitalName} · ${DEAL_STAGE_META[deal.stage].shortLabel} → ${DEAL_STAGE_META[nextStage].shortLabel}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDeal(
  deal: Deal,
  actor: UserProfile,
  hospital?: Hospital
) {
  const path = `deals/${deal.id}`;
  try {
    await deleteDoc(doc(db, 'deals', deal.id));

    if (hospital) {
      const wasWon = deal.stage === 'won';
      const wasActive = deal.stage !== 'won' && deal.stage !== 'lost';
      const nextCases = clampNumber(hospital.caseCount - (deal.caseVolume || 0), 0, 100_000);
      const nextRevenue = clampNumber(
        hospital.totalRevenue - (wasWon ? deal.amount || 0 : 0),
        0,
        10_000_000_000
      );
      const nextActiveDeals = clampNumber(
        hospital.activeDealsCount - (wasActive ? 1 : 0),
        0,
        10_000
      );
      try {
        await updateDoc(doc(db, 'hospitals', hospital.id), {
          caseCount: nextCases,
          totalRevenue: nextRevenue,
          activeDealsCount: nextActiveDeals,
          status:
            nextCases >= 30
              ? 'high_priority'
              : hospital.status === 'high_priority'
                ? 'active'
                : hospital.status,
          updatedAt: serverTimestamp(),
        });
      } catch (syncErr) {
        console.warn('Parent hospital counter sync after deal delete skipped:', syncErr);
      }
    }

    await logAuditEvent({
      action: 'ลบรายการดีล',
      targetType: 'deal',
      targetId: deal.id,
      targetLabel: deal.title,
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `ลบดีลของ ${deal.hospitalName} (฿${deal.amount.toLocaleString('th-TH')})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateUserRoleAndStatus(
  targetUser: UserProfile,
  updates: {
    role: UserRole;
    department: string;
    territory: string;
    active: boolean;
  },
  actor: UserProfile
) {
  const path = `users/${targetUser.uid}`;
  try {
    await updateDoc(doc(db, 'users', targetUser.uid), {
      displayName: targetUser.displayName,
      role: updates.role,
      department: clampString(updates.department, 80),
      territory: clampString(updates.territory, 80),
      active: updates.active,
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent({
      action: 'ปรับเปลี่ยนสิทธิ์ผู้ใช้งาน',
      targetType: 'user',
      targetId: targetUser.uid,
      targetLabel: targetUser.displayName,
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `บทบาท ${targetUser.role} → ${updates.role} · สถานะ ${updates.active ? 'เปิดใช้งาน' : 'ระงับสิทธิ์'}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

async function deleteIdsInBatches(collectionName: string, ids: string[]): Promise<number> {
  const CHUNK_SIZE = 100;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const slice = ids.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const id of slice) {
      batch.delete(doc(db, collectionName, id));
    }
    await batch.commit();
    deleted += slice.length;
  }
  return deleted;
}

export async function clearAllWorkspaceRecords(params: {
  dealsIds: string[];
  hospitalsIds: string[];
  officeCaseIds: string[];
  notificationIds: string[];
  actor: UserProfile;
}): Promise<{
  dealsDeleted: number;
  hospitalsDeleted: number;
  officeCasesDeleted: number;
  notificationsDeleted: number;
}> {
  const { dealsIds, hospitalsIds, officeCaseIds, notificationIds, actor } = params;

  try {
    // Delete deals first (child records referencing hospitals) in fast 100-doc writeBatch commits
    const dealsDeleted = await deleteIdsInBatches('deals', dealsIds);
    const hospitalsDeleted = await deleteIdsInBatches('hospitals', hospitalsIds);
    const officeCasesDeleted = await deleteIdsInBatches('officeCases', officeCaseIds);
    const notificationsDeleted = await deleteIdsInBatches('notifications', notificationIds);

    await logAuditEvent({
      action: 'ล้างข้อมูลเดโม่เพื่อเริ่มใช้งานจริง',
      targetType: 'report',
      targetId: `workspace-reset-${getTodayDateKey()}`,
      targetLabel: 'รีเซ็ตฐานข้อมูลเริ่มต้น (Production Clean Start)',
      actorId: actor.uid,
      actorName: actor.displayName,
      details: `ลบดีล ${dealsDeleted} · โรงพยาบาล ${hospitalsDeleted} · เคสออฟฟิศ ${officeCasesDeleted} · แจ้งเตือน ${notificationsDeleted}`,
    });

    return {
      dealsDeleted,
      hospitalsDeleted,
      officeCasesDeleted,
      notificationsDeleted,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'workspace-reset');
  }
}
