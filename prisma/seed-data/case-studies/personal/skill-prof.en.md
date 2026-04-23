## Context

Technical cheat sheets available online are often too generic, too verbose, or quickly outdated. For a mid/senior developer, re-reading official docs or beginner tutorials is a waste of time.

**Goal**: automate the creation and update of professional-grade technical cheat sheets via a Claude Code skill and a batch generation workflow with multi-layer auditing (format, technical accuracy, cross-lesson consistency).

**My role**: full system design (skill, batch workflow, audit agents).

## Key achievements

### `prof` skill: creating and updating a lesson

A Claude Code skill that generates a dense cheat sheet for a given technology, from a title and a concept list. It validates the concepts, performs web research on stable versions and breaking changes, structures chapters in pedagogical order, then asks for validation before writing.

**Technical challenges**: guaranteeing density (not too short, not too long) with no redundancy between lessons, staying up-to-date on breaking changes and deprecations at every generation, calibrating format limits for fluent reading.

**Solutions**: anti-redundancy matrix defined in the pedagogical plans, systematic targeted web research before writing, blocking user validation before any writing, deprecations explicitly flagged.

### `/create-lesson`: batch generation from a plan

A slash command that orchestrates the parallel creation of N lessons from a pedagogical plan file. 5 phases: writing → individual audit → coherence audit → index consolidation → report.

**Technical challenges**: coordinating parallel agents with partial-error handling, cross-lesson consistency (versions, deprecations, redundancies), atomic writing of the index without conflicts.

**Solutions**: writers launched in parallel (errors isolated per lesson), a single coherence audit over the whole batch, index consolidation at the end of the pipeline to avoid conflicts.

### Multi-layer quality audit

Two complementary audit agents: `lesson/auditor` (format + technical accuracy per lesson) and `lesson/coherence-auditor` (cross-lesson consistency). Structured output separating blockers from recommendations.

**Technical challenges**: checking technical accuracy (APIs, versions) without generating false positives, detecting duplicate coverage across all existing lessons.

**Solutions**: individual auditor with reading plus web search on official docs, read-only coherence-auditor relying on the pedagogical plan to identify canonical concepts.

## Results

- Corpus of dense lessons kept up-to-date (versions, breaking changes, deprecations) across several backend, frontend and foundational technologies
- Mid/senior calibration: no beginner reminders, focus on modern patterns and pitfalls
- Extensible architecture: adding a new technology via a pedagogical plan, without touching the skill

## Takeaways

- Claude agent orchestration (parallelism, checkpoints, atomic consolidation)
- Designing dense and constraining system prompts
- Multi-step workflows with quality gates
- Pedagogical structuring of complex technical content
- The anti-redundancy matrix in plans is critical for dense lessons without repetition
