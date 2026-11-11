# Minimi: temporal web research agent

## What it does

Minimi is a small Node/Express chat application built around one high-value capability: Groq browser search. It stores every conversation in MongoDB with a server-issued timestamp, retrieves the recent dialogue plus older lexically relevant turns, and gives the model an explicit temporal-reasoning contract. This makes follow-ups such as “is that still correct?” concrete: the agent receives the original recommendation, its time, and instructions to search for changes after it.

The model is responsible for deciding whether to search. The prompt makes search mandatory for volatile information (pricing, releases, current recommendations, and validation of an earlier claim), while avoiding needless latency for stable conversational questions. Responses API preserves web-search citations; the server extracts those annotations and the UI presents clickable source links. The answer itself stays conversational, while the source list makes verification easy.

## Why this architecture

The difficult part of this challenge is not a chat UI; it is continuity under change. A single provider conversation identifier would maintain a short model context but would not provide durable, inspectable, timestamped memory or retrieve an old shortlist when a conversation grows. Instead, MongoDB stores append-only conversation and message records, with indexes on conversation/time and conversation/message text. Retrieval always includes the recent conversation, then adds older turns that share meaningful terms with the question. Every memory item carries an ISO timestamp from the server, preventing invented dates.

The agent passes selected memory in a structured, clearly delimited context rather than silently summarizing away facts. It is explicitly told to identify the comparison date, search for *material changes after it*, and distinguish “changed,” “no material change found,” and “uncertain.” That is the behavior the sample prompts demand.

I chose Groq's hosted browser-search tool because it lets the model access current web sources in the same request and keeps the app genuinely to one external tool. Search is available automatically: the temporal prompt requires it for volatile claims and “has anything changed?” questions, but greetings and stable questions avoid needless search latency.

## Deliberate trade-offs and next week

I rejected a vector database for this submission: lexical retrieval is transparent, deterministic, and adequate for one-user chat histories. For production I would add MongoDB backups/TTL and a vector index, entity/claim extraction at write time, and retrieval by entities plus time range—not only terms. I would also add streaming, cancellation, structured “change ledger” records (claim, source, observed-at, effective-at), source-quality ranking, evaluation fixtures for the three temporal prompts, and authentication/privacy controls. The core interface stays narrow: a web-grounded model plus durable temporal memory.
