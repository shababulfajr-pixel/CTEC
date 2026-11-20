/**
 * Firestore Security Rules Verification Suite (Phase 0 TDD)
 * Verifies the "Dirty Dozen" adversarial payloads against firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Blocks self-assigned admin role on signup',
    operation: 'create',
    path: '/users/attacker_uid',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'attacker_uid',
      orgId: 'ctec-medical',
      displayName: 'Attacker',
      role: 'admin',
      department: 'Sales',
      territory: 'BKK',
      active: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Blocks user escalating own role on update',
    operation: 'update',
    path: '/users/sales_uid',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Blocks spoofed admin email when email_verified is false',
    operation: 'update',
    path: '/users/sales_uid',
    auth: { uid: 'spoof_uid', email: 'shababulfajr@gmail.com', email_verified: false },
    payload: { role: 'executive' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Blocks non-owner reading another user private PII',
    operation: 'get',
    path: '/users/victim_uid/private/info',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Blocks ghost/shadow field injection on hospital creation',
    operation: 'create',
    path: '/hospitals/hosp_01',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    payload: {
      orgId: 'ctec-medical',
      name: 'Test Hospital',
      isVerified: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Blocks orphaned deal referencing nonexistent hospitalId',
    operation: 'create',
    path: '/deals/deal_orphan',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    payload: {
      orgId: 'ctec-medical',
      hospitalId: 'nonexistent_hosp_999',
      ownerId: 'sales_uid',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Blocks identity spoofing by setting another user as deal ownerId',
    operation: 'create',
    path: '/deals/deal_spoof',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    payload: {
      orgId: 'ctec-medical',
      ownerId: 'another_rep_uid',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Blocks non-admin reopening terminal won deal',
    operation: 'update',
    path: '/deals/deal_won_01',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    payload: { stage: 'negotiation' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Blocks forged client timestamp on deal creation',
    operation: 'create',
    path: '/deals/deal_backdated',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Blocks value poisoning (negative amount) on deal update',
    operation: 'update',
    path: '/deals/deal_active_01',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    payload: { amount: -50000 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Blocks malformed path ID injection',
    operation: 'create',
    path: '/hospitals/../../../evil_id',
    auth: { uid: 'sales_uid', email: 'sales@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Blocks modification or deletion of immutable audit logs',
    operation: 'delete',
    path: '/auditLogs/log_01',
    auth: { uid: 'admin_uid', email: 'shababulfajr@gmail.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
