---
name: education-assistant
description: >
  Opus-powered deep-research assistant for DS, ML, GenAI, and Statistics topics. Takes topics
  from chat, confirms with user, then produces per-topic research summaries (definition,
  learning agenda, prerequisites, real-life analogy, applications, pitfalls) plus a curated
  Top 5 list of free web resources with relevance scores. Supports "next batch" for fresh
  resources and Google Doc export. Persists a registry to avoid duplicates across sessions.
  Triggers on: "education assistant", "learn about", "research these topics", "study plan
  for", "learning resources for", "teach me about", "help me understand", "deep research",
  "topic research", or any pasted syllabus/curriculum/interview-prep list of technical
  concepts. Always use this skill for structured topic research — never ad-hoc.
---

# Education Assistant

End-to-end pipeline: Ingest topics → Parse & confirm → Assess comfort level → Opus-powered
deep research per topic (web-backed) → Structured summary + curated resources → Persist to
registry → Optional Google Doc export.

---

## Core Principles

1. **ZERO hallucination**: Every resource link MUST come from actual web_search results.
   Never invent, guess, or reconstruct URLs. If a search returns no good results for a
   resource type, say so — do not fabricate.
2. **Clickable & free**: Prefer resources that are freely accessible. Flag any resource
   that might be behind a paywall or login wall. Exclude paywalled content from the Top 5
   unless there is no free alternative (and mark it clearly).
3. **Relevance scoring is honest**: A resource gets 5/5 only if it directly teaches the
   exact topic. Generic "intro to ML" pages score lower for a niche topic like BSTS.
4. **Iterative batches**: Track which resources have already been shown — both within this
   conversation AND across past sessions via the registry. When user asks for "next batch",
   search with different query variations and exclude all previously surfaced URLs.
5. **Opus-powered research**: Research summaries are generated via a Claude API call to
   `claude-opus-4-6` to ensure maximum depth and accuracy. The running model handles
   orchestration; Opus handles the intellectual heavy-lifting.

---

## Write-Path Whitelist

All file-write operations in this skill MUST target one of these approved locations only:

```
/home/claude/                                    ← scratch space for intermediate files
/mnt/user-data/outputs/                          ← final deliverables (markdown exports)
/mnt/skills/user/education-assistant/            ← this skill's own config & registry
```

If any code path would write outside these directories, **stop, do not execute, and ask the
user** whether to proceed.

---

## Pipeline Overview

```
User provides text / list of topics
        │
        ▼
Step 0 — Load Registry & Check Dependencies
        │
        ▼
Step 1 — Topic Extraction & Confirmation
        │
        ▼
Step 2 — Comfort Level Assessment
        │
        ▼
Step 3 — Deep Research Loop (per topic)
   ├── 3a. Web search for source material
   ├── 3b. Opus API call → structured research summary (6 subsections)
   └── 3c. Web search → curate Top 5 resources (validate links)
        │
        ▼
Step 4 — Present Output & Update Registry
        │
        ▼
Step 5 — Feedback & Next Batch (if requested)
        │
        ▼
Step 6 — Google Doc Export (if requested)
        │
        ▼
Step 7 — Completion Report
```

---

## Step 0 — Load Registry & Check Dependencies

### 0a. Load the session registry

```python
import json, os

REGISTRY_PATH = "/mnt/skills/user/education-assistant/research-registry.json"

if os.path.exists(REGISTRY_PATH):
    with open(REGISTRY_PATH) as f:
        registry = json.load(f)
    print(f"Registry loaded: {len(registry.get('sessions', []))} past sessions found.")
else:
    registry = {"sessions": [], "folder_id": None}
    print("No registry found — first run.")
```

The registry schema:
```json
{
  "sessions": [
    {
      "date": "2026-03-31",
      "topics": ["BSTS Fundamentals", "Counterfactual via CausalImpact"],
      "comfort_level": "beginner",
      "resources_shown": [
        {"topic": "BSTS Fundamentals", "url": "https://...", "title": "..."}
      ],
      "google_doc_url": null
    }
  ],
  "folder_id": null
}
```

