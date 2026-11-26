# Security Specification & TDD Invariants

## 1. Data Invariants
1. **Owner Isolation**: Every user profile, loan account, transaction, and payment deadline is strictly scoped to `request.auth.uid` with verified email (`request.auth.token.email_verified == true`).
2. **No Self-Assigned Privileges**: Users registering `/users/{userId}` can only assign `role: 'officer'` unless verified as the bootstrapped admin.
3. **Referential Integrity**: Every `/transactions/{transactionId}` and `/deadlines/{deadlineId}` must reference an existing (or same-batch `existsAfter`) `/loans/{loanId}` owned by the same authenticated user.
4. **Terminal State Locking**: Once a loan reaches `status == 'Settled'` or a payment deadline reaches `status == 'Paid'`, non-admin updates are blocked.
5. **Immutable Audit Ledger**: `/transactions/{transactionId}` cannot be updated or deleted once recorded.
6. **Temporal Integrity**: `createdAt` and `updatedAt` must match server `request.time`, and `createdAt` and `ownerId` remain immutable on updates.

## 2. Adversarial "Dirty Dozen" Payloads
1. Unauthenticated read/write to `/loans/loan_1` -> `PERMISSION_DENIED`
2. Creating `/users/uid_a` with `role: 'admin'` by non-admin -> `PERMISSION_DENIED`
3. Creating `/loans/loan_1` with `ownerId` belonging to another UID -> `PERMISSION_DENIED`
4. Shadow field injection (`isApprovedOverride: true`) on `/loans/loan_1` create or update -> `PERMISSION_DENIED`
5. ID poisoning (`loanId` > 128 chars or containing invalid symbols `../`) -> `PERMISSION_DENIED`
6. Orphaned transaction referencing nonexistent `loanId` -> `PERMISSION_DENIED`
7. Cross-tenant deadline creation referencing another user's `loanId` -> `PERMISSION_DENIED`
8. Spoofed timestamp (`createdAt` set to past client Date instead of `request.time`) -> `PERMISSION_DENIED`
9. Updating a `Settled` loan account balance -> `PERMISSION_DENIED`
10. Updating a `Paid` payment deadline back to `Pending` -> `PERMISSION_DENIED`
11. Modifying or deleting an existing `/transactions/{txId}` ledger record -> `PERMISSION_DENIED`
12. Blanket `list` query on `/users` or unfiltered `/loans` without `ownerId == auth.uid` -> `PERMISSION_DENIED`
