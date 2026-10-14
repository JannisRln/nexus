# Semantic Search

Search your vault by meaning, not just keywords. Nexus runs embeddings locally on your machine — no external API calls.

---

## How It Works

- **Desktop only** — Embeddings run locally via iframe-sandboxed transformers.js
- **Model**: `Xenova/all-MiniLM-L6-v2` (384 dimensions, ~23MB)
- **Storage**: Vectors in `cache.db` (in the plugin directory) via sqlite-vec
- **First run** downloads the model (requires internet); subsequent runs are fully offline
- **Status bar** shows indexing progress — click to pause/resume

Use `search content` with `semantic: true` to search notes by meaning.

---

## Turning It On and Off

Semantic search is in **Settings &rarr; Nexus &rarr; Defaults &rarr; Semantic search**. Changes apply immediately, with no restart, including a change synced from another device.

- **While it is on**, the section shows how many notes and chats are indexed and the indexing progress, with an estimate and pause/resume. Each indexing pass removes entries for deleted or renamed notes and deleted chats.
- **Turning it off** asks for confirmation. Vault search falls back to keyword matching, and agents stop being offered semantic search. A `search content` call with `semantic: true` returns keyword results with a note that semantic search is off.
- **Delete index** appears while it is off. It removes the stored vectors and shrinks the cache file; your notes and conversations are not touched. Turning semantic search back on rebuilds the index.

---

## Conversation Memory Search

Use `search memory` to search across past conversation turns and tool call traces.

### Two Modes

| Mode | Scope | Use Case |
|------|-------|----------|
| **Discovery** | Workspace-wide | "What have I discussed about authentication?" |
| **Scoped** | Session + N-turn window | "What did I just ask about this file?" |

### How It Works

- Conversations are chunked into Q&A pairs and embedded in real time as you chat
- **Multi-signal reranking**: semantic similarity + recency + session density + note references
- Background backfill indexes existing conversations automatically
- Uses the same local embedding model — no external API calls