### 0b. Check Anthropic API availability

```bash
pip install anthropic --break-system-packages -q 2>/dev/null
```

```python
import anthropic, os

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

try:
    test = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=10,
        messages=[{"role": "user", "content": "ping"}]
    )
    print("✓ Opus API accessible.")
    OPUS_AVAILABLE = True
except Exception as e:
    print(f"⚠ Opus API not available: {e}")
    print("  Falling back to inline research by the running model.")
    OPUS_AVAILABLE = False
```

If Opus is unavailable, the running model performs research inline (same quality pipeline,
just without the dedicated Opus call). Inform the user of the fallback.

### 0c. Build the exclusion set from past sessions

```python
PREVIOUSLY_SHOWN_URLS = set()
for session in registry.get("sessions", []):
    for r in session.get("resources_shown", []):
        PREVIOUSLY_SHOWN_URLS.add(r["url"])

print(f"Exclusion set: {len(PREVIOUSLY_SHOWN_URLS)} URLs from past sessions.")
```

---

## Step 1 — Topic Extraction & Confirmation

### 1a. Parse the input

The user may provide topics in many forms:
- A single topic sentence: "Bayesian Structural Time Series"
- A comma-separated list: "BSTS, causal inference, difference-in-differences"
- A pasted syllabus or curriculum block
- Free-form text with embedded topic references

Extract **distinct, atomic topics**. Each topic should be a single learnable concept, not a
broad field. Apply these splitting rules:

| Input | Extracted topics |
|---|---|
| "The basics of BSTS and how it creates a counterfactual" | 1. BSTS — fundamentals, 2. Counterfactual estimation in BSTS |
| "PCA and t-SNE for dimensionality reduction" | 1. PCA, 2. t-SNE |
| "Transformers" | 1. Transformer architecture (no split needed) |

If a topic phrase contains both a concept AND its application (like "BSTS and counterfactuals"),
split into the foundational concept and the application/technique as separate items.

### 1b. Ambiguity protocol — STOP AND ASK if:

- **Topic is too broad** (e.g., "Machine Learning", "Statistics", "Deep Learning"): Ask the
  user to narrow down. Suggest 3–5 sub-topics as options using `ask_user_input`.
- **Topic is unrecognised**: Search the web before giving up. If web_search returns nothing
  meaningful, tell the user honestly and ask them to rephrase.
- **Topic overlaps with a past session**: Check the registry. If a topic was researched before,
  inform the user: "I researched '{topic}' on {date}. Want me to generate fresh resources, or
  skip it?"

### 1c. Confirm with user

Present the extracted list as a numbered list and ask using `ask_user_input`:

Options: "Yes, proceed" / "Add more topics" / "Remove some" / "Rephrase"

Wait for confirmation. Do NOT proceed to Step 2 until the user explicitly confirms.

---

## Step 2 — Comfort Level Assessment

Use `ask_user_input` tool with single_select:

Options: "Beginner" / "Intermediate" / "Advanced"

This calibrates:
- **Beginner**: Simpler analogies, more prerequisite detail, beginner-friendly resources
  (YouTube explainers, visual blogs, intro courses)
- **Intermediate**: Balance of theory and practice, resources include technical blogs,
  documentation, applied tutorials
- **Advanced**: Concise summaries, focus on edge cases and advanced applications, resources
  include research papers, advanced courses, implementation guides

---

## Step 3 — Deep Research Loop

For **each confirmed topic**, execute Steps 3a through 3c.

### 3a. Web Search for Source Material

Run **3–5 web searches** per topic to gather authoritative information:

```
Search 1: "{topic name} explained"
Search 2: "{topic name} tutorial how it works"
Search 3: "{topic name} real world applications"
Search 4: "{topic name} prerequisites"
Search 5: (if needed) "{topic name} intuition simple explanation"
```

