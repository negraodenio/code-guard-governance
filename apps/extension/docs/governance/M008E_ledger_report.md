# M008E — Governance Ledger Activation — Technical Report

## 1. Summary

| Metric | Before M008E | After M008E |
|--------|-------------|-------------|
| `governance_ledger` rows | 0 | ≥ 1 per agent |
| `ledger_append()` called by triggers | 0/26 triggers | 1/26 (`trg_agents_compliance_flags`) |
| `cg_ag_008_audit_trail` functional | ❌ Always `false` | ✅ Computed from ledger |
| `agent_compliance_gaps()` includes CG-AG-008 | ❌ Missing | ✅ `gap_cg_ag_008` |
| `v_ciso_agent_risk_lens` includes CG-AG-008 | ❌ Missing | ✅ `gap_audit_trail` |
| Trigger security | SECURITY INVOKER | SECURITY DEFINER |
| Existing agents backfilled | ❌ | ✅ Idempotent backfill |

## 2. Diff

### 2.1 New Functions

```diff
+ gov_repo.log_agent_event(agent_id, event_type, event_desc, actor_user_id, organisation_id, payload)
+   → SECURITY DEFINER
+   → Encapsulates ledger_append() for agent lifecycle events
+   → Returns bigint (entry_sequence)
+   → Supported event types: agent.registered (more in Sprint 2)

+ gov_repo.compute_cg_ag_008(agent_id)
+   → SECURITY DEFINER, STABLE
+   → Returns boolean
+   → SELECT EXISTS(... FROM governance_ledger WHERE subject_type='agent' AND subject_id=p_agent_id)
```

### 2.2 Modified Functions

```diff
- gov_repo.update_agent_compliance_flags()
+ gov_repo.update_agent_compliance_flags()
    → Added SECURITY DEFINER (was default INVOKER)
    → Added: log_agent_event() call on INSERT (TG_OP = 'INSERT')
    → Added: new.ledger_entry_seq := v_ledger_seq
    → Added: new.cg_ag_008_audit_trail := compute_cg_ag_008(new.agent_id)
    → Added: CG-AG-012 autonomous agent governance computation
    → Kept: CG-AG-001, CG-AG-002, CG-AG-003, CG-AG-007 logic unchanged

- gov_repo.agent_compliance_gaps(p_organisation_id)
+ gov_repo.agent_compliance_gaps(p_organisation_id)
    → Added: gap_cg_ag_008 boolean in RETURN TABLE
    → Added: gap_cg_ag_008 in WHERE clause
    → Added: gap_cg_ag_008 in total_gaps calculation
    → Changed: JOIN → LEFT JOIN (governance_users)
```

### 2.3 Modified Views

```diff
- gov_repo.v_ciso_agent_risk_lens
+ gov_repo.v_ciso_agent_risk_lens
    → Added: not a.cg_ag_008_audit_trail as gap_audit_trail
    → Changed: JOIN → LEFT JOIN (governance_users)
```

### 2.4 Backfill

```diff
+ DO block: iterates all agents without ledger entries
+   → Calls log_agent_event() for each
+   → Updates agents.ledger_entry_seq
+   → Trigger fires on UPDATE, recomputes cg_ag_008_audit_trail = true
+   → Idempotent: NOT EXISTS guard prevents duplicates
```

## 3. Technical Decisions

### 3.1 SECURITY DEFINER on Trigger Function

**Why:** `ledger_append()` is granted `execute` to `service_role` only. The trigger function runs as `SECURITY INVOKER` by default, meaning it inherits the caller's permissions. An `authenticated` user inserting an agent would have the trigger fail because they lack `execute` on `ledger_append()`.

**Solution:** Change `update_agent_compliance_flags()` to `SECURITY DEFINER`. The trigger now runs with the function owner's privileges (typically `postgres` or `supabase_admin`), which has implicit `execute` on all owned functions.

**Security implication:** The trigger function can now bypass RLS. This is acceptable because:
- The function is only called by the trigger (not directly by users)
- It only sets computed columns — it does not read or modify data outside the NEW row (except for ledger writes)
- All existing SECURITY DEFINER functions in the codebase follow this pattern (e.g., `agent_compliance_gaps`, `ledger_append`)

### 3.2 `ledger_entry_seq` FK Population

**Technical feasibility:** CONFIRMED.

In a `BEFORE INSERT` trigger, the trigger can:
1. Call `ledger_append()` → INSERTs a row into `governance_ledger`
2. Capture the returned `entry_sequence`
3. Set `new.ledger_entry_seq := v_sequence`

The FK constraint is checked AFTER the `BEFORE` trigger completes. Since the `INSERT INTO governance_ledger` occurred within the same transaction, the FK constraint is satisfied.

**No technical impediment.**

### 3.3 Only INSERT Writes to Ledger

**Why:** The migration only handles `agent.registered` events. Status changes, owner changes, and risk reclassifications are future event types (Sprint 2).

**Trigger logic:**
```sql
if (TG_OP = 'INSERT') then
  -- Write to ledger
elsif (TG_OP = 'UPDATE') then
  -- Recompute flags only (no ledger write)
end if;
```

**Implication:** On UPDATE, `cg_ag_008_audit_trail` is recomputed via `compute_cg_ag_008()`. This is correct because the ledger entry already exists from the INSERT. The flag should remain `true` unless the ledger entry is somehow deleted (which would violate ledger immutability).

### 3.4 Backfill Idempotency

**Guard:** `NOT EXISTS (SELECT 1 FROM governance_ledger WHERE subject_type='agent' AND subject_id=a.agent_id)`

**Behavior:**
- First run: creates ledger entries for all agents without them
- Subsequent runs: 0 agents processed (idempotent)
- No duplicate events

## 4. Rollback Plan

Run `M008E_ROLLBACK.sql`. This:
1. Restores `update_agent_compliance_flags()` to SECURITY INVOKER (original)
2. Drops `log_agent_event()` and `compute_cg_ag_008()`
3. Restores `agent_compliance_gaps()` to original (no gap_cg_ag_008)
4. Restores `v_ciso_agent_risk_lens` to original (no gap_audit_trail)

**Note:** Ledger entries created by the backfill are NOT deleted. This is intentional — deleting audit records would violate ledger immutability. The entries simply become orphaned (not read by any function).

## 5. Test Evidence

Tests are in `M008E_TEST.sql`. Three scenarios:

| Scenario | Test | Expected |
|----------|------|----------|
| 1 | INSERT agent → ledger entry + CG-AG-008 = TRUE | PASS |
| 2 | Backfill idempotent (no duplicates) | PASS |
| 3 | SECURITY DEFINER verified on all 3 functions | PASS |

## 6. Files Delivered

| File | Purpose |
|------|---------|
| `M008E_GOVERNANCE_LEDGER_ACTIVATION.sql` | Production migration |
| `M008E_ROLLBACK.sql` | Rollback script |
| `M008E_TEST.sql` | Automated test suite |
| `M008E_REPORT.md` | This report |