# MPCQ batch review gate

This folder is the fail-closed handoff point for biology MPCQ repair batches.

Machine audit is not enough. A batch is not complete until:

1. The batch contains at most 3 question ids.
2. `scripts/mpcq-repair-batch-gate.mjs` has registered the batch and created a
   read-only review packet.
3. A separate read-only reviewer has filled the packet with PASS/FAIL per id.
4. `scripts/validate-mpcq-readonly-review.mjs --review=<packet>.review.json`
   passes and updates `review-ledger.json`.
5. `scripts/validate-mpcq-final-gate.mjs` passes before anyone claims the whole
   MPCQ repair set is done.

The review packet stores a hash of each candidate. If the candidate changes
after packet creation, the review is invalid and the packet must be regenerated.

Required reviewer prompt shape:

```text
Read-only review. In repo <repo>, review exactly these questions in
questions/intake-candidates.jsonl: <max 3 ids>. Do not edit files. Apply
singaporempc / pure-text MPCQ standards: stem <=50 words and <=320 chars,
neutral answer labels, no one-fact solvability, no answer-shape or longest-row
shortcut, construction_note_en English-only, at least 4 QKL/KLM entries,
runtimeProjection typ Kemi-compatible, no runtime/import/KV/pixel writes.
Return PASS/FAIL per id and exact repair text only for failed stems/notes.
```

Commands:

```powershell
node scripts\mpcq-repair-batch-gate.mjs --offset=<offset> --count=<1-3> --apply
node scripts\validate-mpcq-readonly-review.mjs --review=<packet>.review.json
node scripts\validate-mpcq-final-gate.mjs
```

For batches already applied before this gate existed, create packets without
re-applying:

```powershell
node scripts\mpcq-repair-batch-gate.mjs --ids=<id1,id2,id3>
```

Hard rule: do not mark a batch as complete from `audit-mpcq-quality.mjs` alone.
The final gate intentionally fails while the ledger contains pending reviews.
