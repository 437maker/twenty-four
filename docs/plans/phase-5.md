# Phase 5 plan: portfolio proof

1. Measure, then write. Run `npm run test:coverage`, count lines with
   `git ls-files | xargs cat | wc -l`, count tables from `ALL_TABLES`.
2. Rewrite `README.md` around an "Engineering snapshot" table where every
   number has the command that produces it. Remove any claim the code does not
   back (the old README said treats come from completing tasks; they do not).
3. Before documenting the repeat model and conflict detection, add tests for
   them on real SQLite, so the doc describes verified behavior.
4. Write `docs/HOW_IT_WORKS.md`: conflict detection, master/instance repeats,
   streak/shield/box state machine, why Zustand. Code references throughout,
   and each section names its own limits.
5. Write `docs/SHOT_LIST.md`: a 2-minute recording plan.
6. Final check: README numbers match a fresh `npm test -- --coverage` run.
