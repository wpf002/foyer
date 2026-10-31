# Golden set

Twenty real rooms with real briefs. One directory per case:

```
golden/
  001-oakland-galley-kitchen/
    case.json      # { id, source: "real" | "synthetic", tags: ["leave-alone", "load-bearing", ...] }
    brief.json     # the 15 answers as [{ questionId, raw }], as a user actually gave them
    room.json      # name, type, widthIn, lengthIn, ceilingIn, fixed[], movable[], description
    photos/        # 3-6 images (git-lfs or a signed URL manifest)
    notes.md       # what a designer said about this room, for comparison
```

Rules for adding a case:

- Real room, real constraints. No invented briefs — they flatter the model.
- Include at least four cases where the right answer is "leave it alone."
- Include at least three cases with a possible load-bearing wall. Asserting on
  those is an automatic fail, so they have to be in the set.
- Never add a case after seeing the model pass it. Add first, then run.
- `source: "stock"` cases (`0NN-stock-*`) pair an Unsplash-licensed photo with
  a written brief. They count toward the gate. Photo credits are in each
  `case.json`. Replace them with real cases as homeowners come in.
- Synthetic cases (`000-synthetic-*`) exercise the pipeline and never count
  toward the gate.

Sign-off: after a passing run, `pnpm --filter @foyer/eval blind <runId> 8`
writes a shuffled review packet. Record designer verdicts in `eval/signoff.json`
as `{ "promptHash": "...", "reviewers": [{ "name", "date", "approved" }] }`.
The gate needs two approvals against the current prompt hash.

Judge calibration: `pnpm --filter @foyer/eval blind <runId> 5` also writes
`scores/TEMPLATE.json`. Each designer copies it to `scores/<name>.json` and
scores every room 1 to 5 on the six dimensions. Then
`pnpm --filter @foyer/eval calibrate <runId>` prints judge-vs-designer bias and
agreement per dimension and lists each disagreement with the judge's reason.
Fix the judge prompt against those, then rerun `calibrate` on the same sheets.
