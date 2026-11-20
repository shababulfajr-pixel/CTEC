# CTEC MedSales CRM — Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Verified Identity Gate**: Every authenticated read/write requires `request.auth != null && request.auth.token.email_verified == true`. Unverified emails cannot bypass RBAC even if their email matches the bootstrapped admin.
2. **RBAC Privilege Integrity**: Standard users registering in `/users/{userId}` can only create a profile with `role == 'sales'` and `active == true`. Only verified admins (`shababulfajr@gmail.com` or existing `role == 'admin'` in `/users/{uid}`) may promote/demote roles or deactivate accounts. Users can never modify their own `role` or `active` status.
3. **Strict PII Isolation**: User PII (`email`, `phone`, `photoURL`) is isolated in `/users/{userId}/private/info` and is strictly readable/writable only by `userId == request.auth.uid` or verified admins. Listing `/users/{userId}/private` is denied.
4. **Relational Deal Integrity**: A sales deal in `/deals/{dealId}` cannot be created unless its referenced parent hospital document exists at `/hospitals/{hospitalId}`.
5. **Terminal State Locking**: Once a deal's `stage` reaches `'won'` or `'lost'`, non-admin users cannot modify or reopen the deal. Only verified admins may override terminal states.
6. **Temporal & Ownership Immutability**: `createdAt` must equal `request.time` on create and remain immutable on update. `updatedAt` must equal `request.time` on every write. `ownerId` and `orgId` are immutable after creation.
7. **Volumetric & Key Guarding**: All document IDs match `^[a-zA-Z0-9_\-]+$` with length <= 128. Every string field enforces strict `.size()` bounds. Every create enforces `hasAll` + `hasOnly` (blocking ghost fields), and every update enforces `affectedKeys().hasOnly(...)` wrapped by `isValid[Entity](incoming())`.
8. **Immutable Audit Trail**: `/auditLogs/{logId}` is append-only; updates and deletes are strictly forbidden.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Collection | Malicious Payload / Request | Expected Outcome |
| :- | :------------ | :---------------- | :-------------------------- | :--------------- |
| 1 | **Self-Assigned Admin Role** | `/users/{uid}` (create) | `{ uid, orgId: "ctec-medical", role: "admin", active: true, ... }` by non-bootstrap user | `PERMISSION_DENIED` |
| 2 | **Role Escalation Update** | `/users/{uid}` (update) | Own user updating `{ role: "admin", updatedAt: serverTimestamp() }` | `PERMISSION_DENIED` |
| 3 | **Email Spoofing Admin Bypass** | `/users/{otherUid}` (update) | Auth token with `email: "shababulfajr@gmail.com"` and `email_verified: false` | `PERMISSION_DENIED` |
| 4 | **PII Cross-User Scraping** | `/users/{otherUid}/private/info` (get) | Non-admin sales rep reading another user's private PII doc | `PERMISSION_DENIED` |
| 5 | **Shadow / Ghost Field Injection** | `/hospitals/{id}` (create) | Valid hospital payload + extra `{ isVerified: true, discountOverride: 99 }` | `PERMISSION_DENIED` |
| 6 | **Orphaned Deal Creation** | `/deals/{id}` (create) | Deal referencing non-existent `hospitalId: "ghost_hosp_999"` | `PERMISSION_DENIED` |
| 7 | **Identity Spoofing on Deal** | `/deals/{id}` (create) | Sales rep creating deal with `ownerId: "other_rep_uid"` | `PERMISSION_DENIED` |
| 8 | **Terminal State Reopening** | `/deals/{wonDealId}` (update) | Sales rep changing `stage: "won"` back to `stage: "negotiation"` | `PERMISSION_DENIED` |
| 9 | **Client Timestamp Forgery** | `/deals/{id}` (create) | Valid deal with backdated `createdAt: Timestamp(2020-01-01)` | `PERMISSION_DENIED` |
| 10 | **Value Poisoning on Update** | `/deals/{id}` (update) | Updating allowed `amount` field with string `"1000000"` or negative `-500` | `PERMISSION_DENIED` |
| 11 | **Resource Poisoning via ID** | `/hospitals/{hugeId}` (create) | Document ID containing 500 invalid characters (`../../../evil`) | `PERMISSION_DENIED` |
| 12 | **Audit Log Tampering** | `/auditLogs/{logId}` (update/delete) | Admin or user attempting to alter or erase an audit log record | `PERMISSION_DENIED` |
