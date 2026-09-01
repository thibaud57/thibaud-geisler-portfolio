## Context

**Ongoing freelance engagement** through **Theodo Extend**, within the R&D team of a large account. The team explores generative AI use cases for the business, with two goals: saving time on internal processes and **making LLM chains reliable** by controlling hallucinations.

Started in June 2026, on a conversational module embedded in a micro-frontend and micro-services ecosystem deployed on Google Cloud.

**My role**: owner of the conversational scope, from agent logic to the interface, paired with another developer.

## Key achievements

### Multi-agent systems on Vertex AI and Google ADK

Design and industrialisation of agents able to reason over business documents, call tools and produce usable deliverables. Agent teams are **composed by the end user** from the interface, rather than hard-coded.

**Error handling**: surfacing the actual error instead of letting the agent improvise a fallback or invent an answer, with a clear split between business and technical failures.

**Technical challenges**: reproducibility of results across sessions, state persistence at every conversation turn, trade-off between strict determinism and conversational flexibility depending on the use case.

### Sandboxed code execution

Code and Skills produced by the agents run in a **sandbox hosted on Kubernetes (GKE)**, without exposing the infrastructure.

### Hardening the technical foundation

Migrated data models and exchange schemas to **Pydantic** across two applications, introducing test coverage, linting and a continuous integration pipeline. Consolidated the application architecture, the agent system and the streaming chain.

**Technical challenges**: data migrations to replay across three environments on every model change, progressive refactoring without interrupting ongoing development, containing the regression risk across every module.

### Conversational module

Multiple-choice or free-text answers, a todo list whose items progress independently, a stop button to halt an ongoing generation. Response streaming between the AI service, the BFF and the Angular front end, and continuous version upgrades of both models and the agent framework.

**Technical challenges**: keeping up with a fast-moving agent framework, and constantly deciding what to use as provided, what to extend and what to reimplement.

### Development tooling

Built personal tooling to speed up delivery: environment startup scripts, ticket creation automated through an API, simplified database access, and architecture documentation acting as a code map for AI assistance.

## Takeaways

- Designing and industrialising agents on **Vertex AI** and **Google ADK**, from prototype to production
- Running agent-generated code in a sandboxed Kubernetes environment
- Controlling and measuring hallucinations across business LLM chains
- Angular micro-frontends with a NestJS shell in a micro-services ecosystem
- Introducing quality practices (typing, tests, linting, CI) into a codebase born from prototyping
- Building delivery tooling within enterprise constraints: access, security, team conventions and handover to other developers
