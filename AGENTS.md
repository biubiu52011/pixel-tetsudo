# Pixel Tetsudo: repository-wide instructions for coding agents

These rules apply to all files and all automated coding sessions. Read
`ENGINEERING.md`, `PROGRESS.md`, and `docs/COMPONENTS.md` before making a
change. User instructions and protected GitHub rules take precedence; never
bypass repository security.

## Default delivery: direct commit, not a pull request

- For authorized code edits, use the existing `main` as the integration target:
  inspect the current branch, preserve concurrent changes, test locally, then
  create a normal commit and push to `main` without force. A push to `main` runs
  CI but does not authorize a Pages production release.
- Never create a feature branch, pull request (including draft PR), temporary
  integration branch, or additional CI dispatch by default. Only use a PR when
  the user expressly requests that workflow.
- Do not merge via an unnecessary PR when a normal, authorized fast-forward
  commit/push is permitted.
- If GitHub rejects a normal direct update because of branch protection or
  required checks, stop and report the exact GitHub error. Do not force-push,
  rewrite history, alter protections, create a fallback PR, or repeatedly retry
  unless the user chooses a different procedure.
- If the current workspace has unfinished or unrelated work, preserve it.
  Check `git status`, `git branch --show-current`, and `git log` before editing;
  never reset, delete, or overwrite a colleague's changes to make a push possible.
- Run relevant local tests before committing. Do not weaken contracts or tests
  to obtain a green result. Clearly state incomplete work or failing gates.
- A read-only review request does not authorize commits. Production Pages
  releases, Supabase writes/migrations, Edge deployments, and release
  registration always require separate explicit authorization.

## Background evidence synchronization

Scheduled source/evidence checks must not create auto-generated branches or
suggest pull requests. If a reviewable snapshot differs, retain a CI artifact or
diff for human review. Only a subsequently authorized and verified ordinary
commit/push may update `main`. Never silently turn scheduled observations into
production facts.

For architecture, canonical railway data, ODPT/SQL authority, and regression
requirements, follow `ENGINEERING.md`. These instructions define the delivery
procedure, not a second runtime architecture.