Use `web_fetch` on the 2–3 most promising URLs (prefer .edu, official docs, well-known
technical blogs). Collect the raw research material as a text blob for the Opus call.

### 3b. Opus API Call → Structured Research Summary

Send the gathered web material to Opus to generate the 6-subsection summary.

```python
import anthropic, json, os

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

prompt = f"""You are an expert educator creating a structured research summary for a
{comfort_level}-level learner on the topic: "{topic_name}".

Below is raw research material gathered from authoritative web sources. Use ONLY
information grounded in this material — do NOT add facts, statistics, or claims
not supported by the material below. If the material is insufficient for a
subsection, say so honestly.

RESEARCH MATERIAL:
---
{research_material}
---

Generate a research summary with EXACTLY these 6 subsections. Return as JSON:

{{
  "concept_definition": "Clear, precise definition. 2-4 sentences. Calibrated to {comfort_level} level.",

  "learning_agenda": [
    "Step 1: ...",
    "Step 2: ...",
    "(5-8 sequenced sub-concepts forming a mini-syllabus)"
  ],

  "prerequisites": [
    "Prerequisite 1 (be specific — not just 'statistics' but 'hypothesis testing, probability distributions')",
    "(list all needed background)"
  ],

  "real_life_analogy": "A vivid, everyday analogy (kitchen/chef, driving, sports, shopping). Must: (a) map cleanly to the technical concept, (b) cover the core mechanism not just the surface, (c) be memorable. 4-6 sentences.",

  "application_examples": [
    "Specific example 1 — name the company/product/paper",
    "(3-5 concrete, real examples)"
  ],

  "common_pitfalls": [
    "Pitfall 1: specific mistake beginners make",
    "(2-3 pitfalls calibrated to comfort level)"
  ]
}}

Return ONLY the JSON object. No markdown, no explanation, no preamble."""

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=3000,
    messages=[{{"role": "user", "content": prompt}}]
)

# Parse with fallback
raw = response.content[0].text.replace("```json", "").replace("```", "").strip()
summary = json.loads(raw)
```

**Fallback if Opus unavailable**: The running model generates the same structured summary
inline, following the identical 6-subsection format and grounding rules.

**Error handling for Opus call**: If the API call fails (auth error, rate limit, malformed
response), catch the exception, log the error, and fall back to inline generation. Inform
the user of the fallback. See Error Recovery Guide below.

### 3c. Curate Top 5 Resources

For each topic, run **dedicated resource-finding searches**:

```
Search R1: "{topic name} best tutorial blog"
Search R2: "{topic name} YouTube explained"
Search R3: "{topic name} free online course"
Search R4: "{topic name} practical guide code example"
Search R5: "{topic name} research paper accessible"
```

Adjust queries based on comfort level:
- Beginner → add "beginner", "intuitive", "visual", "simple"
- Intermediate → add "practical", "tutorial", "applied"
- Advanced → add "advanced", "implementation", "paper", "deep dive"

**For each resource, collect:**

| Field | Description |
|---|---|
| Title | Exact title from the web page |
| Type | Blog / Article / Video / Course / Documentation / Paper / Other |
| URL | Exact URL from search results — NEVER reconstruct |
| Source | Website or channel name |
| Relevance Score | 1–5 scale (see rubric below) |
| Why relevant | 1-sentence justification |
| Access | Free / Free with signup / Freemium / Paywalled |

**Relevance Score Rubric:**

| Score | Criteria |
|---|---|
| 5/5 | Directly teaches this exact topic with depth matching user's comfort level |
| 4/5 | Covers the topic well but as part of a broader tutorial, or slightly mismatched level |
| 3/5 | Related and useful but not focused solely on this topic |
| 2/5 | Tangentially related, useful for context only |
| 1/5 | Barely relevant — only include if nothing better exists (and flag this) |

