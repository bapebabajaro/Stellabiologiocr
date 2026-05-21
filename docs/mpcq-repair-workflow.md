# MPCQ repair workflow

This is the required workflow for `questions/intake-candidates.jsonl`.

## Non-negotiable rule

Three at a time is the batch size, not a stopping condition. Work continues
until there are no hard failures and every repaired batch has separate
read-only PASS review.

## Per batch

1. Add or select at most 3 repairs.
2. Run the batch gate:

   ```powershell
   node scripts\mpcq-repair-batch-gate.mjs --offset=<offset> --count=<1-3> --apply
   ```

   This runs:

   ```powershell
   node --check scripts\repair-mpcq-k1-sec01-first3.mjs
   node scripts\repair-mpcq-k1-sec01-first3.mjs --offset=<offset> --count=<1-3>
   node scripts\validate-question-intake-candidates.mjs
   node scripts\audit-mpcq-quality.mjs --write
   ```

   It also creates a review packet under
   `reports/validation/mpcq-batch-reviews/`.

3. Give the generated `.review.md` prompt to a separate read-only reviewer.
4. The reviewer fills the matching `.review.json` with PASS/FAIL per id.
5. Run:

   ```powershell
   node scripts\validate-mpcq-readonly-review.mjs --review=<packet>.review.json
   ```

6. If any id is FAIL, repair that id again in a new max-3 batch.

## Final gate

Before claiming the MPCQ repair work is done:

```powershell
node scripts\validate-mpcq-final-gate.mjs
```

This final gate fails if:

- structural candidate validation fails
- `audit-mpcq-quality.mjs --write` fails
- the audit has any hard failure
- the review ledger is missing
- any active registered batch is still pending or failed
- any failed batch marked `superseded_by_repair` does not point to a later
  `readonly_review_passed` batch
- any review JSON no longer matches the current candidate hash

## What does not count

- A green audit alone does not count.
- A self-check by the repair author does not count.
- A batch with missing review JSON does not count.
- A reviewer FAIL with proposed text does not count until the repair is applied
  and reviewed again.
- A failed review may only be unblocked by a later repair batch that passes
  separate read-only review; it is then marked `superseded_by_repair`.
- A PASS review on older question text does not count; candidate hashes must
  still match.

No KV writes, import apply, safe-active writes, pixel writes or deploys are part
of this workflow.
