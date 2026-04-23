## Context

I maintain a professional-leads CRM in a **Notion database** (status, interest level, next step, notes, next-message date). Until now: manual drafting of each follow-up plus manual addition of a TickTick reminder task. Repetitive, time-consuming, risk of forgetting.

**Business goal**: a single action (updating the next-message date in Notion) automatically triggers the drafting of a personalized message and the scheduling of a reminder task.

**My role**: end-to-end design and implementation of the workflow, from requirements analysis to production deployment.

## Key achievements

### End-to-end CRM follow-up automation

Event-driven n8n workflow that listens to Notion DB updates and orchestrates 3 steps:
1. **Smart trigger filtering** (only generates when the follow-up date is in the future, avoiding unnecessary LLM calls)
2. **Message drafting by an AI agent** (Claude) producing a personalized follow-up tailored to the lead context (status, interest, history)
3. **Automatic scheduling** of a TickTick task that reminds the follow-up at the right time

**Challenges**: generating messages that are **genuinely personalized** (tone, context, length of the relationship) without falling into empty sales clichés.

**Solutions**: advanced prompt engineering (strict rules on tone, relative dates, concise style), structured output for reliability.

### Notion → Claude → TickTick pipeline without duplicates

Connecting **Notion ↔ Claude ↔ TickTick** in a single pipeline. Handling edge cases: repeated edits on the same lead (no duplicates), TickTick API without native upsert (match by title → update or create), network errors.

### Self-hosted deployment

Workflow deployed on self-hosted n8n (VPS + Dokploy) and versioned in a dedicated repo for backup and change traceability.
Dedicated **alerting workflow** that notifies on execution failures (crash, timeout, API error).

## Results

- **Time savings**: automatic follow-up in < 10 seconds vs 3-5 minutes manually
- **No more forgotten follow-ups**: the TickTick reminder guarantees that no scheduled follow-up is missed
- **Quality**: contextualized messages consistent with the relationship history

## Takeaways

- Advanced prompt engineering for reliable and contextualized AI outputs
- Multi-tool orchestration in n8n (upsert patterns without a native API, filtering)
- Designing internal tooling that saves time (ROI-first approach)
