# Phase 0 plan: save the work

1. Check `.git/config` for embedded credentials (found none; remote is a plain https URL).
2. Baseline: `npx tsc --noEmit` and `npm test` (51 passing) before touching anything.
3. Move the EE-AI-Toolkit files out of `app/` into the sibling toolkit folder, after grepping that nothing imports them. Never overwrite a file that already exists there.
4. Extend `.gitignore`: `.env*`, `coverage/`.
5. Commit in dependency order so each commit builds on the last:
   config → data layer → Google sync → store/bootstrap → screens → tests → docs.
6. Push to `origin/main`. No behavior changes in this phase.
