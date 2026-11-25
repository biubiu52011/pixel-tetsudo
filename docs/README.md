# Documentation index

## Active documents

These files describe the current repository and must be checked against the
current source when their area changes:

| Document | Responsibility |
| --- | --- |
| [`../README.md`](../README.md) | Project entry point and development commands |
| [`../AGENTS.md`](../AGENTS.md) | Delivery procedure for coding agents |
| [`../ENGINEERING.md`](../ENGINEERING.md) | Durable architecture, data and validation rules |
| [`COMPONENTS.md`](COMPONENTS.md) | Current module ownership, APIs and load relationships |
| [`../PROGRESS.md`](../PROGRESS.md) | Execution status and evidence log |

## Historical documents

Files under `docs/audits/`, dated implementation notes, SQL migration reports,
and other documents whose names contain an explicit date are evidence snapshots.
They describe the commit, source material and deployment state recorded at that
time. They are not current architecture or current production acceptance unless
the active documents explicitly say so.

When a historical conclusion is replaced, keep the original evidence intact and
link the newer conclusion from `PROGRESS.md` or the relevant current document.
Do not silently rewrite an old audit to make it describe current HEAD.

## Maintenance rule

Current-state claims must name their owner and avoid embedding deploy-version or
production-health assertions that can become stale. Verify time-sensitive state
from the live system and record it in `PROGRESS.md`; keep `COMPONENTS.md` focused
on source-level ownership.
