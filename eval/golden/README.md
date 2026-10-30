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
- Synthetic cases (`000-synthetic-*`) exercise the pipeline and never count
  toward the gate. Only `source: "real"` cases are scored for pass/fail.

Sign-off: after a passing run, `pnpm --filter @foyer/eval blind <runId> 8`
writes a shuffled review packet. Record designer verdicts in `eval/signoff.json`
as `{ "promptHash": "...", "reviewers": [{ "name", "date", "approved" }] }`.
The gate needs two approvals against the current prompt hash.
