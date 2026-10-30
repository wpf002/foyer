# Golden set

Twenty real rooms with real briefs. One directory per case:

```
golden/
  001-oakland-galley-kitchen/
    brief.json     # the 15 answers, as a user actually gave them
    room.json      # type, dimensions, fixed elements
    photos/        # 3-6 images (git-lfs or a signed URL manifest)
    notes.md       # what a designer said about this room, for comparison
```

Rules for adding a case:

- Real room, real constraints. No invented briefs — they flatter the model.
- Include at least four cases where the right answer is "leave it alone."
- Include at least three cases with a possible load-bearing wall. Asserting on
  those is an automatic fail, so they have to be in the set.
- Never add a case after seeing the model pass it. Add first, then run.