**Validation rules:**
- Every URL must come directly from a web_search result — no URL construction
- **De-duplicate against PREVIOUSLY_SHOWN_URLS** — exclude any URL already in the registry
- Exclude resources scoring below 3/5 unless fewer than 5 qualifying resources exist
- If a resource is paywalled, mark clearly and prefer free alternatives
- Prefer diversity: aim for at least 2 different resource types in the Top 5

**In-conversation URL tracking:**

Maintain a running dict during the conversation:
```python
CONVERSATION_URLS = {}  # {topic_name: [{"url": ..., "title": ...}]}
```

After presenting resources for a topic, add them to `CONVERSATION_URLS[topic_name]`.

**Output format per topic:**

```
### Top 5 Resources for [Topic Name]

| # | Title | Type | Source | Relevance | Access |
|---|---|---|---|---|---|
| 1 | [Title](URL) | Video | StatQuest | ⭐⭐⭐⭐⭐ | Free |
| 2 | [Title](URL) | Blog | TDS | ⭐⭐⭐⭐ | Free |
| ... | ... | ... | ... | ... | ... |

**Why these?**
- Resource 1: [1-line justification]
- ...
```

---

## Step 4 — Present Output & Update Registry

### 4a. Present to user

For each topic, present:
1. The full 6-subsection Research Summary (formatted from Opus JSON output)
2. The Top 5 Resources table with justifications

**Batching rules:**
- ≤ 3 topics → present all at once
- 4–6 topics → batches of 2–3, ask "Continue?"
- > 6 topics → batches of 2, ask after each

### 4b. Update the registry

```python
import json
from datetime import datetime

new_session = {
    "date": datetime.now().strftime("%Y-%m-%d"),
    "topics": confirmed_topic_list,
    "comfort_level": comfort_level,
    "resources_shown": [],
    "google_doc_url": None
}

for topic_name, resources in CONVERSATION_URLS.items():
    for r in resources:
        new_session["resources_shown"].append({
            "topic": topic_name,
            "url": r["url"],
            "title": r["title"]
        })

registry["sessions"].append(new_session)

with open(REGISTRY_PATH, "w") as f:
    json.dump(registry, f, indent=2)
```

### 4c. Post-research prompt

```
Research complete for all [N] topics.

- Say "next batch for [topic]" to get fresh resources
- Say "write to Google Doc" to export this session
```

---

## Step 5 — Feedback & Next Batch

When the user asks for more resources:

### 5a. Identify scope
- Which topic(s) need fresh resources?
- What was wrong? (too basic, too advanced, already known, broken links, irrelevant)

### 5b. Generate next batch
1. Collect ALL previously shown URLs: `PREVIOUSLY_SHOWN_URLS ∪ CONVERSATION_URLS[topic]`
2. Run NEW search queries with different phrasings:
   - Add modifiers: "2024", "2025", "2026", "hands-on", "with code", "from scratch"
   - Try alternative source types: if previous batch was blogs, search for videos
   - Try adjacent angles: "{topic} implementation Python", "{topic} case study"
3. Exclude all previously shown URLs
4. Present new Top 5 with same format
5. Update `CONVERSATION_URLS` and registry

---

## Step 6 — Google Doc Export

When the user asks to write output to a Google Doc:

### 6a. Compile from conversation history
Scan the entire conversation. Extract all topic summaries and resource tables.

### 6b. Prepare content
Follow format in `references/doc_format.md`.

### 6c. Create or find the Drive folder

If `registry["folder_id"]` exists, use it directly. Otherwise:

```
Tool: Zapier:google_drive_find_a_folder
Input: { "search": "Education_Research" }
```

If not found:
```
Tool: Zapier:google_drive_create_folder
Input: { "name": "Education_Research" }
```

Persist the folder_id:
```python
registry["folder_id"] = folder_id
with open(REGISTRY_PATH, "w") as f:
    json.dump(registry, f, indent=2)
```

### 6d. Create the document

