## Context

When I bought my apartment (October 2024), my Google Drive ended up flooded with paperwork: notarial deed, mortgage, insurance contracts, condo association meetings, renovation invoices. Finding a specific piece of info ("what's the water-damage deductible?", "next condo meeting date?") quickly became painful: open the PDFs, scroll, hope.

**Goal**: a conversational RAG agent over Telegram that queries my indexed documents and automatically updates the collection when I drop new files in Drive. Designed **generic from day one**: 1 Drive folder = 1 RAG collection parameterized by name. Today a single `rag_appart` folder gathering all the apartment's paperwork (mortgage, insurance, condo meetings, contracts, manuals); tomorrow a `rag_societe` or another context if needed, without rework.

**My role**: end-to-end design and development of the multi-workflow n8n architecture (orchestrator + 2 sub-workflows), self-hosted deployment.

## Key achievements

### Telegram orchestrator (multi-modal input + AI routing)

Telegram bot accepting text or audio (LLM transcription), with a router AI Agent that dynamically selects between 2 tools: RAG search or indexing of a new folder. Per-chat conversational memory.

**Technical challenges**: multi-modal input (text + voice), reliable routing to the right sub-workflows depending on the query, stable per-user memory without cross-chat leakage.

**Solutions**: n8n Switch on message type (text vs voice), AI Agent with a strict system prompt defining the 2 tools and their use cases, sub-workflows exposed as n8n `Tool Workflow` (callable as functions by the agent).

### Idempotent Drive RAG ingestion pipeline

Indexing workflow with **3 triggers** (form, webhook, sub-workflow) that scans a Google Drive folder, detects new/modified files, chunks them, generates embeddings and persists into Qdrant. Metadata enriched by an LLM summarizer (theme, topics, painPoints, keywords).

**Technical challenges**: avoiding unnecessary re-embedding on every run (cost), cleanly removing modified files from Qdrant, supporting multiple formats (PDF, DOCX, native Google Docs), dynamically creating Postgres tables and Qdrant collections per folder.

**Solutions**: per-collection Postgres metadata table with reference dates, **Drive vs Postgres comparison → skip if unchanged**, otherwise delete by `metadata.fileId` in Qdrant + reinsert; `mimeType` switch to plug in the PDF or DOCX extractor; 800/100 chunking; tables and collections named after the folder to silo each domain.

### Agentic RAG (validation + hybrid metadata + semantic search)

Sub-workflow answering user questions in 2 stages: first **target collection validation** (a mini-agent checks it exists, otherwise asks for clarification), then **hybrid search** (a main agent first queries Postgres metadata to identify relevant documents, then runs the Qdrant semantic search filtered on the retained fileIds).

**Technical challenges**: avoiding the noise of pure semantic RAG (off-topic chunks matching by embedding alone), guaranteeing **source traceability** in the answer, hardening the JSON output despite LLM hallucinations.

**Solutions**: **pre-filtering by structured metadata** (theme/topics/keywords) before the semantic search, structured output `{message, sources: {documents, themes, keywords}}` with systematic file citations, **auto-fixing parser via the LangChain `OutputFixingParser` pattern** (a secondary LLM, Claude Sonnet, reformats the JSON output when the primary LLM produces an invalid format).

## Results

- **`rag_appart` collection**: ~30 documents indexed (notarial deed, mortgage, insurance contracts, condo association meetings, appliance manuals, renovation invoices)
- **One-shot embedding cost**: ~€5-10 for the initial indexing, queries not expensive (embeddings are the main cost driver)
- **Incremental indexing**: a new document in Drive → a single Telegram command updates the collection without duplicates
- **Traced search**: every answer cites its sources (fileName + fileId), zero fabricated information
- **Real usage**: personal POC used occasionally (a few queries per month), not heavy usage

## Takeaways

- Multi-workflow n8n architecture (orchestrator + sub-workflows reusable as tools of an AI Agent)
- **Hybrid RAG** (structured metadata + semantic search) is more reliable than pure semantic RAG
- Idempotent ingestion pipeline (skip if unchanged, delete + reinsert if modified) to keep embedding costs under control
- Structured output parsers + auto-fixing with a secondary LLM to harden JSON output
- **Constant LLM-models watch**: pick the right model for each use case (router vs summarizer vs complex Q&A), trade off cost vs quality, re-evaluate at each major release
- Generic design from day one: 1 Drive folder = 1 Postgres collection + 1 Qdrant collection, parameterized by name
- **n8n is excellent to validate a RAG POC quickly** (functional multi-agent architecture in a few hours), **but for a robust production at real load** (low latency, fine-grained observability, automated tests), rewriting in a proper API is preferable.

## Planned evolutions

- Reranking downstream of Qdrant to improve chunk relevance
- Exposing the RAG via an MCP Server (Claude Desktop, Cursor, IDE agents)
- Web UI to visualize collections and search outside Telegram
- Postgres audit trail of queries for usage analysis
