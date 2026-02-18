Follow `AGENTS.md` and `SKILLS.md`.

Rules:
- Use the PLAN → IMPLEMENT → VERIFY → REVIEW loop.
- Keep model selection on Auto unless AGENTS.md role routing says to override for that role.
- Never claim "done" unless DoD passes (`./scripts/dod.sh` or `.\scripts\dod.ps1`).
- Keep diffs small and add/update tests when behavior changes.
- Prefer reproducible commands and cite sources for generated documents.