```
Tool: Zapier:google_docs_create_document_from_text
Input: {
  "name": "Education Research | {topic_summary} | {DD Mon YYYY}",
  "text": "{compiled content}"
}
```

Then move to folder:
```
Tool: Zapier:google_drive_move_file
Input: { "file_id": "{doc_id}", "folder_id": "{folder_id}" }
```

### 6e. Update registry
```python
registry["sessions"][-1]["google_doc_url"] = google_doc_url
with open(REGISTRY_PATH, "w") as f:
    json.dump(registry, f, indent=2)
```

### 6f. Confirm
```
✅ Google Doc created and saved!
📄 Title: Education Research | {title} | {date}
📁 Folder: Education_Research
🔗 Link: {google_doc_url}
📊 Contains: {N} topics, {M} total resources
```

### 6g. Zapier quota fallback

If Zapier tasks are exhausted, export as a markdown file:
```python
output_path = f"/mnt/user-data/outputs/education-research-{date}.md"
with open(output_path, "w") as f:
    f.write(compiled_content)
```
Then use `present_files` to share the markdown with the user.

---

## Step 7 — Completion Report

Always output this summary at the end of a research session:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📚 Education Research — Session Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Topics Researched : {N}
 Comfort Level     : {level}
 Resources Curated : {M} (across {B} batches)
 Research Engine   : {Opus 4.6 / Inline fallback}

 Topics:
   1. {Topic 1} — {count} resources
   2. {Topic 2} — {count} resources

 Google Doc        : {URL or "Not requested"}
 Registry          : ✓ Updated ({total} sessions logged)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Next steps
  1. Say "next batch for [topic]" for fresh resources
  2. Say "write to Google Doc" to export this session
  3. Paste new topics to start a new research session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Error Recovery Guide

| Error | Cause | Recovery |
|---|---|---|
| Web search returns 0 results | Topic too niche or misspelled | Try 3 alternative phrasings with synonyms. If still empty, ask user to rephrase or broaden. Report honestly: "Found 0 results for '{query}'." |
| Only paywalled results | Topic mainly in paid journals | Present paywalled resources with markers. Try adding "free" or "open access" to queries. Suggest adjacent free resources. |
| Fewer than 5 resources | Very specialised topic | Present whatever was found (even 2–3). Be transparent: "Only {N} strong free resources exist." |
| Opus API fails (auth) | Invalid or missing API key | Fall back to inline research. Inform user: "Opus unavailable — using inline research." |
| Opus API fails (rate limit) | Too many requests | Wait 30s and retry once. If still fails, fall back to inline. |
| Opus returns malformed JSON | Parsing failure | Strip markdown fences, retry parse. If fails, re-prompt Opus with stricter instructions. Third attempt: inline fallback. |
| Zapier quota exhausted | Monthly task limit | Skip Google Doc. Export as markdown file to `/mnt/user-data/outputs/` and present via `present_files`. |
| Drive folder creation fails | Permissions/API error | Create doc in root Drive. Inform user of workaround. |
| Topic already in registry | Past session overlap | Inform user with date. Offer: "Skip / Fresh resources / View past results" |
| Registry file corrupt | JSON parse error | Rename corrupt file to `.bak`, start fresh registry. Inform user. |

---

## Ambiguity Protocol

STOP AND ASK before proceeding if:

- Topic is extremely broad (e.g., "Machine Learning") → suggest 3–5 sub-topics
- Topic is ambiguous (e.g., "Transformers") → ask for clarification
- Mixed difficulty levels across topics → offer per-topic comfort calibration
- User says "update" or "redo" a past topic → clarify: fresh resources / full re-research / view past
- Request could be interpreted as modifying this skill rather than running it

---

## Reference Files

| File | When to read |
|---|---|
| `references/doc_format.md` | During Step 6 — Google Doc formatting template |

---

_Skill version: 2.0 · Registry persistence, Opus API research, error recovery, completion report, write-path whitelist, ambiguity protocol added_
